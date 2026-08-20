/**
 * Direct Message Routes — /api/dm
 * Conversation list, message thread, send DM.
 * Uses PostgreSQL pool from db.js.
 */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { awardXP } = require('../utils/gamification');
const { isMuted } = require('../utils/moderation');
const { sendPushNotification } = require('../services/firebaseAdmin');
const { publicUrlForKey } = require('../utils/objectStorage');

const router = express.Router();

/**
 * attachmentPayload
 * @description Builds the { attachment: {...} } block for a DM row, or
 * null if the message has no attachment.
 */
function attachmentPayload(row) {
    if (!row.attachment_key) return null;
    return {
        key: row.attachment_key, // exposed so the client can Forward without re-uploading — no more sensitive than the url, which already reveals it
        url: publicUrlForKey(row.attachment_key),
        type: row.attachment_type,
        size: row.attachment_size,
        duration_ms: row.attachment_duration_ms,
    };
}

// ── Spam prevention — in-memory, resets on server restart ──────────────────

// Pattern 2: DM flood — same sender → same recipient, burst
// Key: `dm_flood:${senderId}:${recipientId}` — 10 messages / 10 sec
const dmFloodMap = new Map();

// Pattern 1: DM mass spam — same sender → many different recipients
// Key: `dm_unique_recipients:${senderId}` — 50 unique recipients / 1 hour
const dmUniqueRecipientsMap = new Map();
// Pair tracker: key `dm_pair:${senderId}:${recipientId}` — whether pair is new in window
const dmPairMap = new Map();

/**
 * checkDmFlood
 * Returns { blocked, msBeforeNext } for Pattern 2 (burst flood).
 * Limit: 10 messages per 10 seconds per sender-recipient pair.
 */
function checkDmFlood(senderId, recipientId) {
    const key = `dm_flood:${senderId}:${recipientId}`;
    const now = Date.now();
    const window = 10 * 1000; // 10 seconds
    const limit = 10;
    let entry = dmFloodMap.get(key);
    if (!entry || now > entry.resetTime) {
        entry = { count: 0, resetTime: now + window };
        dmFloodMap.set(key, entry);
    }
    entry.count++;
    if (entry.count > limit) {
        return { blocked: true, msBeforeNext: entry.resetTime - now };
    }
    return { blocked: false };
}

/**
 * checkDmUniqueRecipients
 * Returns { blocked, msBeforeNext } for Pattern 1 (mass spam).
 * Limit: 50 unique recipients per hour per sender.
 * A recipient is "new" if this sender has not messaged them in the current 1-hour window.
 */
function checkDmUniqueRecipients(senderId, recipientId) {
    const now = Date.now();
    const window = 3600 * 1000; // 1 hour
    const limit = 50;

    // Check if this sender-recipient pair is new in the current window
    const pairKey = `dm_pair:${senderId}:${recipientId}`;
    const pairEntry = dmPairMap.get(pairKey);
    const isNewPair = !pairEntry || now > pairEntry.resetTime;

    if (!isNewPair) {
        // Already messaged this person this hour — don't charge the unique-recipients counter
        return { blocked: false };
    }

    // New pair — check and increment unique recipients counter
    const senderKey = `dm_unique_recipients:${senderId}`;
    let senderEntry = dmUniqueRecipientsMap.get(senderKey);
    if (!senderEntry || now > senderEntry.resetTime) {
        senderEntry = { count: 0, resetTime: now + window };
        dmUniqueRecipientsMap.set(senderKey, senderEntry);
    }

    if (senderEntry.count >= limit) {
        return { blocked: true, msBeforeNext: senderEntry.resetTime - now };
    }

    // Record pair as seen and increment unique count
    senderEntry.count++;
    dmPairMap.set(pairKey, { resetTime: now + window });
    return { blocked: false };
}

// ── GET /api/dm/conversations ────────────────────────────
router.get('/conversations', authRequired, async (req, res) => {
    try {
        // Get distinct conversation partners with last message
        const result = await pool.query(`
            SELECT DISTINCT ON (partner_id)
                partner_id,
                partner_name,
                partner_avatar,
                last_message,
                last_time,
                unread_count
            FROM (
                SELECT
                    CASE WHEN dm.sender_id = $1 THEN dm.receiver_id ELSE dm.sender_id END AS partner_id,
                    CASE WHEN dm.sender_id = $1 THEN r.username ELSE s.username END AS partner_name,
                    CASE WHEN dm.sender_id = $1 THEN r.avatar ELSE s.avatar END AS partner_avatar,
                    dm.message AS last_message,
                    dm.created_at AS last_time,
                    CASE WHEN dm.receiver_id = $1 AND dm.read = false THEN 1 ELSE 0 END AS unread_count
                FROM direct_messages dm
                JOIN users s ON s.id = dm.sender_id
                JOIN users r ON r.id = dm.receiver_id
                WHERE dm.sender_id = $1 OR dm.receiver_id = $1
                ORDER BY
                    CASE WHEN dm.sender_id = $1 THEN dm.receiver_id ELSE dm.sender_id END,
                    dm.created_at DESC
            ) sub
            ORDER BY partner_id, last_time DESC
        `, [req.user.id]);

        // Count unread per partner
        const unreadResult = await pool.query(`
            SELECT sender_id AS partner_id, COUNT(*) AS unread
            FROM direct_messages
            WHERE receiver_id = $1 AND read = false
            GROUP BY sender_id
        `, [req.user.id]);

        const unreadMap = {};
        for (const row of unreadResult.rows) {
            unreadMap[row.partner_id] = parseInt(row.unread);
        }

        const conversations = result.rows.map(row => ({
            partner_id: row.partner_id,
            partner_name: row.partner_name,
            partner_avatar: row.partner_avatar || '',
            last_message: row.last_message,
            last_time: row.last_time,
            unread: unreadMap[row.partner_id] || 0
        }));

        // Sort by last_time desc
        conversations.sort((a, b) => new Date(b.last_time) - new Date(a.last_time));

        res.json({ success: true, conversations });
    } catch (err) {
        console.error('DM conversations GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/dm/messages/:partnerId ──────────────────────
router.get('/messages/:partnerId', authRequired, async (req, res) => {
    const partnerId = parseInt(req.params.partnerId);
    if (isNaN(partnerId)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        // Mark messages as read
        await pool.query(
            'UPDATE direct_messages SET read = true WHERE sender_id = $1 AND receiver_id = $2 AND read = false',
            [partnerId, req.user.id]
        );

        const result = await pool.query(`
            SELECT dm.id, dm.sender_id, dm.receiver_id, dm.message, dm.created_at,
                   dm.reply_to, dm.edited_at,
                   dm.attachment_key, dm.attachment_type, dm.attachment_size, dm.attachment_duration_ms,
                   u.username AS sender_name
            FROM direct_messages dm
            JOIN users u ON u.id = dm.sender_id
            WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
               OR (dm.sender_id = $2 AND dm.receiver_id = $1)
            ORDER BY dm.created_at ASC
            LIMIT 200
        `, [req.user.id, partnerId]);

        // Reactions for this conversation's messages, aggregated per (message_id, emoji) —
        // same shape ChatViewModel.kt's ReactionChip expects (count + whether I reacted).
        const ids = result.rows.map(r => r.id);
        const reactionsByMessage = {};
        if (ids.length > 0) {
            const reactionsResult = await pool.query(
                `SELECT message_id, emoji, user_id FROM message_reactions WHERE scope = 'dm' AND message_id = ANY($1)`,
                [ids]
            );
            for (const r of reactionsResult.rows) {
                const list = (reactionsByMessage[r.message_id] ||= {});
                const chip = (list[r.emoji] ||= { emoji: r.emoji, count: 0, mine: false });
                chip.count++;
                if (r.user_id === req.user.id) chip.mine = true;
            }
        }

        const messages = result.rows.map(row => ({
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            message: row.message,
            created_at: row.created_at,
            reply_to: row.reply_to ? parseInt(row.reply_to) : null, // BIGINT comes back as a string from pg — coerce so it matches `id` (a plain number) for client-side Map lookups
            edited_at: row.edited_at,
            sender_name: row.sender_name,
            attachment: attachmentPayload(row),
            reactions: Object.values(reactionsByMessage[row.id] || {}),
        }));

        res.json({ success: true, messages });
    } catch (err) {
        console.error('DM messages GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/dm/send ────────────────────────────────────
router.post('/send', authRequired, async (req, res) => {
    if (isMuted(req.user)) {
        return res.status(403).json({ success: false, error: `You are restricted from posting until ${new Date(req.user.muted_until).toISOString()}.` });
    }
    // Accept both receiverId (frontend) and receiver_id (alternative)
    const rawId = req.body.receiverId || req.body.receiver_id;
    const { message, listingId, attachment_key, attachment_type, attachment_size, attachment_duration_ms, reply_to } = req.body;

    const hasAttachment = typeof attachment_key === 'string' && attachment_key.length > 0;
    if (hasAttachment && attachment_type !== 'image' && attachment_type !== 'voice' && attachment_type !== 'sticker') {
        return res.status(400).json({ success: false, error: 'Invalid attachment_type.' });
    }
    // attachment_key must either be one we actually issued via /api/uploads/presign for this
    // user, OR (Forward — mirrors ChatViewModel.kt's forwardMessage(), which reuses the same
    // storage key without re-uploading) a key already attached to a real message the caller was
    // sender or receiver of — checked further down, once we're inside the try/pool block.
    const attachmentFolder = attachment_type === 'image' ? 'images' : attachment_type === 'sticker' ? 'stickers' : 'voice';
    const attachmentOwnPrefix = hasAttachment && attachment_key.startsWith(`chat/${attachmentFolder}/${req.user.id}/`);

    if (!rawId || (!hasAttachment && (!message || String(message).trim().length === 0))) {
        return res.status(400).json({ success: false, error: 'Recipient and message or attachment are required.' });
    }

    const receiverId = parseInt(rawId);
    if (isNaN(receiverId) || receiverId === req.user.id) {
        return res.status(400).json({ success: false, error: 'Invalid recipient.' });
    }

    const safeMessage = message ? String(message).trim().slice(0, 2000) : null;
    const safeListing = listingId ? parseInt(listingId) || null : null;

    // ── Pattern 2: flood check (burst) — runs first, cheaper ──────────────
    try {
        const floodResult = checkDmFlood(req.user.id, receiverId);
        if (floodResult.blocked) {
            res.set('Retry-After', Math.ceil(floodResult.msBeforeNext / 1000));
            return res.status(429).json({ success: false, error: 'Trimiți prea repede. Așteaptă puțin.' });
        }
    } catch (limiterErr) {
        console.error('DM flood limiter error:', limiterErr.message);
        // Never block request on limiter failure
    }

    // ── Pattern 1: unique recipients check (mass spam) ─────────────────────
    try {
        const uniqueResult = checkDmUniqueRecipients(req.user.id, receiverId);
        if (uniqueResult.blocked) {
            res.set('Retry-After', Math.ceil(uniqueResult.msBeforeNext / 1000));
            return res.status(429).json({ success: false, error: 'Ai atins limita de conversații noi. Încearcă mâine.' });
        }
    } catch (limiterErr) {
        console.error('DM unique recipients limiter error:', limiterErr.message);
        // Never block request on limiter failure
    }

    try {
        // Verify receiver exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (hasAttachment && !attachmentOwnPrefix) {
            const existing = await pool.query(
                `SELECT 1 FROM direct_messages WHERE attachment_key = $1 AND (sender_id = $2 OR receiver_id = $2)
                 UNION SELECT 1 FROM messages WHERE attachment_key = $1
                 LIMIT 1`,
                [attachment_key, req.user.id]
            );
            if (existing.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Invalid attachment.' });
            }
        }

        // reply_to must point at a real message in THIS conversation (either party), so a
        // client can't quote an arbitrary message id from an unrelated conversation.
        let safeReplyTo = null;
        if (reply_to) {
            const replyToId = parseInt(reply_to);
            if (!isNaN(replyToId)) {
                const replyCheck = await pool.query(
                    `SELECT id FROM direct_messages WHERE id = $1
                     AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))`,
                    [replyToId, req.user.id, receiverId]
                );
                if (replyCheck.rows.length > 0) safeReplyTo = replyToId;
            }
        }

        const result = await pool.query(`
            INSERT INTO direct_messages (sender_id, receiver_id, message, listing_id, attachment_key, attachment_type, attachment_size, attachment_duration_ms, reply_to)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, sender_id, receiver_id, message, listing_id, created_at, reply_to
        `, [
            req.user.id,
            receiverId,
            safeMessage,
            safeListing,
            hasAttachment ? attachment_key : null,
            hasAttachment ? attachment_type : null,
            hasAttachment ? (parseInt(attachment_size) || null) : null,
            hasAttachment ? (parseInt(attachment_duration_ms) || null) : null,
            safeReplyTo,
        ]);

        const dm = result.rows[0];
        dm.reply_to = dm.reply_to ? parseInt(dm.reply_to) : null; // same BIGINT-as-string coercion as GET /messages
        dm.sender_name = req.user.username;
        dm.attachment = hasAttachment ? {
            key: attachment_key,
            url: publicUrlForKey(attachment_key),
            type: attachment_type,
            size: parseInt(attachment_size) || null,
            duration_ms: parseInt(attachment_duration_ms) || null,
        } : null;

        // Create notification for receiver
        try {
            const { createNotification } = require('./notifications');
            await createNotification(
                receiverId,
                'new_dm',
                `${req.user.username} sent you a message`,
                '/html/pages/community.html#dm',
                req
            );
        } catch { /* notification is non-critical */ }

        // FCM push — fire-and-forget, never on the response's critical path. Skips
        // silently if the sender somehow messaged themselves, or the receiver has
        // no registered devices.
        if (receiverId !== req.user.id) {
            const pushBody = safeMessage || (attachment_type === 'voice' ? '🎤 Voice message' : '📷 Photo');
            sendDmPush(receiverId, req.user.id, req.user.username, pushBody).catch(err =>
                console.error('DM push notification error:', err)
            );
        }

        res.status(201).json({ success: true, message: dm });
        awardXP(pool, req.app.get('io'), req.user.id, 'first_dm', 'first').catch(() => {});
    } catch (err) {
        console.error('DM send POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/dm/unread-count ─────────────────────────────
router.get('/unread-count', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM direct_messages WHERE receiver_id = $1 AND read = false',
            [req.user.id]
        );
        res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('DM unread count error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

/**
 * sendDmPush
 * @description Pushes a "new DM" notification to every device the receiver
 * has registered. Silently does nothing if there are no tokens — that's the
 * normal case for a receiver who never opened the app on this build.
 */
async function sendDmPush(receiverId, senderId, senderUsername, message) {
    const tokensResult = await pool.query(
        'SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1',
        [receiverId]
    );
    if (tokensResult.rows.length === 0) return;

    const body = message.length > 100 ? `${message.slice(0, 100)}...` : message;
    const avatarResult = await pool.query('SELECT avatar FROM users WHERE id = $1', [senderId]);
    // FCM data payload values must all be strings.
    const pushData = {
        type: 'dm',
        senderId: String(senderId),
        senderAvatar: avatarResult.rows[0]?.avatar || '',
        conversationWith: String(senderId)
    };

    await Promise.all(
        tokensResult.rows.map(row => sendPushNotification(row.fcm_token, senderUsername, body, pushData))
    );
}

// ── PATCH /api/dm/read/:partnerId ─────────────────────────
// Lightweight mark-as-read used by the app's "Mark as read" notification action —
// unlike GET /messages/:partnerId (which also marks read), this doesn't fetch/return
// the message history, since the notification action has nowhere to show it.
router.patch('/read/:partnerId', authRequired, async (req, res) => {
    const partnerId = parseInt(req.params.partnerId);
    if (isNaN(partnerId)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        const result = await pool.query(
            'UPDATE direct_messages SET read = true WHERE sender_id = $1 AND receiver_id = $2 AND read = false',
            [partnerId, req.user.id]
        );
        // A 0-row UPDATE isn't a Postgres error, so it was silently reported as
        // {success:true} even when nothing changed — the usual cause is this call running
        // under the wrong account's session (multi-account-on-one-device: the notification's
        // "Mark as read" always authenticates as whichever account is currently active in the
        // app, not necessarily the one the notification was addressed to; if the receiving
        // account wasn't switched to active first, sender_id/receiver_id never match a real
        // row). Surfacing rowCount makes that failure visible instead of a silent no-op.
        res.json({ success: true, updated: result.rowCount });
    } catch (err) {
        console.error('DM mark-read PATCH error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── PATCH /api/dm/:id ─────────────────────────────────────
// Edit a message's text — sender-only, mirrors the Android app's commitEdit() (which writes
// directly to Supabase). Attachment-only messages aren't editable from the UI, but nothing
// here prevents adding text to one if a client wanted to.
router.patch('/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });
    const message = String(req.body.message || '').trim().slice(0, 2000);
    if (!message) return res.status(400).json({ success: false, error: 'Message cannot be empty.' });

    try {
        const result = await pool.query(
            `UPDATE direct_messages SET message = $1, edited_at = NOW()
             WHERE id = $2 AND sender_id = $3
             RETURNING id, message, edited_at`,
            [message, id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        res.json({ success: true, message: result.rows[0] });
    } catch (err) {
        console.error('DM edit PATCH error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/dm/:id ────────────────────────────────────
// Sender-only, mirrors deleteMessage() — no server-side object cleanup for attachments
// (same tradeoff already made on the Android side: the R2 object is left orphaned rather
// than wiring up an authenticated delete for it).
router.delete('/:id', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid ID.' });

    try {
        const result = await pool.query(
            'DELETE FROM direct_messages WHERE id = $1 AND sender_id = $2 RETURNING id',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('DM delete error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/dm/:id/react ────────────────────────────────
// Add a reaction — either conversation participant may react, not just the sender. Verifies
// the message belongs to a conversation the caller is actually part of, since message_reactions
// has no RLS-equivalent check at this layer (site backend, not PostgREST — see mobile client's
// direct Supabase RLS policies for the same rule enforced there).
router.post('/:id/react', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    const emoji = String(req.body.emoji || '').trim().slice(0, 8);
    if (isNaN(id) || !emoji) return res.status(400).json({ success: false, error: 'Invalid request.' });

    try {
        const msgCheck = await pool.query(
            'SELECT id FROM direct_messages WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
            [id, req.user.id]
        );
        if (msgCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Message not found.' });
        }
        await pool.query(
            `INSERT INTO message_reactions (scope, message_id, user_id, emoji)
             VALUES ('dm', $1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [id, req.user.id, emoji]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('DM react POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/dm/:id/react ──────────────────────────────
router.delete('/:id/react', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    const emoji = String(req.query.emoji || req.body.emoji || '').trim().slice(0, 8);
    if (isNaN(id) || !emoji) return res.status(400).json({ success: false, error: 'Invalid request.' });

    try {
        await pool.query(
            `DELETE FROM message_reactions WHERE scope = 'dm' AND message_id = $1 AND user_id = $2 AND emoji = $3`,
            [id, req.user.id, emoji]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('DM react DELETE error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
