/* ─────────────────────────────────────────
   FILE: ratings.js
   DESCRIPTION: Console rating system. Users can rate consoles
   1-5, view averages, and see their own ratings.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/ratings/user/all — Get all ratings by current user
router.get('/user/all', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT console_id, rating, created_at FROM console_ratings WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, ratings: result.rows });
    } catch (err) {
        console.error('Get user ratings error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/ratings/user/public/:username — Get all ratings by public username
router.get('/user/public/:username', async (req, res) => {
    try {
        const username = String(req.params.username || '').trim();
        if (!username) {
            return res.status(400).json({ success: false, error: 'Username is required.' });
        }

        const userResult = await pool.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1',
            [username]
        );

        const userId = userResult.rows[0]?.id;
        if (!userId) {
            return res.json({ success: true, ratings: [] });
        }

        const result = await pool.query(
            'SELECT console_id, rating, created_at FROM console_ratings WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        return res.json({ success: true, ratings: result.rows });
    } catch (err) {
        console.error('Get public user ratings error:', err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/ratings/averages — Get average rating & count for all consoles
router.get('/averages', async (req, res) => {
    try {
        // DB: aggregate ratings per console — AVG rounded to 1 decimal
        const result = await pool.query(
            `SELECT console_id,
                    ROUND(AVG(rating)::numeric, 1) AS average,
                    COUNT(*)::int AS count
             FROM console_ratings
             GROUP BY console_id`
        );
        const map = {};
        result.rows.forEach(r => {
            map[r.console_id] = { average: parseFloat(r.average), count: r.count };
        });
        res.json({ success: true, ratings: map });
    } catch (err) {
        console.error('Get all averages error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/ratings/:consoleId — Get average + user’s own rating for one console
router.get('/:consoleId', async (req, res) => {
    try {
        const { consoleId } = req.params;

        const statsResult = await pool.query(
            'SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count FROM console_ratings WHERE console_id = $1',
            [consoleId]
        );
        const { average, count } = statsResult.rows[0];

        let userRating = null;
        const token = extractToken(req);
        if (token) {
            const userId = await resolveUserId(req, token);
            if (userId) {
                const userResult = await pool.query(
                    'SELECT rating FROM console_ratings WHERE user_id = $1 AND console_id = $2',
                    [userId, consoleId]
                );
                if (userResult.rows[0]) {
                    userRating = userResult.rows[0].rating;
                }
            }
        }

        res.json({
            success: true,
            average: Math.round(parseFloat(average) * 10) / 10,
            count,
            userRating
        });
    } catch (err) {
        console.error('Get rating error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/ratings/:consoleId — Submit or update a console rating (1-5)
router.post('/:consoleId', authRequired, async (req, res) => {
    try {
        const { consoleId } = req.params;
        const { rating } = req.body;

        const ratingNum = parseInt(rating, 10);
        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
        }

        // DB: upsert rating — ON CONFLICT updates existing rating
        await pool.query(
            `INSERT INTO console_ratings (user_id, console_id, rating)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, console_id)
             DO UPDATE SET rating = $3, created_at = NOW()`,
            [req.user.id, consoleId, ratingNum]
        );

        const statsResult = await pool.query(
            'SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count FROM console_ratings WHERE console_id = $1',
            [consoleId]
        );
        const { average, count } = statsResult.rows[0];

        res.json({
            success: true,
            average: Math.round(parseFloat(average) * 10) / 10,
            count,
            userRating: ratingNum
        });
    } catch (err) {
        console.error('Post rating error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

/**
 * extractToken
 * @description Extracts auth token from Authorization header or cookies.
 */
function extractToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies['cn_session_token']) return cookies['cn_session_token'];
    return null;
}

function parseCookies(cookieStr) {
    const result = {};
    cookieStr.split(';').forEach(pair => {
        const [key, ...vals] = pair.trim().split('=');
        if (key) result[key.trim()] = decodeURIComponent(vals.join('='));
    });
    return result;
}

/**
 * resolveUserId
 * @description Resolves user ID from JWT or falls back to session token lookup.
 */
async function resolveUserId(req, token) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = req.app.get('JWT_SECRET');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch {
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const result = await pool.query(
            'SELECT user_id FROM user_sessions WHERE session_token = $1 AND is_active = true',
            [tokenHash]
        );
        return result.rows[0]?.user_id || null;
    }
}

module.exports = router;
