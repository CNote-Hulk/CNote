/**
 * Notification Routes — /api/notifications
 * In-app notifications for forum replies, DMs, listings, etc.
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

const router = express.Router();

const VALID_TYPES = ['forum_reply', 'new_dm', 'listing_interest', 'listing_sold', 'repair_accepted', 'upvote'];

// ── GET /api/notifications ───────────────────────────────
router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, type, message, link, read, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);

        res.json({ success: true, notifications: result.rows });
    } catch (err) {
        console.error('Notifications GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── GET /api/notifications/unread-count ──────────────────
router.get('/unread-count', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
            [req.user.id]
        );
        res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (err) {
        console.error('Notifications unread GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/notifications/:id/read ─────────────────────
router.post('/:id/read', authRequired, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, error: 'ID invalid.' });

    try {
        await pool.query(
            'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Notification read POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/notifications/read-all ─────────────────────
router.post('/read-all', authRequired, async (req, res) => {
    try {
        await pool.query(
            'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Notifications read-all POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

/**
 * Helper: create a notification (used by other routes)
 * Usage: const { createNotification } = require('./notifications');
 */
async function createNotification(userId, type, message, link) {
    if (!userId || !VALID_TYPES.includes(type)) return;
    try {
        await pool.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES ($1, $2, $3, $4)',
            [userId, type, String(message).slice(0, 500), String(link || '').slice(0, 500)]
        );
    } catch (err) {
        console.error('createNotification error:', err);
    }
}

module.exports = router;
module.exports.createNotification = createNotification;
