/* ─────────────────────────────────────────
   FILE: friends.js
   DESCRIPTION: Friend management routes. Send/accept/reject
   friend requests, list friends, check friendship status.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const emailService = require('../services/email');
const { createNotification } = require('./notifications');
const { awardXP } = require('../utils/gamification');
const { sendPushToUser } = require('../services/firebaseAdmin');

const router = express.Router();

// POST /api/friends/request/:userId — Send friend request (or auto-accept if mutual)
router.post('/request/:userId', authRequired, async (req, res) => {
    try {
        const receiverId = parseInt(req.params.userId, 10);
        if (!receiverId || receiverId === req.user.id) {
            return res.status(400).json({ success: false, error: 'Invalid user ID.' });
        }

        const userResult = await pool.query('SELECT id, username, email, notify_new_friend FROM users WHERE id = $1', [receiverId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        const receiver = userResult.rows[0];

        const friendCheck = await pool.query(
            `SELECT id FROM friends
             WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
            [req.user.id, receiverId]
        );
        if (friendCheck.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'You are already friends.' });
        }

        // DB: check for existing pending request in either direction
        const existingRequest = await pool.query(
            `SELECT id, sender_id FROM friend_requests
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

                if (receiver.notify_new_friend !== false) {
                    await createNotification(
                        receiverId,
                        'friend_accepted',
                        `${req.user.username} accepted your friend request.`,
                        '/html/pages/home.html#friends'
                    );
                    // FCM push — fire-and-forget, same pattern as DM push (routes/dm.js)
                    sendPushToUser(
                        receiverId,
                        req.user.username,
                        'accepted your friend request.',
                        { type: 'friend_accepted', userId: String(req.user.id) }
                    ).catch(err => console.error('Friend accepted push error:', err));
                }

                if (receiver.email && receiver.notify_new_friend !== false) {
                    emailService.sendFriendAcceptedNotification({
                        to: receiver.email,
                        username: receiver.username,
                        accepterUsername: req.user.username,
                        baseUrl: process.env.BASE_URL
                    }).catch((emailErr) => {
                        console.error('Friend accepted notification email error:', emailErr);
                    });
                }

                const io = req.app.get('io');
                res.json({ success: true, status: 'friends' });
                awardXP(pool, io, req.user.id, 'friend_added', receiverId.toString()).catch(() => {});
                awardXP(pool, io, receiverId, 'friend_added', req.user.id.toString()).catch(() => {});
                return;
            }
            return res.status(400).json({ success: false, error: 'Friend request has already been sent.' });
        }

        await pool.query('INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)', [req.user.id, receiverId]);

        if (receiver.notify_new_friend !== false) {
            await createNotification(
                receiverId,
                'friend_request',
                `${req.user.username} sent you a friend request.`,
                '/html/pages/home.html#friends'
            );
            sendPushToUser(
                receiverId,
                req.user.username,
                'sent you a friend request.',
                { type: 'friend_request', userId: String(req.user.id) }
            ).catch(err => console.error('Friend request push error:', err));
        }

        if (receiver.email && receiver.notify_new_friend !== false) {
            emailService.sendFriendRequestNotification({
                to: receiver.email,
                receiverUsername: receiver.username,
                senderUsername: req.user.username,
                baseUrl: process.env.BASE_URL
            }).catch((emailErr) => {
                console.error('Friend request notification email error:', emailErr);
            });
        }

        res.json({ success: true, status: 'pending' });
    } catch (err) {
        console.error('Friend request error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/friends/accept/:requestId — Accept a pending friend request
router.post('/accept/:requestId', authRequired, async (req, res) => {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        const result = await pool.query(
            `SELECT fr.*, u.username AS sender_username, u.email AS sender_email, u.notify_new_friend AS sender_notify_new_friend
             FROM friend_requests fr
             JOIN users u ON u.id = fr.sender_id
             WHERE fr.id = $1 AND fr.receiver_id = $2 AND fr.status = 'pending'`,
            [requestId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Request not found.' });
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

        if (request.sender_notify_new_friend !== false) {
            await createNotification(
                request.sender_id,
                'friend_accepted',
                `${req.user.username} accepted your friend request.`,
                '/html/pages/home.html#friends'
            );
            sendPushToUser(
                request.sender_id,
                req.user.username,
                'accepted your friend request.',
                { type: 'friend_accepted', userId: String(req.user.id) }
            ).catch(err => console.error('Friend accepted push error:', err));
        }

        if (request.sender_email && request.sender_notify_new_friend !== false) {
            emailService.sendFriendAcceptedNotification({
                to: request.sender_email,
                username: request.sender_username,
                accepterUsername: req.user.username,
                baseUrl: process.env.BASE_URL
            }).catch((emailErr) => {
                console.error('Friend accepted notification email error:', emailErr);
            });
        }

        res.json({ success: true });
        const io = req.app.get('io');
        awardXP(pool, io, req.user.id, 'friend_added', request.sender_id.toString()).catch(() => {});
        awardXP(pool, io, request.sender_id, 'friend_added', req.user.id.toString()).catch(() => {});
    } catch (err) {
        console.error('Accept friend error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
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
            return res.status(404).json({ success: false, error: 'Request not found.' });
        }

        await pool.query('UPDATE friend_requests SET status = \'rejected\' WHERE id = $1', [requestId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Reject friend error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/friends — List all friends of current user
router.get('/', authRequired, async (req, res) => {
    try {
        // DB: join friends table with users, finding both directions
        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar, f.created_at AS friends_since
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
        res.status(500).json({ success: false, error: 'Internal error.' });
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
        res.status(500).json({ success: false, error: 'Internal error.' });
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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
