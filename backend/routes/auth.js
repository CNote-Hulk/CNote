/* ─────────────────────────────────────────
   FILE: auth.js
   DESCRIPTION: Core authentication routes. Registration,
   login (with 2FA support), email verification, password
   reset, profile management, and two-factor setup.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { parseDevice } = require('../utils/device');
const emailService = require('../services/email');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;

/* ── Helper functions ── */

/** Generate a random 64-char hex token */
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * findOrCreateSession
 * @description Finds an existing active session for the same user + stable browser + stable OS + device type.
 *              If found, reuses it (updates last_activity + metadata). Otherwise creates a new one.
 * @returns {string} session_token
 */
async function findOrCreateSession(userId, deviceInfo) {
    // Reuse the same session for the same device family, even if IP or app version changed.
    const existing = await pool.query(
        `SELECT id, session_token FROM user_sessions
         WHERE user_id = $1
           AND device_type = $2
           AND browser ILIKE ($3 || '%')
           AND operating_system ILIKE ($4 || '%')
           AND is_active = true
         ORDER BY last_activity DESC NULLS LAST
         LIMIT 1`,
        [
            userId,
            deviceInfo.deviceType,
            deviceInfo.browserStable || deviceInfo.browser || 'Unknown',
            deviceInfo.osStable || deviceInfo.os || 'Unknown'
        ]
    );

    if (existing.rows.length > 0) {
        // Refresh metadata so the UI keeps latest browser version/IP while preserving the same session.
        await pool.query(
            `UPDATE user_sessions
             SET last_activity = NOW(),
                 browser = $2,
                 operating_system = $3,
                 ip_address = $4
             WHERE id = $1`,
            [existing.rows[0].id, deviceInfo.browser, deviceInfo.os, deviceInfo.ip]
        );
        return existing.rows[0].session_token;
    }

    // No matching session — create a new one
    const sessionToken = generateToken();
    await pool.query(
        'INSERT INTO user_sessions (user_id, session_token, device_type, browser, operating_system, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, sessionToken, deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os, deviceInfo.ip]
    );
    return sessionToken;
}

/** Calculate expiry date N hours from now */
function expiresAt(hours = TOKEN_EXPIRY_HOURS) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

/* ── Trusted Device helpers ── */
const TRUSTED_DEVICE_DAYS = 30;

/** Build a SHA-256 hash from browser name + OS name + device type + IP.
 *  Browser/OS versions are ignored so auto-updates do not force new 2FA,
 *  while IP remains part of the trust decision as requested. */
function buildDeviceHash(deviceInfo) {
    const raw = [
        deviceInfo.browserStable || deviceInfo.browser,
        deviceInfo.osStable || deviceInfo.os,
        deviceInfo.deviceType || 'desktop',
        deviceInfo.ip || ''
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Check if a device is trusted for a given user (not expired) */
async function isDeviceTrusted(userId, deviceInfo) {
    const hash = buildDeviceHash(deviceInfo);
    const result = await pool.query(
        `SELECT id FROM trusted_devices
         WHERE user_id = $1 AND device_hash = $2 AND expires_at > NOW()
         LIMIT 1`,
        [userId, hash]
    );
    if (result.rows.length > 0) {
        // Update last_used
        await pool.query('UPDATE trusted_devices SET last_used = NOW() WHERE id = $1', [result.rows[0].id]);
        return true;
    }
    return false;
}

/** Save a device as trusted for a user */
async function trustDevice(userId, deviceInfo) {
    const hash = buildDeviceHash(deviceInfo);
    const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await pool.query(
        `INSERT INTO trusted_devices (user_id, device_hash, browser, operating_system, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, device_hash) DO UPDATE SET last_used = NOW(), expires_at = $6`,
        [userId, hash, deviceInfo.browser, deviceInfo.os, deviceInfo.ip, expiresAt]
    );
}

/** Set HttpOnly session cookie (secure in production) */
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

/** Clear session cookie on logout */
function clearSessionCookie(res) {
    const isProd = process.env.NODE_ENV === 'production' || String(process.env.BASE_URL || '').startsWith('https://');
    res.clearCookie('cn_session_token', {
        path: '/',
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
}

/** Return user object safe for API responses (no password hash) */
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
        role: user.role || 'user',
        username_chosen: user.username_chosen !== false,
        created_at: user.created_at,
        notify_new_friend: user.notify_new_friend !== false,
        notify_new_message: user.notify_new_message !== false,
        notify_repair_reply: user.notify_repair_reply !== false,
        social_discord: user.social_discord || '',
        social_twitter: user.social_twitter || '',
        social_youtube: user.social_youtube || '',
        social_instagram: user.social_instagram || '',
        show_email: !!user.show_email,
        show_stats: user.show_stats !== false,
        show_friends: user.show_friends !== false,
        show_social_links: user.show_social_links !== false
    };
}

/* ── Routes ── */

// GET /api/check-username — Check if a username is available
router.get('/check-username', async (req, res) => {
    try {
        const username = String(req.query.username || '').trim();
        if (username.length < 3) {
            return res.json({ available: false });
        }
        const result = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        res.json({ available: !result.rows[0] });
    } catch (err) {
        console.error('Check username error:', err);
        res.status(500).json({ available: false });
    }
});

// POST /api/setup-username — First-time username selection (e.g. after Google OAuth)
router.post('/setup-username', authRequired, async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();

        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters.' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
        }

        // Check current user hasn't already chosen a username
        const current = await pool.query('SELECT username_chosen FROM users WHERE id = $1', [req.user.id]);
        if (current.rows[0]?.username_chosen) {
            return res.status(400).json({ success: false, error: 'Username already set.' });
        }

        // Check uniqueness
        const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', [username, req.user.id]);
        if (existing.rows[0]) {
            return res.status(409).json({ success: false, error: 'Username is already taken. Choose another one.' });
        }

        // Determine role: admin if username or email matches
        const isAdmin = username === 'AndreiHulk07' || (req.user.email && ['console.notebook.app@gmail.com', 'andreihlc2007@gmail.com'].includes(req.user.email.toLowerCase()));
        const role = isAdmin ? 'admin' : 'user';

        const result = await pool.query(
            'UPDATE users SET username = $1, username_chosen = TRUE, role = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [username, role, req.user.id]
        );

        res.json({ success: true, user: sanitizeUser(result.rows[0]) });
    } catch (err) {
        console.error('Setup username error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/register — Create new account with email verification
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Username validation
        const usernameTrimmed = String(username || '').trim();
        if (usernameTrimmed.length < 3 || usernameTrimmed.length > 20) {
            return res.status(400).json({ success: false, error: 'Username must be between 3 and 20 characters.' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(usernameTrimmed)) {
            return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, and underscores.' });
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Email address is not valid.' });
        }

    // Password strength: min 8 chars, uppercase, lowercase, number, special char
        const pwd = String(password || '');
        if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
            return res.status(400).json({ success: false, error: 'Password must contain at least 8 characters, one uppercase letter, one lowercase letter, a number, and a special character.' });
        }

        const usernameCheck = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [usernameTrimmed]);
        if (usernameCheck.rows[0]) {
            return res.status(409).json({ success: false, error: 'Username is already taken. Choose another one.' });
        }

        const emailLower = email.toLowerCase().trim();
        const existingResult = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
        if (existingResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const verificationToken = generateToken();
        const verificationExpiry = expiresAt();
        const insertResult = await pool.query(
            'INSERT INTO users (username, email, password_hash, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING *',
            [usernameTrimmed, emailLower, passwordHash]
        );

        const user = insertResult.rows[0];
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, verificationToken, verificationExpiry]
        );

        const emailResult = await emailService.sendVerificationEmail(user.email, verificationToken, process.env.BASE_URL);
        const emailSent = emailResult.success;

        res.status(201).json({
            success: true,
            user: sanitizeUser(user),
            emailSent,
            message: emailSent
                ? 'Account created successfully! Check your email to activate your account.'
                : 'Account created, but the verification email could not be sent at this time.'
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: 'Internal error. Please try again.' });
    }
});

// POST /api/login — Authenticate user (supports 2FA: TOTP and email methods)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Please fill in all fields.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
        }

        if (!user.email_verified && !user.google_id) {
            return res.status(403).json({ success: false, error: 'email_not_verified' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ success: false, error: 'This account uses Google for authentication.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
        }

        // Check 2FA
        if (user.two_factor_enabled) {
            // Skip 2FA if this device is already trusted
            const deviceInfo = parseDevice(req);
            const trusted = await isDeviceTrusted(user.id, deviceInfo);
            if (trusted) {
                // Device is trusted — skip 2FA, create session directly
                const sessionToken = await findOrCreateSession(user.id, deviceInfo);
                setSessionCookie(res, sessionToken);
                const JWT_SECRET = req.app.get('JWT_SECRET');
                const jwtToken = jwt.sign(
                    { userId: user.id, email: user.email },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );
                return res.json({
                    success: true,
                    user: sanitizeUser(user),
                    token: jwtToken,
                    session_token: sessionToken
                });
            }

            const JWT_SECRET = req.app.get('JWT_SECRET');
            const tempToken = jwt.sign(
                { userId: user.id, twoFactorPending: true },
                JWT_SECRET,
                { expiresIn: '10m' }
            );

            // Determine primary method: TOTP is primary if enabled, else email
            let method;
            let canFallbackToEmail = false;
            if (user.two_factor_totp_enabled) {
                method = 'totp';
                canFallbackToEmail = !!user.two_factor_email_enabled;
            } else if (user.two_factor_email_enabled) {
                method = 'email';
            } else {
                // Legacy fallback: use two_factor_method
                method = user.two_factor_method || 'email';
            }

            if (method === 'email') {
                const code = String(crypto.randomInt(100000, 999999));
                const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [user.id]);
                await pool.query(
                    'INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
                    [user.id, code, codeExpiry]
                );
                const emailResult = await emailService.sendTwoFactorEmail(user.email, code);
                if (!emailResult.success) console.error('2FA email error:', emailResult.error);
            }

            return res.json({
                success: true,
                twoFactorRequired: true,
                method,
                canFallbackToEmail,
                tempToken
            });
        }

        const deviceInfo = parseDevice(req);
        const sessionToken = await findOrCreateSession(user.id, deviceInfo);

        setSessionCookie(res, sessionToken);

        const JWT_SECRET = req.app.get('JWT_SECRET');
        const jwtToken = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            user: sanitizeUser(user),
            token: jwtToken,
            session_token: sessionToken
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Internal error. Please try again.' });
    }
});

// GET /api/profile — Get current user profile (from auth middleware)
router.get('/profile', authRequired, (req, res) => {
    res.json({ success: true, message: 'User authenticated', user: sanitizeUser(req.user) });
});

// POST /api/logout — Deactivate current session and clear cookie
router.post('/logout', authRequired, async (req, res) => {
    if (req.sessionId) {
        await pool.query('UPDATE user_sessions SET is_active = false WHERE id = $1', [req.sessionId]);
    }
    clearSessionCookie(res);
    res.json({ success: true });
});

// GET /api/verify-email — Verify email via token link (from email)
router.get('/verify-email', async (req, res) => {
    try {
        const token = String(req.query.token || '').trim();
        if (!token) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token.' });
        }

        const rowResult = await pool.query(
            'SELECT * FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
            [token]
        );
        const row = rowResult.rows[0];
        if (!row) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token.' });
        }

        await pool.query('UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1', [row.user_id]);
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [row.user_id]);

        return res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        console.error('Verify email error:', err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/resend-verification — Resend verification email (authenticated)
router.post('/resend-verification', authRequired, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, email, email_verified FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }
        if (user.email_verified) {
            return res.json({ success: true, message: 'Email is already verified.', emailSent: false });
        }

        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

        const token = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt()]
        );

        const emailResult = await emailService.sendVerificationEmail(user.email, token, process.env.BASE_URL);
        if (!emailResult.success) {
            return res.status(500).json({ success: false, error: 'Could not send verification email.' });
        }
        return res.json({ success: true, emailSent: true, message: 'Verification email has been resent.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/resend-verification-public — Resend verification email (unauthenticated, by email)
router.post('/resend-verification-public', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }

        const userResult = await pool.query(
            'SELECT id, email, email_verified FROM users WHERE email = $1',
            [email]
        );
        const user = userResult.rows[0];

        if (!user || user.email_verified) {
            return res.json({ success: true, message: 'If an unverified account with this email exists, we have resent the link.' });
        }

        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
        const token = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt()]
        );

        await emailService.sendVerificationEmail(user.email, token, process.env.BASE_URL);
        return res.json({ success: true, message: 'If an unverified account with this email exists, we have resent the link.' });
    } catch (err) {
        console.error('Public resend verification error:', err);
        // Still return success to avoid leaking account existence
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/me — Get current user data (sanitized)
router.get('/me', authRequired, (req, res) => {
    res.json({ success: true, user: sanitizeUser(req.user) });
});

// PUT /api/me — Update profile (username, bio, avatar, favorite_consoles)
router.put('/me', authRequired, async (req, res) => {
    const { username, bio, avatar, favorite_consoles, owned_consoles, notify_new_friend, notify_new_message, notify_repair_reply, social_discord, social_twitter, social_youtube, social_instagram, show_email, show_stats, show_friends, show_social_links } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username !== undefined) {
        const trimmed = String(username).trim();
        if (trimmed.length < 3 || trimmed.length > 20) {
            return res.status(400).json({ success: false, error: 'Username must be 3–20 characters.' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return res.status(400).json({ success: false, error: 'Username may only contain letters, numbers and underscores.' });
        }
        const dup = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2', [trimmed, req.user.id]);
        if (dup.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Username is already taken.' });
        }
        updates.push(`username = $${paramIndex++}`);
        params.push(trimmed);
    }
    if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        params.push(String(bio));
    }
    if (avatar !== undefined) {
        updates.push(`avatar = $${paramIndex++}`);
        params.push(String(avatar));
    }
    if (favorite_consoles !== undefined) {
        updates.push(`favorite_consoles = $${paramIndex++}`);
        params.push(String(favorite_consoles));
    }
    if (owned_consoles !== undefined) {
        updates.push(`owned_consoles = $${paramIndex++}`);
        params.push(String(owned_consoles));
    }
    if (notify_new_friend !== undefined) {
        updates.push(`notify_new_friend = $${paramIndex++}`);
        params.push(!!notify_new_friend);
    }
    if (notify_new_message !== undefined) {
        updates.push(`notify_new_message = $${paramIndex++}`);
        params.push(!!notify_new_message);
    }
    if (notify_repair_reply !== undefined) {
        updates.push(`notify_repair_reply = $${paramIndex++}`);
        params.push(!!notify_repair_reply);
    }
    if (social_discord !== undefined) {
        updates.push(`social_discord = $${paramIndex++}`);
        params.push(String(social_discord));
    }
    if (social_twitter !== undefined) {
        updates.push(`social_twitter = $${paramIndex++}`);
        params.push(String(social_twitter));
    }
    if (social_youtube !== undefined) {
        updates.push(`social_youtube = $${paramIndex++}`);
        params.push(String(social_youtube));
    }
    if (social_instagram !== undefined) {
        updates.push(`social_instagram = $${paramIndex++}`);
        params.push(String(social_instagram));
    }
    if (show_email !== undefined) {
        updates.push(`show_email = $${paramIndex++}`);
        params.push(!!show_email);
    }
    if (show_stats !== undefined) {
        updates.push(`show_stats = $${paramIndex++}`);
        params.push(!!show_stats);
    }
    if (show_friends !== undefined) {
        updates.push(`show_friends = $${paramIndex++}`);
        params.push(!!show_friends);
    }
    if (show_social_links !== undefined) {
        updates.push(`show_social_links = $${paramIndex++}`);
        params.push(!!show_social_links);
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update.' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.user.id);

    try {
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// PUT /api/me/email — Change email address (requires current password)
router.put('/me/email', authRequired, async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, error: 'Email address is not valid.' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Enter your current password to change your email.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Current password is incorrect.' });
        }

        const emailLower = newEmail.toLowerCase().trim();
        if (emailLower === user.email) {
            return res.status(400).json({ success: false, error: 'New email is the same as the current one.' });
        }

        const dupResult = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailLower, req.user.id]);
        if (dupResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
        }

        await pool.query('UPDATE users SET email = $1, email_verified = FALSE, updated_at = NOW() WHERE id = $2', [emailLower, req.user.id]);

        // Send verification email for the new address
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [req.user.id]);
        const verificationToken = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [req.user.id, verificationToken, expiresAt()]
        );
        const vResult = await emailService.sendVerificationEmail(emailLower, verificationToken, process.env.BASE_URL);
        if (!vResult.success) console.error('Verification email after email change failed:', vResult.error);

        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]), message: 'Email changed. Check the new email to confirm it.' });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// PUT /api/me/password — Change password (requires current password)
router.put('/me/password', authRequired, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        // Google-only users can set initial password without current password
        if (!user.password_hash) {
            const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
            return res.json({ success: true, message: 'Password has been set.' });
        }

        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Enter your current password.' });
        }

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Current password is incorrect.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/account/set-password — Set initial password (for Google-only accounts)
router.post('/account/set-password', authRequired, async (req, res) => {
    try {
        const { password, confirmPassword } = req.body || {};

        const userResult = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (user.password_hash) {
            return res.status(400).json({ success: false, error: 'You already have a password set. Use the change password option.' });
        }

        if (!password || String(password).length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'Passwords do not match.' });
        }

        const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

        res.json({ success: true, message: 'Password has been set successfully.' });
    } catch (err) {
        console.error('Set password error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// DELETE /api/account — Permanently delete account and all related data
router.delete('/account', authRequired, async (req, res) => {
    const client = await pool.connect();
    try {
        const { password, confirmText } = req.body || {};

        const userResult = await client.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (user.password_hash) {
            if (!password) {
                return res.status(400).json({ success: false, error: 'Password is required.' });
            }
            const valid = await bcrypt.compare(String(password), user.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }
        } else {
            if (confirmText !== 'STERGE') {
                return res.status(400).json({ success: false, error: 'Type DELETE to confirm.' });
            }
        }

        await client.query('BEGIN');

        // Ordered cleanup to avoid FK errors.
        await client.query('DELETE FROM user_sessions WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM user_favorites WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM user_owned_consoles WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM friends WHERE user1_id = $1 OR user2_id = $1', [req.user.id]);
        await client.query('DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1', [req.user.id]);
        await client.query('DELETE FROM console_ratings WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM messages WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM two_factor_codes WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);

        await client.query('COMMIT');
        clearSessionCookie(res);
        return res.json({ success: true });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { }
        console.error('Delete account error:', err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    } finally {
        client.release();
    }
});

// POST /api/request-reset — Request password reset (sends email with token)
router.post('/request-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = userResult.rows[0];

        if (!user) {
            return res.json({ success: true, message: 'If an account with this email exists, you will receive a reset link.' });
        }

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        const token = generateToken();
        await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt()]);

        emailService.sendPasswordResetEmail(user.email, token, process.env.BASE_URL).then(result => {
            if (!result.success) console.error('Failed to send reset email:', result.error);
        });

        res.json({ success: true, message: 'If an account with this email exists, you will receive a reset link.' });
    } catch (err) {
        console.error('Request reset error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/reset-password — Reset password using token from email
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'Missing token.' });
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
        }

        const rowResult = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
        const row = rowResult.rows[0];
        if (!row) {
            return res.status(400).json({ success: false, error: 'Invalid or expired token.' });
        }

        if (new Date(row.expires_at) < new Date()) {
            await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
            return res.status(400).json({ success: false, error: 'Token has expired. Request a new link.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, row.user_id]);

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [row.user_id]);
        await pool.query('UPDATE user_sessions SET is_active = false WHERE user_id = $1', [row.user_id]);

        res.json({ success: true, message: 'Password has been reset. You can now log in with your new password.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ─── Two-Factor Authentication Routes ───────────────────

/* ── Two-Factor Authentication (2FA) ── */

// POST /api/2fa/verify — Verify 2FA code during login (TOTP or email)
router.post('/2fa/verify', async (req, res) => {
    try {
        // Accept tempToken from Authorization header OR request body
        const authHeader = req.headers.authorization;
        const tempToken = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.body?.tempToken;

        if (!tempToken) {
            return res.status(401).json({ success: false, error: 'Missing token.' });
        }
        const JWT_SECRET = req.app.get('JWT_SECRET');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, error: 'Session has expired. Please log in again.' });
        }

        if (!decoded.twoFactorPending) {
            return res.status(400).json({ success: false, error: 'Token invalid.' });
        }

        const { code, method: requestedMethod } = req.body || {};
        if (!code || String(code).trim().length !== 6) {
            return res.status(400).json({ success: false, error: 'Code must be 6 digits.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found.' });
        }

        const cleanCode = String(code).trim();

        // Determine which method to verify: use requested method if valid, else detect
        let verifyMethod = requestedMethod;
        if (!verifyMethod || (verifyMethod !== 'email' && verifyMethod !== 'totp')) {
            // Auto-detect: if user has totp enabled and no explicit email request, use totp
            if (user.two_factor_totp_enabled) {
                verifyMethod = 'totp';
            } else if (user.two_factor_email_enabled) {
                verifyMethod = 'email';
            } else {
                // Legacy fallback
                verifyMethod = user.two_factor_method || 'email';
            }
        }

        if (verifyMethod === 'email') {
            const codeResult = await pool.query(
                'SELECT * FROM two_factor_codes WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
                [user.id, cleanCode]
            );
            if (!codeResult.rows[0]) {
                return res.status(401).json({ success: false, error: 'Invalid or expired code.' });
            }
            await pool.query('UPDATE two_factor_codes SET used = TRUE WHERE id = $1', [codeResult.rows[0].id]);
        } else if (verifyMethod === 'totp') {
            const speakeasy = require('speakeasy');
            const isValid = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: cleanCode,
                window: 1
            });
            if (!isValid) {
                return res.status(401).json({ success: false, error: 'Invalid code.' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'Unknown 2FA method.' });
        }

        // 2FA verified — create real session
        const deviceInfo = parseDevice(req);
        const sessionToken = await findOrCreateSession(user.id, deviceInfo);

        // If user asked to trust this device, save it
        if (req.body.trustDevice) {
            await trustDevice(user.id, deviceInfo);
        }

        setSessionCookie(res, sessionToken);

        const jwtToken = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            user: sanitizeUser(user),
            token: jwtToken,
            session_token: sessionToken
        });
    } catch (err) {
        console.error('2FA verify error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/2fa/fallback-email — Send 2FA code via email when TOTP unavailable
router.post('/2fa/fallback-email', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const tempToken = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.body?.tempToken;

        if (!tempToken) {
            return res.status(401).json({ success: false, error: 'Missing token.' });
        }
        const JWT_SECRET = req.app.get('JWT_SECRET');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, error: 'Session has expired. Please log in again.' });
        }

        if (!decoded.twoFactorPending) {
            return res.status(400).json({ success: false, error: 'Token invalid.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found.' });
        }

        if (!user.two_factor_email_enabled) {
            return res.status(400).json({ success: false, error: 'Email 2FA is not enabled.' });
        }

        const code = String(crypto.randomInt(100000, 999999));
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [user.id]);
        await pool.query(
            'INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
            [user.id, code, codeExpiry]
        );
        const fallbackResult = await emailService.sendTwoFactorEmail(user.email, code);
        if (!fallbackResult.success) {
            console.error('2FA fallback email error:', fallbackResult.error);
            return res.status(500).json({ success: false, error: 'Could not send the email.' });
        }

        res.json({ success: true, message: 'Code has been sent to your email.' });
    } catch (err) {
        console.error('2FA fallback-email error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/2fa/setup/totp — Generate TOTP secret + QR code for setup
router.post('/2fa/setup/totp', authRequired, async (req, res) => {
    try {
        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');

        const secret = speakeasy.generateSecret({
            name: 'Cnote Bakery (' + req.user.email + ')',
            issuer: 'Cnote Bakery'
        });

        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            secret: secret.base32,
            qrCode
        });
    } catch (err) {
        console.error('TOTP setup error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/2fa/setup/totp/confirm — Confirm TOTP setup with verification code
router.post('/2fa/setup/totp/confirm', authRequired, async (req, res) => {
    try {
        const { code, secret } = req.body || {};
        console.log('TOTP confirm req.body:', { code: code ? '***' : undefined, secret: secret ? '(set)' : undefined });
        if (!code || !secret) {
            return res.status(400).json({ success: false, error: 'Code and secret are required.' });
        }

        const speakeasy = require('speakeasy');
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: String(code).trim(),
            window: 1
        });

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Code is not valid. Try again.' });
        }

        await pool.query(
            'UPDATE users SET two_factor_enabled = TRUE, two_factor_method = $1, two_factor_secret = $2, two_factor_totp_enabled = TRUE, updated_at = NOW() WHERE id = $3',
            ['totp', secret, req.user.id]
        );

        res.json({ success: true, message: 'Authenticator 2FA has been enabled.' });
    } catch (err) {
        console.error('TOTP confirm error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// POST /api/2fa/setup/email — Enable email-based 2FA
router.post('/2fa/setup/email', authRequired, async (req, res) => {
    try {
        // Determine method: if totp is also enabled, keep method as totp (primary)
        const userResult = await pool.query('SELECT two_factor_totp_enabled FROM users WHERE id = $1', [req.user.id]);
        const hasTotp = userResult.rows[0]?.two_factor_totp_enabled;
        const method = hasTotp ? 'totp' : 'email';

        await pool.query(
            'UPDATE users SET two_factor_enabled = TRUE, two_factor_method = $1, two_factor_email_enabled = TRUE, updated_at = NOW() WHERE id = $2',
            [method, req.user.id]
        );
        res.json({ success: true, message: 'Email 2FA has been enabled.' });
    } catch (err) {
        console.error('Email 2FA setup error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// DELETE /api/2fa/disable — Disable all 2FA methods (requires password)
router.delete('/2fa/disable', authRequired, async (req, res) => {
    try {
        const { password, method } = req.body || {};

        const userResult = await pool.query('SELECT id, password_hash, two_factor_totp_enabled, two_factor_email_enabled FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        if (user.password_hash) {
            if (!password) {
                return res.status(400).json({ success: false, error: 'Password is required.' });
            }
            const valid = await bcrypt.compare(String(password), user.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Incorrect password.' });
            }
        }

        if (method === 'totp') {
            // Disable only TOTP
            const stillHasEmail = !!user.two_factor_email_enabled;
            await pool.query(
                'UPDATE users SET two_factor_totp_enabled = FALSE, two_factor_secret = NULL, two_factor_enabled = $1, two_factor_method = $2, updated_at = NOW() WHERE id = $3',
                [stillHasEmail, stillHasEmail ? 'email' : null, req.user.id]
            );
            res.json({ success: true, message: 'Authenticator 2FA has been disabled.' });
        } else if (method === 'email') {
            // Disable only email
            const stillHasTotp = !!user.two_factor_totp_enabled;
            await pool.query(
                'UPDATE users SET two_factor_email_enabled = FALSE, two_factor_enabled = $1, two_factor_method = $2, updated_at = NOW() WHERE id = $3',
                [stillHasTotp, stillHasTotp ? 'totp' : null, req.user.id]
            );
            await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [req.user.id]);
            res.json({ success: true, message: 'Email 2FA has been disabled.' });
        } else {
            // Disable all
            await pool.query(
                'UPDATE users SET two_factor_enabled = FALSE, two_factor_method = NULL, two_factor_secret = NULL, two_factor_totp_enabled = FALSE, two_factor_email_enabled = FALSE, updated_at = NOW() WHERE id = $1',
                [req.user.id]
            );
            await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [req.user.id]);
            await pool.query('DELETE FROM trusted_devices WHERE user_id = $1', [req.user.id]);
            res.json({ success: true, message: '2FA has been completely disabled.' });
        }
    } catch (err) {
        console.error('2FA disable error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// GET /api/trusted-devices — List all trusted devices for the current user
router.get('/trusted-devices', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, browser, operating_system, ip_address, created_at, last_used, expires_at
             FROM trusted_devices
             WHERE user_id = $1 AND expires_at > NOW()
             ORDER BY last_used DESC`,
            [req.user.id]
        );
        res.json({ success: true, devices: result.rows });
    } catch (err) {
        console.error('List trusted devices error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// DELETE /api/trusted-devices/:id — Revoke a specific trusted device
router.delete('/trusted-devices/:id', authRequired, async (req, res) => {
    try {
        const deviceId = parseInt(req.params.id, 10);
        if (isNaN(deviceId)) {
            return res.status(400).json({ success: false, error: 'Invalid device ID.' });
        }
        await pool.query(
            'DELETE FROM trusted_devices WHERE id = $1 AND user_id = $2',
            [deviceId, req.user.id]
        );
        res.json({ success: true, message: 'Device has been revoked.' });
    } catch (err) {
        console.error('Revoke trusted device error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// DELETE /api/trusted-devices — Revoke all trusted devices for the current user
router.delete('/trusted-devices', authRequired, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM trusted_devices WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true, message: 'All trusted devices have been revoked.' });
    } catch (err) {
        console.error('Revoke all trusted devices error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

router.findOrCreateSession = findOrCreateSession;
module.exports = router;
