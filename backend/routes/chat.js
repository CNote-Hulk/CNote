/* ─────────────────────────────────────────
   FILE: chat.js
   DESCRIPTION: Community chat. Paginated message retrieval
   and posting with per-user rate-limit cooldown.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { awardXP } = require('../utils/gamification');
const { publicUrlForKey } = require('../utils/objectStorage');
const { isMuted } = require('../utils/moderation');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 500;
const COOLDOWN_MS = 3000;
const ATTACHMENT_COOLDOWN_MS = 3000; // same cooldown bucket as text — one message-or-attachment per window

/**
 * attachmentPayload
 * @description Builds the { attachment: {...} } block for a message row, or
 * null if the message has no attachment. Keeps GET/POST responses identical.
 */
function attachmentPayload(row) {
    if (!row.attachment_key) return null;
    return {
        url: publicUrlForKey(row.attachment_key),
        type: row.attachment_type,
        size: row.attachment_size,
        duration_ms: row.attachment_duration_ms,
    };
}

// GET /api/chat/messages — Fetch recent messages with cursor-based pagination
router.get('/messages', async (req, res) => {
    try {
        // Pagination: ?limit=N&before=cursor_id
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const before = parseInt(req.query.before) || null;

        const columns = `m.id, m.message, m.created_at,
                       m.attachment_key, m.attachment_type, m.attachment_size, m.attachment_duration_ms,
                       u.id AS user_id, u.username, u.avatar`;

        let query;
        let params;
        if (before) {
            // DB: fetch messages older than cursor ID, newest first
            query = `
                SELECT ${columns}
                FROM messages m
                JOIN users u ON u.id = m.user_id
                WHERE m.id < $1
                ORDER BY m.id DESC
                LIMIT $2
            `;
            params = [before, limit];
        } else {
            // DB: fetch newest N messages
            query = `
                SELECT ${columns}
                FROM messages m
                JOIN users u ON u.id = m.user_id
                ORDER BY m.id DESC
                LIMIT $1
            `;
            params = [limit];
        }

        const result = await pool.query(query, params);
        // Reverse so messages appear in chronological order (oldest first)
        const messages = result.rows.reverse().map(row => ({
            id: row.id,
            message: row.message,
            created_at: row.created_at,
            attachment: attachmentPayload(row),
            user: {
                id: row.user_id,
                username: row.username,
                avatar: row.avatar || ''
            }
        }));

        res.json({ success: true, messages });
    } catch (err) {
        console.error('Chat GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/chat/messages — Send a new chat message and/or attachment (rate-limited)
router.post('/messages', authRequired, async (req, res) => {
    // (2026-09-01) forum.js/marketplace.js/dm.js all reject a muted user's post — this route
    // (the general "Community Chat" — frontend/js/pages/chat.js) never did, the one gap in an
    // otherwise-consistent mute enforcement. Same message shape as the others.
    if (isMuted(req.user)) {
        return res.status(403).json({ success: false, error: `You are restricted from posting until ${new Date(req.user.muted_until).toISOString()}.` });
    }
    try {
        const { message, attachment_key, attachment_type, attachment_size, attachment_duration_ms } = req.body;

        const hasAttachment = typeof attachment_key === 'string' && attachment_key.length > 0;
        if (hasAttachment && attachment_type !== 'image' && attachment_type !== 'voice' && attachment_type !== 'sticker') {
            return res.status(400).json({ success: false, error: 'Invalid attachment_type.' });
        }
        // attachment_key must be one we actually issued via /api/uploads/presign for this user
        const attachmentFolder = attachment_type === 'image' ? 'images' : attachment_type === 'sticker' ? 'stickers' : 'voice';
        if (hasAttachment && !attachment_key.startsWith(`chat/${attachmentFolder}/${req.user.id}/`)) {
            return res.status(400).json({ success: false, error: 'Invalid attachment.' });
        }

        const text = message ? String(message).trim() : '';
        if (!hasAttachment && text.length === 0) {
            return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
        }
        if (text.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ success: false, error: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` });
        }

        // Cooldown check via DB — survives restarts and scales across instances
        const lastMsg = await pool.query(
            'SELECT created_at FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [req.user.id]
        );
        if (lastMsg.rows.length > 0) {
            const elapsed = Date.now() - new Date(lastMsg.rows[0].created_at).getTime();
            const cooldown = hasAttachment ? ATTACHMENT_COOLDOWN_MS : COOLDOWN_MS;
            if (elapsed < cooldown) {
                const wait = Math.ceil((cooldown - elapsed) / 1000);
                return res.status(429).json({ success: false, error: `Wait ${wait} seconds before sending another message.` });
            }
        }

        // DB: insert message (+ optional attachment) and return generated ID + timestamp
        const result = await pool.query(
            `INSERT INTO messages (user_id, message, attachment_key, attachment_type, attachment_size, attachment_duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
            [
                req.user.id,
                text || null,
                hasAttachment ? attachment_key : null,
                hasAttachment ? attachment_type : null,
                hasAttachment ? (parseInt(attachment_size) || null) : null,
                hasAttachment ? (parseInt(attachment_duration_ms) || null) : null,
            ]
        );

        res.status(201).json({
            success: true,
            message: {
                id: result.rows[0].id,
                message: text,
                created_at: result.rows[0].created_at,
                attachment: hasAttachment ? {
                    url: publicUrlForKey(attachment_key),
                    type: attachment_type,
                    size: parseInt(attachment_size) || null,
                    duration_ms: parseInt(attachment_duration_ms) || null,
                } : null,
                user: {
                    id: req.user.id,
                    username: req.user.username,
                    avatar: req.user.avatar || ''
                }
            }
        });
        awardXP(pool, req.app.get('io'), req.user.id, 'first_chat_message', 'done').catch(() => {});
    } catch (err) {
        console.error('Chat POST error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
