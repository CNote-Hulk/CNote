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

const router = express.Router();

const MAX_MESSAGE_LENGTH = 500;
const COOLDOWN_MS = 3000;

// GET /api/chat/messages — Fetch recent messages with cursor-based pagination
router.get('/messages', async (req, res) => {
    try {
        // Pagination: ?limit=N&before=cursor_id
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const before = parseInt(req.query.before) || null;

        let query;
        let params;
        if (before) {
            // DB: fetch messages older than cursor ID, newest first
            query = `
                SELECT m.id, m.message, m.created_at,
                       u.id AS user_id, u.username, u.avatar
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
                SELECT m.id, m.message, m.created_at,
                       u.id AS user_id, u.username, u.avatar
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

// POST /api/chat/messages — Send a new chat message (rate-limited)
router.post('/messages', authRequired, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || String(message).trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
        }

        const text = String(message).trim();
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
            if (elapsed < COOLDOWN_MS) {
                const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
                return res.status(429).json({ success: false, error: `Wait ${wait} seconds before sending another message.` });
            }
        }

        // DB: insert message and return generated ID + timestamp
        const result = await pool.query(
            'INSERT INTO messages (user_id, message) VALUES ($1, $2) RETURNING id, created_at',
            [req.user.id, text]
        );


        res.status(201).json({
            success: true,
            message: {
                id: result.rows[0].id,
                message: text,
                created_at: result.rows[0].created_at,
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
