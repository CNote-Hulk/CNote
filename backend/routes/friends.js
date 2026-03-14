/* ─────────────────────────────────────────
   FILE: friends.js
   DESCRIPTION: Friend management routes. Send/accept/reject
   friend requests, list friends, check friendship status.
   ───────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// POST /api/friends/request/:userId — Send friend request (or auto-accept if mutual)
router.post('/request/:userId', authRequired, async (req, res) => {
    try {
        const receiverId = parseInt(req.params.userId, 10);
        if (!receiverId || receiverId === req.user.id) {
            return res.status(400).json({ success: false, error: 'ID utilizator invalid.' });
        }

        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost gasit.' });
        }

        const friendCheck = await pool.query(
            `SELECT id FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, receiverId]
        );
        if (friendCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Sunteti deja prieteni.' });
        }

        // DB: check for existing pending request in either direction
        const existingRequest = await pool.query(
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
             AND status = 'pending'`,
            [req.user.id, receiverId]
        );

        if (existingRequest.rows.length > 0) {
            const existing = existingRequest.rows[0];
            if (existing.sender_id === receiverId) {
                // Mutual request: auto-accept and create friendship
                await pool.query('UPDATE friend_requests SET status = \'accepted\' WHERE id = $1', [existing.id]);
                // DB: insert friendship — always store lower ID as user1_id
                const [u1, u2] = req.user.id < receiverId ? [req.user.id, receiverId] : [receiverId, req.user.id];
                await pool.query(
                    'INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [u1, u2]
                );
                return res.json({ success: true, status: 'friends' });
            }
            return res.status(400).json({ success: false, error: 'Cererea de prietenie a fost deja trimisa.' });
        }

        await pool.query('INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)', [req.user.id, receiverId]);
        res.json({ success: true, status: 'pending' });
    } catch (err) {
        console.error('Friend request error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// POST /api/friends/accept/:requestId — Accept a pending friend request
router.post('/accept/:requestId', authRequired, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        const result = await pool.query(
            'SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = \'pending\'',
            [requestId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cererea nu a fost gasita.' });
        }

        const request = result.rows[0];
        await pool.query('UPDATE friend_requests SET status = \'accepted\' WHERE id = $1', [requestId]);

        // DB: create friendship record (lower ID always goes to user1_id)
        const [u1, u2] = request.sender_id < req.user.id
            ? [request.sender_id, req.user.id]
            : [req.user.id, request.sender_id];
        await pool.query(
            'INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [u1, u2]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Accept friend error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// POST /api/friends/reject/:requestId — Reject a pending friend request
router.post('/reject/:requestId', authRequired, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        const result = await pool.query(
            'SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = \'pending\'',
            [requestId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cererea nu a fost gasita.' });
        }

        await pool.query('UPDATE friend_requests SET status = \'rejected\' WHERE id = $1', [requestId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Reject friend error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// DELETE /api/friends/:userId — Remove a friend (deletes friendship + request records)
router.delete('/:userId', authRequired, async (req, res) => {
    try {
        const friendId = parseInt(req.params.userId, 10);
        await pool.query(
            `DELETE FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, friendId]
        );
        await pool.query(
            `DELETE FROM friend_requests
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
            [req.user.id, friendId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// GET /api/friends — List all friends of current user
router.get('/', authRequired, async (req, res) => {
    try {
        // DB: join friends table with users, finding both directions
        const result = await pool.query(
             FROM friends f
             JOIN users u ON (
                (f.user1_id = $1 AND u.id = f.user2_id) OR
                (f.user2_id = $1 AND u.id = f.user1_id)
             )
             ORDER BY f.created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, friends: result.rows });
    } catch (err) {
        console.error('Friends list error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// GET /api/friends/requests — List pending friend requests received
router.get('/requests', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT fr.id AS request_id, fr.sender_id, fr.created_at,
                    u.username, u.avatar
             FROM friend_requests fr
             JOIN users u ON u.id = fr.sender_id
             WHERE fr.receiver_id = $1 AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, requests: result.rows });
    } catch (err) {
        console.error('Friend requests error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// GET /api/friends/status/:userId — Check friendship status with a user
router.get('/status/:userId', authRequired, async (req, res) => {
    try {
        const targetId = parseInt(req.params.userId, 10);
        if (!targetId || targetId === req.user.id) {
            return res.json({ success: true, status: 'self' });
        }

        const friendCheck = await pool.query(
            `SELECT id FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, targetId]
        );
        if (friendCheck.rows.length > 0) {
            return res.json({ success: true, status: 'friends' });
        }

        const requestCheck = await pool.query(
            `SELECT id, sender_id FROM friend_requests
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
             AND status = 'pending'`,
            [req.user.id, targetId]
        );
        if (requestCheck.rows.length > 0) {
            const r = requestCheck.rows[0];
            if (r.sender_id === req.user.id) {
                return res.json({ success: true, status: 'request_sent', requestId: r.id });
            }
            return res.json({ success: true, status: 'request_received', requestId: r.id });
        }

        res.json({ success: true, status: 'none' });
    } catch (err) {
        console.error('Friend status error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
