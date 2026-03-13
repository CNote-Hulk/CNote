/**
 * Session management routes
 *
 * GET    /api/sessions          — List active sessions for current user
 * DELETE /api/sessions/:id      — Invalidate a specific session (remote logout)
 * DELETE /api/sessions          — Invalidate all sessions except current
 */

const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/sessions ──────────────────────────────────

router.get('/', authRequired, async (req, res) => {
    const result = await pool.query(`
        SELECT id, device_type, browser, operating_system, ip_address, country,
               login_time, last_activity, is_active,
               (session_token = $1)::int AS is_current
        FROM user_sessions
        WHERE user_id = $2 AND is_active = 1
        ORDER BY last_activity DESC
    `, [req.sessionToken || '', req.user.id]);

    const formatted = result.rows.map(s => ({
        id: s.id,
        device_type: s.device_type,
        browser: s.browser,
        operating_system: s.operating_system,
        ip_address: s.ip_address,
        country: s.country,
        login_time: s.login_time,
        last_activity: s.last_activity,
        is_current: !!s.is_current
    }));

    res.json({ success: true, sessions: formatted });
});

// ─── DELETE /api/sessions/:id ───────────────────────────

router.delete('/:id', authRequired, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
        return res.status(400).json({ success: false, error: 'ID sesiune invalid.' });
    }

    // Ensure session belongs to current user
    const sessionResult = await pool.query(
        'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = 1',
        [sessionId, req.user.id]
    );

    if (!sessionResult.rows[0]) {
        return res.status(404).json({ success: false, error: 'Sesiunea nu a fost găsită.' });
    }

    await pool.query('UPDATE user_sessions SET is_active = 0 WHERE id = $1', [sessionId]);

    res.json({ success: true, message: 'Sesiunea a fost închisă.' });
});

// ─── DELETE /api/sessions (all except current) ──────────

router.delete('/', authRequired, async (req, res) => {
    await pool.query(`
        UPDATE user_sessions SET is_active = 0
        WHERE user_id = $1 AND session_token != $2 AND is_active = 1
    `, [req.user.id, req.sessionToken || '']);

    res.json({ success: true, message: 'Toate celelalte sesiuni au fost închise.' });
});

module.exports = router;
