/**
 * Auth middleware - validates JWT from Authorization header or session cookie.
 */

const jwt = require('jsonwebtoken');
const pool = require('../db');

async function authRequired(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Autentificare necesara.' });
    }

    const JWT_SECRET = req.app.get('JWT_SECRET');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Utilizator inexistent.' });
        }
        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            bio: user.bio,
            avatar: user.avatar,
            favorite_consoles: user.favorite_consoles,
            owned_consoles: user.owned_consoles,
            email_verified: user.email_verified,
            two_factor_enabled: user.two_factor_enabled,
            two_factor_method: user.two_factor_method,
            two_factor_secret: user.two_factor_secret,
            google_id: user.google_id,
            avatar_url: user.avatar_url,
            password_hash: user.password_hash,
            created_at: user.created_at
        };
        return next();
    } catch (jwtErr) {
    }

    let sessionResult;
    try {
        sessionResult = await pool.query(`
        SELECT s.id AS session_id, s.user_id, u.id, u.username, u.email, u.bio, u.avatar,
               u.favorite_consoles, u.owned_consoles,
               u.email_verified, u.two_factor_enabled, u.two_factor_method,
               u.two_factor_secret, u.google_id, u.avatar_url, u.password_hash,
               u.created_at
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token = $1 AND s.is_active = 1
        `, [token]);
    } catch (dbErr) {
        console.error('Auth session DB error:', dbErr);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }

    const session = sessionResult.rows[0];
    if (!session) {
        return res.status(401).json({ success: false, error: 'Sesiune invalida sau expirata.' });
    }

    await pool.query('UPDATE user_sessions SET last_activity = NOW() WHERE id = $1', [session.session_id]);

    req.user = {
        id: session.user_id,
        username: session.username,
        email: session.email,
        bio: session.bio,
        avatar: session.avatar,
        favorite_consoles: session.favorite_consoles,
        owned_consoles: session.owned_consoles,
        email_verified: session.email_verified,
        two_factor_enabled: session.two_factor_enabled,
        two_factor_method: session.two_factor_method,
        two_factor_secret: session.two_factor_secret,
        google_id: session.google_id,
        avatar_url: session.avatar_url,
        password_hash: session.password_hash,
        created_at: session.created_at
    };
    req.sessionId = session.session_id;
    req.sessionToken = token;
    next();
}

function extractToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);

    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies['cn_session_token']) return cookies['cn_session_token'];

    const queryToken = req.query && typeof req.query.token === 'string'
        ? req.query.token.trim()
        : '';
    if (queryToken) return queryToken;

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
