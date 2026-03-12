/**
 * Auth middleware — validates JWT from Authorization header or session cookie.
 * Attaches req.user on success.
 */

const jwt = require('jsonwebtoken');
const db = require('../db');

function authRequired(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Autentificare necesară.' });
    }

    const JWT_SECRET = req.app.get('JWT_SECRET');

    // Try JWT first
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Utilizator inexistent.' });
        }
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            avatar: user.avatar,
            email_verified: user.email_verified,
            created_at: user.created_at
        };
        return next();
    } catch (jwtErr) {
        // JWT invalid — fall through to session-based auth
    }

    // Fallback: session token from cookie
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
    // 1. Authorization header (Bearer token)
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);

    // 2. Cookie
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

module.exports = { authRequired };
