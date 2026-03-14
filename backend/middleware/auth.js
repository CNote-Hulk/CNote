/* ─────────────────────────────────────────
   FILE: auth.js
   DESCRIPTION: Authentication middleware. Validates JWT from
   Authorization header, falls back to session cookie lookup.
   Attaches user object and session info to req.
   ───────────────────────────────────────── */

const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * authRequired
 * @description Express middleware that authenticates requests.
 *              Strategy: try JWT verification first; if that fails,
 *              fall back to session_token lookup in user_sessions table.
 *              On success, attaches req.user, req.sessionId, req.sessionToken.
 */
async function authRequired(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: 'Autentificare necesara.' });
    }

    const JWT_SECRET = req.app.get('JWT_SECRET');

    try {
        // Strategy 1: verify JWT from Authorization header
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
            two_factor_totp_enabled: user.two_factor_totp_enabled,
            two_factor_email_enabled: user.two_factor_email_enabled,
            google_id: user.google_id,
            avatar_url: user.avatar_url,
            password_hash: user.password_hash,
            created_at: user.created_at
        };
        return next();
    } catch (jwtErr) {
    }

    // Strategy 2: fall back to session token lookup in DB
    let sessionResult;
    try {
        // DB: join user_sessions with users where session is still active
        sessionResult = await pool.query(`
        SELECT s.id AS session_id, s.user_id, u.id, u.username, u.email, u.bio, u.avatar,
               u.favorite_consoles, u.owned_consoles,
               u.email_verified, u.two_factor_enabled, u.two_factor_method,
               u.two_factor_secret, u.two_factor_totp_enabled, u.two_factor_email_enabled,
               u.google_id, u.avatar_url, u.password_hash,
               u.created_at
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.session_token = $1 AND s.is_active = true
        `, [token]);
    } catch (dbErr) {
        console.error('Auth session DB error:', dbErr);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }

    const session = sessionResult.rows[0];
    if (!session) {
        return res.status(401).json({ success: false, error: 'Sesiune invalida sau expirata.' });
    }

    // DB: update last_activity timestamp for this session
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
        two_factor_totp_enabled: session.two_factor_totp_enabled,
        two_factor_email_enabled: session.two_factor_email_enabled,
        google_id: session.google_id,
        avatar_url: session.avatar_url,
        password_hash: session.password_hash,
        created_at: session.created_at
    };
    req.sessionId = session.session_id;
    req.sessionToken = token;
    next();
}

/**
 * extractToken
 * @description Extracts auth token from: 1) Authorization: Bearer header,
 *              2) cn_session_token cookie, 3) ?token= query param.
 */
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

/**
 * parseCookies
 * @description Manual cookie string parser (avoids library dependency).
 */
function parseCookies(cookieStr) {
    const result = {};
    cookieStr.split(';').forEach(pair => {
        const [key, ...vals] = pair.trim().split('=');
        if (key) result[key.trim()] = decodeURIComponent(vals.join('='));
    });
    return result;
}

/**
 * authOptional
 * @description Like authRequired, but does NOT return 401 if no token.
 *              If token is present and valid, attaches req.user.
 *              If missing or invalid, req.user stays undefined and request continues.
 */
async function authOptional(req, res, next) {
    const token = extractToken(req);
    if (!token) return next();

    const JWT_SECRET = req.app.get('JWT_SECRET');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        if (userResult.rows[0]) {
            req.user = { id: userResult.rows[0].id, username: userResult.rows[0].username };
        }
        return next();
    } catch {}

    try {
        const sessionResult = await pool.query(`
            SELECT s.user_id, u.username FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.session_token = $1 AND s.is_active = true
        `, [token]);
        if (sessionResult.rows[0]) {
            req.user = { id: sessionResult.rows[0].user_id, username: sessionResult.rows[0].username };
        }
    } catch {}

    next();
}

module.exports = { authRequired, authOptional };
