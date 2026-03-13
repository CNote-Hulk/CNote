const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const MAX_MESSAGE_LENGTH = 500;
const COOLDOWN_MS = 3000;
const lastMessageTime = new Map();

router.get('/messages', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const before = parseInt(req.query.before) || null;

        let query;
        let params;
        if (before) {
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
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/messages', authRequired, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || String(message).trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Mesajul nu poate fi gol.' });
        }

        const text = String(message).trim();
        if (text.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ success: false, error: `Mesajul nu poate depasi ${MAX_MESSAGE_LENGTH} caractere.` });
        }

        const now = Date.now();
        const lastTime = lastMessageTime.get(req.user.id) || 0;
        if (now - lastTime < COOLDOWN_MS) {
            const wait = Math.ceil((COOLDOWN_MS - (now - lastTime)) / 1000);
            return res.status(429).json({ success: false, error: `Asteapta ${wait} secunde inainte de a trimite alt mesaj.` });
        }

        const result = await pool.query(
            'INSERT INTO messages (user_id, message) VALUES ($1, $2) RETURNING id, created_at',
            [req.user.id, text]
        );

        lastMessageTime.set(req.user.id, now);

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
    } catch (err) {
        console.error('Chat POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
