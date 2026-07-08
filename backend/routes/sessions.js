/* ─────────────────────────────────────────
   FILE: sessions.js
   DESCRIPTION: Session management and Server-Sent Events (SSE)
   for real-time session termination notifications.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const sseClientsBySessionToken = new Map(); // tokenHash → Set of SSE clients

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * currentSessionHash
 * @description Resolves the caller's own session-token hash. JWT-authenticated
 *              clients (the Android app, or the site when JWT wins in authRequired)
 *              never get req.sessionToken populated, so they can identify their own
 *              session row via the X-Session-Token header instead.
 */
function currentSessionHash(req) {
    if (req.sessionToken) return hashToken(req.sessionToken);
    const headerToken = req.headers['x-session-token'];
    if (typeof headerToken === 'string' && headerToken.trim()) {
        return hashToken(headerToken.trim());
    }
    return '';
}

/**
 * registerSseClient
 * @description Adds an SSE client connection to the tracking map.
 * @param {string} sessionToken
 * @param {{ res: import('express').Response, heartbeat: NodeJS.Timeout }} client
 */
function registerSseClient(sessionToken, client) {
    const set = sseClientsBySessionToken.get(sessionToken) || new Set();
    set.add(client);
    sseClientsBySessionToken.set(sessionToken, set);
}

/**
 * unregisterSseClient
 * @description Removes an SSE client and cleans up empty sets.
 */
function unregisterSseClient(sessionToken, client) {
    const set = sseClientsBySessionToken.get(sessionToken);
    if (!set) return;
    set.delete(client);
    if (set.size === 0) {
        sseClientsBySessionToken.delete(sessionToken);
    }
}

/**
 * notifySessionTerminated
 * @description Broadcasts a session_terminated event to all SSE clients
 *              listening on the given session token.
 */
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

// GET /api/sessions/events — SSE endpoint for real-time session termination alerts
router.get('/events', authRequired, async (req, res) => {
    const rawToken = req.sessionToken || (typeof req.query.token === 'string' ? req.query.token.trim() : '');
    if (!rawToken) {
        return res.status(401).json({ success: false, error: 'Sesiune invalida.' });
    }
    const sessionToken = hashToken(rawToken);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(': connected\n\n');

    // Heartbeat every 30s to keep connection alive
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

// GET /api/sessions — List all active sessions for current user
router.get('/', authRequired, async (req, res) => {
    // DB: fetch active sessions, flagging the current one via is_current
    const result = await pool.query(
        `SELECT id, device_type, browser, operating_system, ip_address, country,
                login_time, last_activity, is_active,
                (session_token = $1)::int AS is_current
         FROM user_sessions
         WHERE user_id = $2 AND is_active = true
         ORDER BY last_activity DESC`,
        [currentSessionHash(req), req.user.id]
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

// DELETE /api/sessions/:id — Terminate a specific session
router.delete('/:id', authRequired, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (isNaN(sessionId)) {
        return res.status(400).json({ success: false, error: 'ID sesiune invalid.' });
    }

    const sessionResult = await pool.query(
        'SELECT id, session_token FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = true',
        [sessionId, req.user.id]
    );

    const session = sessionResult.rows[0];
    if (!session) {
        return res.status(404).json({ success: false, error: 'Sesiunea nu a fost gasita.' });
    }

    // DB: deactivate session and notify via SSE
    await pool.query('UPDATE user_sessions SET is_active = false WHERE id = $1', [sessionId]);
    notifySessionTerminated(session.session_token);
    res.json({ success: true, message: 'Sesiunea a fost inchisa.' });
});

// DELETE /api/sessions — Terminate all active sessions for current user.
// When the caller identifies its own session via the X-Session-Token header
// (JWT clients — the Android app), that session is kept alive so the action
// means "log out from all OTHER devices", matching the button label.
// Cookie-based callers keep the old terminate-everything behavior.
router.delete('/', authRequired, async (req, res) => {
    const keepHash = req.headers['x-session-token'] ? currentSessionHash(req) : '';

    // DB: deactivate all active sessions and collect their tokens
    const result = await pool.query(
        `UPDATE user_sessions SET is_active = false
         WHERE user_id = $1 AND is_active = true AND session_token <> $2
         RETURNING session_token`,
        [req.user.id, keepHash]
    );

    const tokens = [...new Set(result.rows.map(r => r.session_token).filter(Boolean))];
    tokens.forEach(notifySessionTerminated);

    res.json({ success: true, message: 'Toate sesiunile au fost inchise.' });
});

module.exports = router;
