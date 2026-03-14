/* ─────────────────────────────────────────
   FILE: google-auth.js
   DESCRIPTION: Google OAuth2 authentication via Passport.
   Handles login, registration, account linking/unlinking.
   Uses custom state store to work without express-session.
   ───────────────────────────────────────── */
const express = require('express');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { parseDevice } = require('../utils/device');

const router = express.Router();

const BASE_URL = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * generateToken
 * @description Creates a cryptographically random 64-char hex token.
 */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * setSessionCookie
 * @description Sets the cn_session_token HTTP-only cookie.
 */
function setSessionCookie(res, token) {
    const isProd = process.env.NODE_ENV === 'production' || String(process.env.BASE_URL || '').startsWith('https://');
    res.cookie('cn_session_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/'
    });
}

/**
 * sanitizeUser
 * @description Returns a safe user object (no password hash) for API responses.
 */
function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        avatar_url: user.avatar_url || '',
        favorite_consoles: user.favorite_consoles || '',
        owned_consoles: user.owned_consoles || '',
        email_verified: !!user.email_verified,
        two_factor_enabled: !!user.two_factor_enabled,
        two_factor_method: user.two_factor_method || null,
        two_factor_totp_enabled: !!user.two_factor_totp_enabled,
        two_factor_email_enabled: !!user.two_factor_email_enabled,
        google_linked: !!user.google_id,
        has_password: !!user.password_hash,
        created_at: user.created_at
    };
}

// Configure Passport Google Strategy (only if credentials are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: BASE_URL() + '/api/auth/google/callback',
        // Custom state store: needed because we don’t use express-session
        store: {
            store: function(req, meta, cb) {
                if (typeof meta === 'function') { cb = meta; }
                cb(null, crypto.randomBytes(16).toString('hex'));
            },
            verify: function(req, providedState, meta, cb) {
                if (typeof meta === 'function') { cb = meta; }
                cb(null, true);
            }
        }
    }, (accessToken, refreshToken, profile, done) => {
        done(null, profile);
    }));

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    console.log('Google OAuth strategy configured');
} else {
    console.warn('Warning: GOOGLE_CLIENT_ID/SECRET not set — Google OAuth disabled.');
}

// GET /api/auth/google — Redirect to Google consent screen
router.get('/google', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'Google OAuth nu este configurat.' });
    }

    // If link_token is provided, store user ID in cookie for link mode
    const linkToken = req.query.link_token;
    if (linkToken) {
        try {
            const JWT_SECRET = req.app.get('JWT_SECRET');
            const decoded = jwt.verify(linkToken, JWT_SECRET);
            res.cookie('google_link_user', String(decoded.userId), {
                httpOnly: true,
                maxAge: 5 * 60 * 1000,
                sameSite: 'lax'
            });
        } catch { /* invalid token, proceed as login */ }
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
    })(req, res, next);
});

// GET /api/auth/google/callback — Handle Google callback
router.get('/google/callback',
    (req, res, next) => {
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.redirect('/html/pages/login.html?error=google_not_configured');
        }
        passport.authenticate('google', {
            session: false,
            failureRedirect: '/html/pages/login.html?error=google_failed'
        })(req, res, next);
    },
    async (req, res) => {
        try {
            const profile = req.user;
            const googleId = profile.id;
            const email = (profile.emails && profile.emails[0]?.value || '').toLowerCase().trim();
            const displayName = profile.displayName || email.split('@')[0];
            const avatarUrl = (profile.photos && profile.photos[0]?.value) || '';

            const JWT_SECRET = req.app.get('JWT_SECRET');
            const linkUserId = req.cookies?.google_link_user;
            res.clearCookie('google_link_user');

            // ─── Link mode: connect Google to existing account ───
            if (linkUserId) {
                const userId = parseInt(linkUserId, 10);
                if (isNaN(userId)) {
                    return res.redirect('/html/pages/profil.html?error=invalid_link#setari');
                }

                // DB: check if this google_id is already linked to another account
                const existingGoogle = await pool.query(
                    'SELECT id FROM users WHERE google_id = $1 AND id != $2',
                    [googleId, userId]
                );
                if (existingGoogle.rows[0]) {
                    return res.redirect('/html/pages/profil.html?error=google_already_linked#setari');
                }

                await pool.query(
                    'UPDATE users SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
                    [googleId, avatarUrl, userId]
                );
                return res.redirect('/html/pages/profil.html?google_linked=1#setari');
            }

            // ─── Login mode: find user by google_id ───
            let userResult = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
            let user = userResult.rows[0];

            if (!user && email) {
                // DB: auto-link if email already exists (Google verifies email ownership)
                userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
                user = userResult.rows[0];
                if (user) {
                    await pool.query(
                        'UPDATE users SET google_id = $1, avatar_url = $2, email_verified = TRUE, updated_at = NOW() WHERE id = $3',
                        [googleId, avatarUrl, user.id]
                    );
                    user.google_id = googleId;
                    user.avatar_url = avatarUrl;
                    user.email_verified = true;
                }
            }

            if (!user) {
                // DB: register new user (Google emails are pre-verified)
                const insertResult = await pool.query(
                    `INSERT INTO users (username, email, password_hash, google_id, avatar_url, email_verified)
                     VALUES ($1, $2, NULL, $3, $4, TRUE) RETURNING *`,
                    [displayName, email, googleId, avatarUrl]
                );
                user = insertResult.rows[0];
            }

            // Create session
            const deviceInfo = parseDevice(req);
            const sessionToken = generateToken();
            await pool.query(
                'INSERT INTO user_sessions (user_id, session_token, device_type, browser, operating_system, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
                [user.id, sessionToken, deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os, deviceInfo.ip]
            );

            setSessionCookie(res, sessionToken);

            const jwtToken = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Redirect with tokens encoded as base64 JSON in the URL hash
            // The frontend captures this on page load to store auth tokens
            const tokenData = Buffer.from(JSON.stringify({
                token: jwtToken,
                session_token: sessionToken,
                user: sanitizeUser(user)
            })).toString('base64');

            res.redirect('/html/pages/login.html#google_auth=' + tokenData);
        } catch (err) {
            console.error('Google auth error:', err);
            res.redirect('/html/pages/login.html?error=google_auth_failed');
        }
    }
);

// DELETE /api/auth/google/unlink — Remove Google from account (password required first)
router.delete('/google/unlink', authRequired, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, password_hash, google_id FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        if (!user?.google_id) {
            return res.status(400).json({ success: false, error: 'Contul nu este conectat cu Google.' });
        }
        if (!user.password_hash) {
            return res.status(400).json({ success: false, error: 'Seteaza o parola inainte de a deconecta Google.' });
        }

        await pool.query('UPDATE users SET google_id = NULL, updated_at = NOW() WHERE id = $1', [req.user.id]);
        res.json({ success: true, message: 'Google a fost deconectat.' });
    } catch (err) {
        console.error('Google unlink error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
