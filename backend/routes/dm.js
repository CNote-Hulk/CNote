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

const router = express.Router();

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
                   u.username AS sender_name
            FROM direct_messages dm
            JOIN users u ON u.id = dm.sender_id
            WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
               OR (dm.sender_id = $2 AND dm.receiver_id = $1)
            ORDER BY dm.created_at ASC
            LIMIT 200
        `, [req.user.id, partnerId]);

        res.json({ success: true, messages: result.rows });
    } catch (err) {
        console.error('DM messages GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/dm/send ────────────────────────────────────
router.post('/send', authRequired, async (req, res) => {
    // Accept both receiverId (frontend) and receiver_id (alternative)
    const rawId = req.body.receiverId || req.body.receiver_id;
    const { message, listingId } = req.body;

    if (!rawId || !message || String(message).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Recipient and message are required.' });
    }

    const receiverId = parseInt(rawId);
    if (isNaN(receiverId) || receiverId === req.user.id) {
        return res.status(400).json({ success: false, error: 'Invalid recipient.' });
    }

    const safeMessage = String(message).trim().slice(0, 2000);
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

        const result = await pool.query(`
            INSERT INTO direct_messages (sender_id, receiver_id, message, listing_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, sender_id, receiver_id, message, listing_id, created_at
        `, [req.user.id, receiverId, safeMessage, safeListing]);

        const dm = result.rows[0];
        dm.sender_name = req.user.username;

        // Create notification for receiver
        try {
            const { createNotification } = require('./notifications');
            await createNotification(
                receiverId,
                'new_dm',
                `${req.user.username} sent you a message`,
                '/html/pages/community.html#dm'
            );
        } catch { /* notification is non-critical */ }

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

module.exports = router;
