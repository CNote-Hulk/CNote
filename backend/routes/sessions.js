const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const sseClientsBySessionToken = new Map();

function registerSseClient(sessionToken, client) {
    const set = sseClientsBySessionToken.get(sessionToken) || new Set();
    set.add(client);
    sseClientsBySessionToken.set(sessionToken, set);
}

function unregisterSseClient(sessionToken, client) {
    const set = sseClientsBySessionToken.get(sessionToken);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) {
        sseClientsBySessionToken.delete(sessionToken);
    }
}

function notifySessionTerminated(sessionToken) {
    if (!sessionToken) return;
    const set = sseClientsBySessionToken.get(sessionToken);
    if (!set || set.size === 0) return;

    const payload = JSON.stringify({ event: 'session_terminated' });
    set.forEach((client) => {
        try {
            client.res.write(`data: ${payload}\n\n`);
        } catch {
            clearInterval(client.heartbeat);
            unregisterSseClient(sessionToken, client);
        }
    });
}

router.get('/events', authRequired, async (req, res) => {
    const sessionToken = req.sessionToken || (typeof req.query.token === 'string' ? req.query.token.trim() : '');
    if (!sessionToken) {
        return res.status(401).json({ success: false, error: 'Sesiune invalida.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(': connected\n\n');

    const client = {
        res,
        heartbeat: setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 30000)
    };

    registerSseClient(sessionToken, client);

    req.on('close', () => {
        clearInterval(client.heartbeat);
        unregisterSseClient(sessionToken, client);
    });
});

router.get('/', authRequired, async (req, res) => {
    const result = await pool.query(
        `SELECT id, device_type, browser, operating_system, ip_address, country,
                login_time, last_activity, is_active,
                (session_token = $1)::int AS is_current
         FROM user_sessions
         WHERE user_id = $2 AND is_active = 1
         ORDER BY last_activity DESC`,
        [req.sessionToken || '', req.user.id]
    );

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

router.delete('/:id', authRequired, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
        return res.status(400).json({ success: false, error: 'ID sesiune invalid.' });
    }

    const sessionResult = await pool.query(
        'SELECT id, session_token FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = 1',
        [sessionId, req.user.id]
    );

    const session = sessionResult.rows[0];
    if (!session) {
        return res.status(404).json({ success: false, error: 'Sesiunea nu a fost gasita.' });
    }

    await pool.query('UPDATE user_sessions SET is_active = 0 WHERE id = $1', [sessionId]);
    notifySessionTerminated(session.session_token);
    res.json({ success: true, message: 'Sesiunea a fost inchisa.' });
});

router.delete('/', authRequired, async (req, res) => {
    const result = await pool.query(
        `UPDATE user_sessions SET is_active = 0
         WHERE user_id = $1 AND is_active = 1
         RETURNING session_token`,
        [req.user.id]
    );

    const tokens = [...new Set(result.rows.map(r => r.session_token).filter(Boolean))];
    tokens.forEach(notifySessionTerminated);

    res.json({ success: true, message: 'Toate sesiunile au fost inchise.' });
});

module.exports = router;
