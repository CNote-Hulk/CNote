const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/user/all', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT console_id, rating, created_at FROM console_ratings WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ success: true, ratings: result.rows });
    } catch (err) {
        console.error('Get user ratings error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.get('/averages', async (req, res) => {
    try {
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
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

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
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/:consoleId', authRequired, async (req, res) => {
    try {
        const { consoleId } = req.params;
        const { rating } = req.body;

        const ratingNum = parseInt(rating, 10);
        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ success: false, error: 'Rating-ul trebuie sa fie intre 1 si 5.' });
        }

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
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

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

async function resolveUserId(req, token) {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = req.app.get('JWT_SECRET');
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch {
        const result = await pool.query(
            'SELECT user_id FROM user_sessions WHERE session_token = $1 AND is_active = true',
            [token]
        );
        return result.rows[0]?.user_id || null;
    }
}

module.exports = router;
