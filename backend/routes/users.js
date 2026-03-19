/* ─────────────────────────────────────────
   FILE: users.js
   DESCRIPTION: Public user profiles, user search, console
   list loading (with caching), and owned console management.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/count — Return total active user count (for community card)
router.get('/active-count', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(DISTINCT user_id) 
            FROM user_sessions 
            WHERE is_active = true 
            AND last_activity > NOW() - INTERVAL '5 minutes'
        `);
        res.json({ success: true, count: parseInt(result.rows[0].count) });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/users/search — Search users by partial username match
router.get('/users/search', authRequired, async (req, res) => {
    try {
        const query = (req.query.q || '').trim();
        if (query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        // Sanitize: keep only letters, numbers, underscores, dots, hyphens, spaces
        const safeQuery = query.replace(/[^\p{L}\p{N}_.\- ]/gu, '').trim();
        if (safeQuery.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const result = await pool.query(
            `SELECT id, username, avatar, bio
             FROM users
             WHERE LOWER(username) LIKE LOWER($1)
             AND id != $2
             ORDER BY username ASC
             LIMIT 20`,
            [`%${safeQuery}%`, req.user.id]
        );

        res.json({
            success: true,
            users: result.rows.map(u => ({
                id: u.id,
                username: u.username,
                avatar: u.avatar || '',
                bio: (u.bio || '').substring(0, 80)
            }))
        });
    } catch (err) {
        console.error('User search error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/users/:username — Public user profile with favorites, owned consoles, friend count
router.get('/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await pool.query(
            `SELECT id, username, bio, avatar, favorite_consoles, owned_consoles, role, created_at
             FROM users WHERE LOWER(username) = LOWER($1)`,
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost gasit.' });
        }

        const user = result.rows[0];

        const favResult = await pool.query('SELECT console_id FROM user_favorites WHERE user_id = $1', [user.id]);
        const ownedResult = await pool.query('SELECT console_id FROM user_owned_consoles WHERE user_id = $1', [user.id]);
        const friendCount = await pool.query(
            'SELECT COUNT(*) AS count FROM friends WHERE user1_id = $1 OR user2_id = $1',
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
                role: user.role || 'user',
                created_at: user.created_at
            }
        });
    } catch (err) {
        console.error('User profile error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/users/id/:id — Minimal user profile by numeric ID
router.get('/users/id/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const result = await pool.query(
            `SELECT id, username, bio, avatar, favorite_consoles, owned_consoles, created_at
             FROM users WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost gasit.' });
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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/users/:username/friends — Public friends list for a user
router.get('/users/:username/friends', async (req, res) => {
    try {
        const { username } = req.params;
        const userResult = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Utilizatorul nu a fost gasit.' });
        }

        const userId = userResult.rows[0].id;
        const result = await pool.query(
            `SELECT u.id, u.username, u.avatar
             FROM friends f
             JOIN users u ON (
                (f.user1_id = $1 AND u.id = f.user2_id) OR
                (f.user2_id = $1 AND u.id = f.user1_id)
             )
             ORDER BY f.created_at DESC`,
            [userId]
        );

        res.json({ success: true, friends: result.rows });
    } catch (err) {
        console.error('User friends error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

let _cachedConsoleList = null; // In-memory cache for console list

/**
 * loadConsoleList
 * @description Loads and parses consoles.json from the frontend data folder.
 *              Tries multiple candidate paths and strips UTF-8 BOM if present.
 * @returns {Array|null}
 */
function loadConsoleList() {
    const candidates = [
        path.join(__dirname, '..', '..', 'frontend', 'js', 'data', 'consoles.json'),
        path.resolve(__dirname, '..', '..', 'frontend', 'js', 'data', 'consoles.json')
    ];
    for (const p of candidates) {
        try {
            if (fs.existsSync(p)) {
                let raw = fs.readFileSync(p, 'utf8');
                // Strip UTF-8 BOM if present
                if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
                const data = JSON.parse(raw);
                return data.map(c => ({ id: c.id, name: c.nume })).sort((a, b) => a.name.localeCompare(b.name));
            }
        } catch (err) {
            console.error('Console list parse error at', p, err.message);
        }
    }
    console.error('consoles.json not found. Tried:', candidates.join(', '));
    return null;
}

// GET /api/consoles/list — Return full console list (cached after first load)
router.get('/consoles/list', async (req, res) => {
    try {
        if (!_cachedConsoleList) {
            _cachedConsoleList = loadConsoleList();
        }
        if (!_cachedConsoleList) {
            return res.status(500).json({ success: false, error: 'Lista de console nu a fost gasita.' });
        }
        res.json({ success: true, consoles: _cachedConsoleList });
    } catch (err) {
        console.error('Console list error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/owned-consoles — Get current user’s owned console IDs
router.get('/owned-consoles', authRequired, async (req, res) => {
    try {
        const result = await pool.query('SELECT console_id FROM user_owned_consoles WHERE user_id = $1', [req.user.id]);
        res.json({ success: true, consoles: result.rows.map(r => r.console_id) });
    } catch (err) {
        console.error('Owned consoles GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// PUT /api/owned-consoles — Replace the user’s entire owned-consoles list
router.put('/owned-consoles', authRequired, async (req, res) => {
    try {
        const { consoles } = req.body;
        if (!Array.isArray(consoles)) {
            return res.status(400).json({ success: false, error: 'Format invalid.' });
        }

        await pool.query('DELETE FROM user_owned_consoles WHERE user_id = $1', [req.user.id]);

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
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
