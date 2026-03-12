/**
 * Authentication routes
 *
 * POST /api/register        — Create account (auto-verified)
 * POST /api/login            — Authenticate + create session
 * POST /api/logout           — Invalidate current session
 * GET  /api/me               — Get current user info
 * PUT  /api/me               — Update profile (username, bio, avatar)
 * PUT  /api/me/email         — Change email (requires password)
 * PUT  /api/me/password      — Change password (requires current password)
 * POST /api/request-reset    — Request password reset email
 * POST /api/reset-password   — Reset password with token
 */

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

// ─── Helpers ────────────────────────────────────────────

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function expiresAt(hours = TOKEN_EXPIRY_HOURS) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

function setSessionCookie(res, token) {
    res.cookie('cn_session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/'
    });
}

function clearSessionCookie(res) {
    res.clearCookie('cn_session_token', {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none'
    });
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        email_verified: !!user.email_verified,
        created_at: user.created_at
    };
}

// ─── POST /api/register ─────────────────────────────────

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        console.log('Register attempt:', email);

        // Validation
        if (!username || String(username).trim().length < 1) {
            return res.status(400).json({ success: false, error: 'Numele de utilizator este obligatoriu.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Adresa de email nu este validă.' });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola trebuie să aibă minim 6 caractere.' });
        }

        const emailLower = email.toLowerCase().trim();
        const existingResult = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
        if (existingResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Există deja un cont cu acest email.' });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const insertResult = await pool.query(`
            INSERT INTO users (username, email, password_hash, email_verified)
            VALUES ($1, $2, $3, 1) RETURNING *
        `, [String(username).trim(), emailLower, passwordHash]);

        const user = insertResult.rows[0];
        console.log('User registered:', emailLower);

        res.status(201).json({
            success: true,
            user: sanitizeUser(user),
            message: 'Cont creat cu succes! Te poți autentifica acum.'
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă. Încearcă din nou.' });
    }
});

// ─── POST /api/login ────────────────────────────────────

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Completează toate câmpurile.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = userResult.rows[0];
        console.log('User found:', !!user);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Email sau parolă incorectă.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Email sau parolă incorectă.' });
        }

        // Parse device info
        const deviceInfo = parseDevice(req);

        // Create session
        const sessionToken = generateToken();
        await pool.query(`
            INSERT INTO user_sessions (user_id, session_token, device_type, browser, operating_system, ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [user.id, sessionToken, deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os, deviceInfo.ip]);

        setSessionCookie(res, sessionToken);
        console.log('Login successful:', email);

        // Generate JWT
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
        res.status(500).json({ success: false, error: 'Eroare internă. Încearcă din nou.' });
    }
});

// ─── GET /api/profile ───────────────────────────────────

router.get('/profile', authRequired, (req, res) => {
    res.json({
        success: true,
        message: 'User authenticated',
        user: sanitizeUser(req.user)
    });
});

// ─── POST /api/logout ───────────────────────────────────

router.post('/logout', authRequired, async (req, res) => {
    if (req.sessionId) {
        await pool.query('UPDATE user_sessions SET is_active = 0 WHERE id = $1', [req.sessionId]);
    }
    clearSessionCookie(res);
    res.json({ success: true });
});

// ─── GET /api/me ────────────────────────────────────────

router.get('/me', authRequired, (req, res) => {
    res.json({ success: true, user: sanitizeUser(req.user) });
});

// ─── PUT /api/me ────────────────────────────────────────

router.put('/me', authRequired, async (req, res) => {
    const { username, bio, avatar } = req.body;
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username !== undefined) {
        updates.push(`username = $${paramIndex++}`);
        params.push(String(username).trim());
    }
    if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        params.push(String(bio));
    }
    if (avatar !== undefined) {
        updates.push(`avatar = $${paramIndex++}`);
        params.push(String(avatar));
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Nimic de actualizat.' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.user.id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);

    const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]) });
});

// ─── PUT /api/me/email ──────────────────────────────────

router.put('/me/email', authRequired, async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, error: 'Adresa de email nu este validă.' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Introdu parola curentă pentru schimbarea emailului.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curentă este incorectă.' });
        }

        const emailLower = newEmail.toLowerCase().trim();
        const dupResult = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailLower, req.user.id]);
        if (dupResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Există deja un cont cu acest email.' });
        }

        await pool.query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [emailLower, req.user.id]);

        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]) });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── PUT /api/me/password ───────────────────────────────

router.put('/me/password', authRequired, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Introdu parola curentă.' });
        }
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola nouă trebuie să aibă minim 6 caractere.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curentă este incorectă.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── POST /api/request-reset ────────────────────────────

router.post('/request-reset', async (req, res) => {
    try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Emailul este obligatoriu.' });

    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = userResult.rows[0];

    // Always return success to prevent email enumeration
    if (!user) {
        return res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de resetare.' });
    }

    // Delete old reset tokens
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    const token = generateToken();
    await pool.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
    `, [user.id, token, expiresAt()]);

    emailService.sendPasswordResetEmail(user.email, user.username, token).catch(err => {
        console.error('Failed to send reset email:', err.message);
    });

    res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de resetare.' });
    } catch (err) {
        console.error('Request reset error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── POST /api/reset-password ───────────────────────────

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'Token lipsă.' });
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola trebuie să aibă minim 6 caractere.' });
        }

        const rowResult = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
        const row = rowResult.rows[0];
        if (!row) {
            return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
        }

        if (new Date(row.expires_at) < new Date()) {
            await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
            return res.status(400).json({ success: false, error: 'Tokenul a expirat. Solicită un link nou.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, row.user_id]);

        // Clean up all reset tokens for this user
        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [row.user_id]);

        // Invalidate all existing sessions
        await pool.query('UPDATE user_sessions SET is_active = 0 WHERE user_id = $1', [row.user_id]);

        res.json({ success: true, message: 'Parola a fost resetată. Te poți autentifica cu noua parolă.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
