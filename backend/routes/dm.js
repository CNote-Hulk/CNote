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

const router = express.Router();

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
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── GET /api/dm/messages/:partnerId ──────────────────────
router.get('/messages/:partnerId', authRequired, async (req, res) => {
    const partnerId = parseInt(req.params.partnerId);
    if (isNaN(partnerId)) return res.status(400).json({ success: false, error: 'ID invalid.' });

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
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ── POST /api/dm/send ────────────────────────────────────
router.post('/send', authRequired, async (req, res) => {
    // Accept both receiverId (frontend) and receiver_id (alternative)
    const rawId = req.body.receiverId || req.body.receiver_id;
    const { message, listingId } = req.body;

    if (!rawId || !message || String(message).trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Destinatar și mesaj obligatorii.' });
    }

    const receiverId = parseInt(rawId);
    if (isNaN(receiverId) || receiverId === req.user.id) {
        return res.status(400).json({ success: false, error: 'Destinatar invalid.' });
    }

    const safeMessage = String(message).trim().slice(0, 2000);
    const safeListing = listingId ? parseInt(listingId) || null : null;

    try {
        // Verify receiver exists
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizator negăsit.' });
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
                `${req.user.username} ți-a trimis un mesaj`,
                ''
            );
        } catch { /* notification is non-critical */ }

        res.status(201).json({ success: true, message: dm });
    } catch (err) {
        console.error('DM send POST error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
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
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
