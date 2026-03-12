/**
 * Favorite consoles routes
 *
 * GET    /api/favorites              — Get current user's favorite console IDs
 * GET    /api/favorites/:consoleId   — Check if current user favorited a console
 * POST   /api/favorites/:consoleId   — Toggle favorite (add/remove)
 */

const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/favorites ─────────────────────────────────

router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT console_id, created_at FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, favorites: result.rows.map(r => r.console_id) });
    } catch (err) {
        console.error('Favorites GET error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/favorites/:consoleId ──────────────────────

router.get('/:consoleId', authRequired, async (req, res) => {
    try {
        const { consoleId } = req.params;
        const result = await pool.query(
            'SELECT id FROM user_favorites WHERE user_id = $1 AND console_id = $2',
            [req.user.id, consoleId]
        );
        res.json({ success: true, isFavorite: result.rows.length > 0 });
    } catch (err) {
        console.error('Favorites check error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── POST /api/favorites/:consoleId ─────────────────────

router.post('/:consoleId', authRequired, async (req, res) => {
    try {
        const { consoleId } = req.params;
        if (!consoleId || String(consoleId).trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Console ID invalid.' });
        }

        const existing = await pool.query(
            'SELECT id FROM user_favorites WHERE user_id = $1 AND console_id = $2',
            [req.user.id, consoleId]
        );

        if (existing.rows.length > 0) {
            // Remove favorite
            await pool.query(
                'DELETE FROM user_favorites WHERE user_id = $1 AND console_id = $2',
                [req.user.id, consoleId]
            );
            res.json({ success: true, isFavorite: false });
        } else {
            // Add favorite
            await pool.query(
                'INSERT INTO user_favorites (user_id, console_id) VALUES ($1, $2)',
                [req.user.id, consoleId]
            );
            res.json({ success: true, isFavorite: true });
        }
    } catch (err) {
        console.error('Favorites toggle error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
