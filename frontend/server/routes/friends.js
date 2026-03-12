/**
 * Friend system routes
 *
 * POST   /api/friends/request/:userId    — Send friend request
 * POST   /api/friends/accept/:requestId  — Accept friend request
 * POST   /api/friends/reject/:requestId  — Reject friend request
 * DELETE /api/friends/:userId            — Remove friend
 * GET    /api/friends                    — Get friend list
 * GET    /api/friends/requests           — Get pending friend requests
 * GET    /api/friends/status/:userId     — Get friendship status with a user
 */

const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/friends/request/:userId ──────────────────

router.post('/request/:userId', authRequired, async (req, res) => {
    try {
        const receiverId = parseInt(req.params.userId, 10);
        if (!receiverId || receiverId === req.user.id) {
            return res.status(400).json({ success: false, error: 'ID utilizator invalid.' });
        }

        // Check receiver exists
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [receiverId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost găsit.' });
        }

        // Check if already friends
        const friendCheck = await pool.query(
            `SELECT id FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, receiverId]
        );
        if (friendCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Sunteți deja prieteni.' });
        }

        // Check if request already exists (in either direction)
        const existingRequest = await pool.query(
            `SELECT id, status, sender_id FROM friend_requests
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
             AND status = 'pending'`,
            [req.user.id, receiverId]
        );

        if (existingRequest.rows.length > 0) {
            const existing = existingRequest.rows[0];
            // If the other user already sent us a request, auto-accept
            if (existing.sender_id === receiverId) {
                await pool.query(
                    `UPDATE friend_requests SET status = 'accepted' WHERE id = $1`,
                    [existing.id]
                );
                // Create friendship (store with lower id first for consistency)
                const [u1, u2] = req.user.id < receiverId ? [req.user.id, receiverId] : [receiverId, req.user.id];
                await pool.query(
                    'INSERT INTO friends (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [u1, u2]
                );
                return res.json({ success: true, status: 'friends' });
            }
            return res.status(400).json({ success: false, error: 'Cererea de prietenie a fost deja trimisă.' });
        }

        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)',
            [req.user.id, receiverId]
        );

        res.json({ success: true, status: 'pending' });
    } catch (err) {
        console.error('Friend request error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── POST /api/friends/accept/:requestId ────────────────

router.post('/accept/:requestId', authRequired, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        const result = await pool.query(
            `SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
            [requestId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cererea nu a fost găsită.' });
        }

        const request = result.rows[0];
        await pool.query(`UPDATE friend_requests SET status = 'accepted' WHERE id = $1`, [requestId]);

        // Create friendship
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
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── POST /api/friends/reject/:requestId ────────────────

router.post('/reject/:requestId', authRequired, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        const result = await pool.query(
            `SELECT * FROM friend_requests WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
            [requestId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cererea nu a fost găsită.' });
        }

        await pool.query(`UPDATE friend_requests SET status = 'rejected' WHERE id = $1`, [requestId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Reject friend error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── DELETE /api/friends/:userId ────────────────────────

router.delete('/:userId', authRequired, async (req, res) => {
    try {
        const friendId = parseInt(req.params.userId, 10);
        await pool.query(
            `DELETE FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, friendId]
        );
        // Also clean up any pending requests between them
        await pool.query(
            `DELETE FROM friend_requests
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
            [req.user.id, friendId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/friends ───────────────────────────────────

router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar, u.bio, f.created_at AS friends_since
            FROM friends f
            JOIN users u ON (
                (f.user1_id = $1 AND u.id = f.user2_id) OR
                (f.user2_id = $1 AND u.id = f.user1_id)
            )
            ORDER BY f.created_at DESC
        `, [req.user.id]);

        res.json({ success: true, friends: result.rows });
    } catch (err) {
        console.error('Friends list error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/friends/requests ──────────────────────────

router.get('/requests', authRequired, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT fr.id AS request_id, fr.sender_id, fr.created_at,
                   u.username, u.avatar
            FROM friend_requests fr
            JOIN users u ON u.id = fr.sender_id
            WHERE fr.receiver_id = $1 AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
        `, [req.user.id]);

        res.json({ success: true, requests: result.rows });
    } catch (err) {
        console.error('Friend requests error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/friends/status/:userId ────────────────────

router.get('/status/:userId', authRequired, async (req, res) => {
    try {
        const targetId = parseInt(req.params.userId, 10);
        if (!targetId || targetId === req.user.id) {
            return res.json({ success: true, status: 'self' });
        }

        // Check friendship
        const friendCheck = await pool.query(
            `SELECT id FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, targetId]
        );
        if (friendCheck.rows.length > 0) {
            return res.json({ success: true, status: 'friends' });
        }

        // Check pending requests
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
            } else {
                return res.json({ success: true, status: 'request_received', requestId: r.id });
            }
        }

        res.json({ success: true, status: 'none' });
    } catch (err) {
        console.error('Friend status error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
