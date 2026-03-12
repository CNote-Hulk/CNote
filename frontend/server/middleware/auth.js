/**
 * Auth middleware — validates session token from cookie or Authorization header.
 * Attaches req.user and req.sessionId on success.
 */

const db = require('../db');

function authRequired(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Autentificare necesară.' });
    }

    const session = db.prepare(`
        SELECT s.id AS session_id, s.user_id, u.id, u.username, u.email, u.bio, u.avatar,
               u.email_verified, u.created_at
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token = ? AND s.is_active = 1
    `).get(token);

    if (!session) {
        return res.status(401).json({ success: false, error: 'Sesiune invalidă sau expirată.' });
    }

    // Update last_activity
    db.prepare(`UPDATE user_sessions SET last_activity = datetime('now') WHERE id = ?`)
      .run(session.session_id);

    req.user = {
        id: session.user_id,
        username: session.username,
        email: session.email,
        bio: session.bio,
        avatar: session.avatar,
        email_verified: session.email_verified,
        created_at: session.created_at
    };
    req.sessionId = session.session_id;
    req.sessionToken = token;
    next();
}

function extractToken(req) {
    // 1. Cookie
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies['cn_session_token']) return cookies['cn_session_token'];

    // 2. Authorization header
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);

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

module.exports = { authRequired };
