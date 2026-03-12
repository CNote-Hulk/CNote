/**
 * User profile routes (public profiles)
 *
 * GET /api/users/:username          — Get public user profile by username
 * GET /api/users/:username/friends  — Get user's friend list
 * GET /api/users/id/:id             — Get public user profile by ID
 * GET /api/consoles/list            — Get list of all console IDs and names
 * GET /api/users/:username/owned    — Get user's owned consoles
 * GET /api/users/:username/favorites — Get user's favorite consoles
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db');

const router = express.Router();

// ─── GET /api/users/:username ───────────────────────────

router.get('/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await pool.query(
            `SELECT id, username, bio, avatar, favorite_consoles, owned_consoles, created_at
             FROM users WHERE LOWER(username) = LOWER($1)`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost găsit.' });
        }

        const user = result.rows[0];

        // Get favorites from user_favorites table
        const favResult = await pool.query(
            'SELECT console_id FROM user_favorites WHERE user_id = $1',
            [user.id]
        );

        // Get owned from user_owned_consoles table
        const ownedResult = await pool.query(
            'SELECT console_id FROM user_owned_consoles WHERE user_id = $1',
            [user.id]
        );

        // Get friend count
        const friendCount = await pool.query(
            `SELECT COUNT(*) AS count FROM friends
             WHERE user1_id = $1 OR user2_id = $1`,
            [user.id]
        );

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                bio: user.bio || '',
                avatar: user.avatar || '',
                favorite_consoles: user.favorite_consoles || '',
                owned_consoles: user.owned_consoles || '',
                favorite_console_ids: favResult.rows.map(r => r.console_id),
                owned_console_ids: ownedResult.rows.map(r => r.console_id),
                friend_count: parseInt(friendCount.rows[0].count),
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('User profile error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/users/id/:id ──────────────────────────────

router.get('/users/id/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const result = await pool.query(
            `SELECT id, username, bio, avatar, favorite_consoles, owned_consoles, created_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost găsit.' });
        }

        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                bio: user.bio || '',
                avatar: user.avatar || '',
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('User profile by ID error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/users/:username/friends ───────────────────

router.get('/users/:username/friends', async (req, res) => {
    try {
        const { username } = req.params;
        const userResult = await pool.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost găsit.' });
        }

        const userId = userResult.rows[0].id;
        const result = await pool.query(`
            SELECT u.id, u.username, u.avatar
            FROM friends f
            JOIN users u ON (
                (f.user1_id = $1 AND u.id = f.user2_id) OR
                (f.user2_id = $1 AND u.id = f.user1_id)
            )
            ORDER BY f.created_at DESC
        `, [userId]);

        res.json({ success: true, friends: result.rows });
    } catch (err) {
        console.error('User friends error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/consoles/list ─────────────────────────────
// Returns a simple list of all console IDs and names for dropdowns

router.get('/consoles/list', async (req, res) => {
    try {
        const consolesPath = path.join(__dirname, '..', '..', 'js', 'data', 'consoles.json');
        const data = JSON.parse(fs.readFileSync(consolesPath, 'utf8'));
        const list = data.map(c => ({ id: c.id, name: c.nume })).sort((a, b) => a.name.localeCompare(b.name));
        res.json({ success: true, consoles: list });
    } catch (err) {
        console.error('Console list error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/owned-consoles ────────────────────────────
// Get current user's owned consoles from the new table

const { authRequired } = require('../middleware/auth');

router.get('/owned-consoles', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT console_id FROM user_owned_consoles WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true, consoles: result.rows.map(r => r.console_id) });
    } catch (err) {
        console.error('Owned consoles GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── PUT /api/owned-consoles ────────────────────────────
// Update owned consoles (replace all)

router.put('/owned-consoles', authRequired, async (req, res) => {
    try {
        const { consoles } = req.body;
        if (!Array.isArray(consoles)) {
            return res.status(400).json({ success: false, error: 'Format invalid.' });
        }

        // Delete existing
        await pool.query('DELETE FROM user_owned_consoles WHERE user_id = $1', [req.user.id]);

        // Insert new ones
        for (const consoleId of consoles) {
            if (consoleId && String(consoleId).trim()) {
                await pool.query(
                    'INSERT INTO user_owned_consoles (user_id, console_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [req.user.id, String(consoleId).trim()]
                );
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Owned consoles PUT error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
