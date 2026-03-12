/**
 * Authentication routes
 *
 * POST /api/register        — Create account + send verification email
 * POST /api/login            — Authenticate + create session
 * POST /api/logout           — Invalidate current session
 * GET  /api/me               — Get current user info
 * PUT  /api/me               — Update profile (username, bio, avatar)
 * PUT  /api/me/email         — Change email (requires password)
 * PUT  /api/me/password      — Change password (requires current password)
 * GET  /api/verify-email     — Verify email with token
 * POST /api/request-reset    — Request password reset email
 * POST /api/reset-password   — Reset password with token
 */

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');
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
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailLower);
        if (existing) {
            return res.status(409).json({ success: false, error: 'Există deja un cont cu acest email.' });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const result = db.prepare(`
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        `).run(String(username).trim(), emailLower, passwordHash);

        const userId = result.lastInsertRowid;

        // Create email verification token
        const token = generateToken();
        db.prepare(`
            INSERT INTO email_verification_tokens (user_id, token, expires_at)
            VALUES (?, ?, ?)
        `).run(userId, token, expiresAt());

        // Send verification email (non-blocking)
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        emailService.sendVerificationEmail(emailLower, String(username).trim(), token).catch(err => {
            console.error('Failed to send verification email:', err.message);
        });

        res.status(201).json({
            success: true,
            user: sanitizeUser(user),
            message: 'Cont creat cu succes! Verifică emailul pentru a activa contul.'
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

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Completează toate câmpurile.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
        if (!user) {
            return res.status(401).json({ success: false, error: 'Email sau parolă incorectă.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Email sau parolă incorectă.' });
        }

        // Check email verified
        if (!user.email_verified) {
            return res.status(403).json({
                success: false,
                error: 'Emailul nu a fost verificat. Verifică inbox-ul sau solicită un email nou.',
                email_not_verified: true
            });
        }

        // Parse device info
        const deviceInfo = parseDevice(req);

        // Create session
        const sessionToken = generateToken();
        db.prepare(`
            INSERT INTO user_sessions (user_id, session_token, device_type, browser, operating_system, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(user.id, sessionToken, deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os, deviceInfo.ip);

        setSessionCookie(res, sessionToken);

        // Check if this is a new device — send login alert
        const previousSessions = db.prepare(`
            SELECT browser, operating_system FROM user_sessions
            WHERE user_id = ? AND is_active = 0
        `).all(user.id);

        const isNewDevice = !previousSessions.some(
            s => s.browser === deviceInfo.browser && s.operating_system === deviceInfo.os
        );

        if (isNewDevice && previousSessions.length > 0) {
            emailService.sendNewLoginAlert(user.email, user.username, deviceInfo).catch(err => {
                console.error('Failed to send login alert:', err.message);
            });
        }

        res.json({
            success: true,
            user: sanitizeUser(user),
            session_token: sessionToken
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă. Încearcă din nou.' });
    }
});

// ─── POST /api/logout ───────────────────────────────────

router.post('/logout', authRequired, (req, res) => {
    db.prepare('UPDATE user_sessions SET is_active = 0 WHERE id = ?').run(req.sessionId);
    clearSessionCookie(res);
    res.json({ success: true });
});

// ─── GET /api/me ────────────────────────────────────────

router.get('/me', authRequired, (req, res) => {
    res.json({ success: true, user: sanitizeUser(req.user) });
});

// ─── PUT /api/me ────────────────────────────────────────

router.put('/me', authRequired, (req, res) => {
    const { username, bio, avatar } = req.body;
    const updates = [];
    const params = [];

    if (username !== undefined) {
        updates.push('username = ?');
        params.push(String(username).trim());
    }
    if (bio !== undefined) {
        updates.push('bio = ?');
        params.push(String(bio));
    }
    if (avatar !== undefined) {
        updates.push('avatar = ?');
        params.push(String(avatar));
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Nimic de actualizat.' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, user: sanitizeUser(updated) });
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

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curentă este incorectă.' });
        }

        const emailLower = newEmail.toLowerCase().trim();
        const dup = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(emailLower, req.user.id);
        if (dup) {
            return res.status(409).json({ success: false, error: 'Există deja un cont cu acest email.' });
        }

        db.prepare("UPDATE users SET email = ?, updated_at = datetime('now') WHERE id = ?")
          .run(emailLower, req.user.id);

        const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        res.json({ success: true, user: sanitizeUser(updated) });
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

        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curentă este incorectă.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
          .run(hash, req.user.id);

        res.json({ success: true });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

// ─── GET /api/verify-email ──────────────────────────────

router.get('/verify-email', (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ success: false, error: 'Token lipsă.' });
    }

    const row = db.prepare(`
        SELECT * FROM email_verification_tokens WHERE token = ?
    `).get(token);

    if (!row) {
        return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
    }

    if (new Date(row.expires_at) < new Date()) {
        db.prepare('DELETE FROM email_verification_tokens WHERE id = ?').run(row.id);
        return res.status(400).json({ success: false, error: 'Tokenul a expirat. Solicită un email nou.' });
    }

    db.prepare("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?")
      .run(row.user_id);

    // Clean up all verification tokens for this user
    db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(row.user_id);

    res.json({ success: true, message: 'Email verificat cu succes! Acum te poți autentifica.' });
});

// ─── POST /api/resend-verification ──────────────────────

router.post('/resend-verification', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Emailul este obligatoriu.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
        // Don't reveal whether email exists
        return res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de verificare.' });
    }

    if (user.email_verified) {
        return res.json({ success: true, message: 'Emailul este deja verificat.' });
    }

    // Delete old tokens
    db.prepare('DELETE FROM email_verification_tokens WHERE user_id = ?').run(user.id);

    const token = generateToken();
    db.prepare(`
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt());

    emailService.sendVerificationEmail(user.email, user.username, token).catch(err => {
        console.error('Failed to resend verification email:', err.message);
    });

    res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de verificare.' });
});

// ─── POST /api/request-reset ────────────────────────────

router.post('/request-reset', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Emailul este obligatoriu.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());

    // Always return success to prevent email enumeration
    if (!user) {
        return res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de resetare.' });
    }

    // Delete old reset tokens
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);

    const token = generateToken();
    db.prepare(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(user.id, token, expiresAt());

    emailService.sendPasswordResetEmail(user.email, user.username, token).catch(err => {
        console.error('Failed to send reset email:', err.message);
    });

    res.json({ success: true, message: 'Dacă există un cont cu acest email, vei primi un link de resetare.' });
});

// ─── POST /api/reset-password ───────────────────────────

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'Token lipsă.' });
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola trebuie să aibă minim 6 caractere.' });
        }

        const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token);
        if (!row) {
            return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
        }

        if (new Date(row.expires_at) < new Date()) {
            db.prepare('DELETE FROM password_reset_tokens WHERE id = ?').run(row.id);
            return res.status(400).json({ success: false, error: 'Tokenul a expirat. Solicită un link nou.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
          .run(hash, row.user_id);

        // Clean up all reset tokens for this user
        db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(row.user_id);

        // Invalidate all existing sessions
        db.prepare('UPDATE user_sessions SET is_active = 0 WHERE user_id = ?').run(row.user_id);

        res.json({ success: true, message: 'Parola a fost resetată. Te poți autentifica cu noua parolă.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Eroare internă.' });
    }
});

module.exports = router;
