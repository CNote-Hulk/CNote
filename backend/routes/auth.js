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

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function expiresAt(hours = TOKEN_EXPIRY_HOURS) {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

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

function clearSessionCookie(res) {
    const isProd = process.env.NODE_ENV === 'production' || String(process.env.BASE_URL || '').startsWith('https://');
    res.clearCookie('cn_session_token', {
        path: '/',
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || '',
        favorite_consoles: user.favorite_consoles || '',
        owned_consoles: user.owned_consoles || '',
        email_verified: !!user.email_verified,
        created_at: user.created_at
    };
}

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || String(username).trim().length < 1) {
            return res.status(400).json({ success: false, error: 'Numele de utilizator este obligatoriu.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, error: 'Adresa de email nu este valida.' });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola trebuie sa aiba minim 6 caractere.' });
        }

        const emailLower = email.toLowerCase().trim();
        const existingResult = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
        if (existingResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Exista deja un cont cu acest email.' });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const insertResult = await pool.query(
            'INSERT INTO users (username, email, password_hash, email_verified) VALUES ($1, $2, $3, 1) RETURNING *',
            [String(username).trim(), emailLower, passwordHash]
        );

        const user = insertResult.rows[0];

        res.status(201).json({
            success: true,
            user: sanitizeUser(user),
            message: 'Cont creat cu succes! Te poti autentifica acum.'
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna. Incearca din nou.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Completeaza toate campurile.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Email sau parola incorecta.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Email sau parola incorecta.' });
        }

        const deviceInfo = parseDevice(req);
        const sessionToken = generateToken();
        await pool.query(
            'INSERT INTO user_sessions (user_id, session_token, device_type, browser, operating_system, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [user.id, sessionToken, deviceInfo.deviceType, deviceInfo.browser, deviceInfo.os, deviceInfo.ip]
        );

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
        res.status(500).json({ success: false, error: 'Eroare interna. Incearca din nou.' });
    }
});

router.get('/profile', authRequired, (req, res) => {
    res.json({ success: true, message: 'User authenticated', user: sanitizeUser(req.user) });
});

router.post('/logout', authRequired, async (req, res) => {
    if (req.sessionId) {
        await pool.query('UPDATE user_sessions SET is_active = 0 WHERE id = $1', [req.sessionId]);
    }
    clearSessionCookie(res);
    res.json({ success: true });
});

router.get('/me', authRequired, (req, res) => {
    res.json({ success: true, user: sanitizeUser(req.user) });
});

router.put('/me', authRequired, async (req, res) => {
    const { username, bio, avatar, favorite_consoles, owned_consoles } = req.body;
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
    if (favorite_consoles !== undefined) {
        updates.push(`favorite_consoles = $${paramIndex++}`);
        params.push(String(favorite_consoles));
    }
    if (owned_consoles !== undefined) {
        updates.push(`owned_consoles = $${paramIndex++}`);
        params.push(String(owned_consoles));
    }

    if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Nimic de actualizat.' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.user.id);

    try {
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.put('/me/email', authRequired, async (req, res) => {
    try {
        const { newEmail, currentPassword } = req.body;

        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            return res.status(400).json({ success: false, error: 'Adresa de email nu este valida.' });
        }
        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Introdu parola curenta pentru schimbarea emailului.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curenta este incorecta.' });
        }

        const emailLower = newEmail.toLowerCase().trim();
        const dupResult = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailLower, req.user.id]);
        if (dupResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Exista deja un cont cu acest email.' });
        }

        await pool.query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [emailLower, req.user.id]);

        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]) });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.put('/me/password', authRequired, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Introdu parola curenta.' });
        }
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola noua trebuie sa aiba minim 6 caractere.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(403).json({ success: false, error: 'Parola curenta este incorecta.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Update password error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.delete('/account', authRequired, async (req, res) => {
    const client = await pool.connect();
    try {
        const { password } = req.body || {};
        if (!password) {
            return res.status(400).json({ success: false, error: 'Parola este obligatorie.' });
        }

        const userResult = await client.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilizator inexistent.' });
        }

        const valid = await bcrypt.compare(String(password), user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Parola incorecta.' });
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
        await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [req.user.id]);
        await client.query('DELETE FROM users WHERE id = $1', [req.user.id]);

        await client.query('COMMIT');
        clearSessionCookie(res);
        return res.json({ success: true });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { }
        console.error('Delete account error:', err);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    } finally {
        client.release();
    }
});

router.post('/request-reset', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Emailul este obligatoriu.' });

        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        const user = userResult.rows[0];

        if (!user) {
            return res.json({ success: true, message: 'Daca exista un cont cu acest email, vei primi un link de resetare.' });
        }

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

        const token = generateToken();
        await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, token, expiresAt()]);

        emailService.sendPasswordResetEmail(user.email, user.username, token).catch(err => {
            console.error('Failed to send reset email:', err.message);
        });

        res.json({ success: true, message: 'Daca exista un cont cu acest email, vei primi un link de resetare.' });
    } catch (err) {
        console.error('Request reset error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token) return res.status(400).json({ success: false, error: 'Token lipsa.' });
        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola trebuie sa aiba minim 6 caractere.' });
        }

        const rowResult = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1', [token]);
        const row = rowResult.rows[0];
        if (!row) {
            return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
        }

        if (new Date(row.expires_at) < new Date()) {
            await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
            return res.status(400).json({ success: false, error: 'Tokenul a expirat. Solicita un link nou.' });
        }

        const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, row.user_id]);

        await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [row.user_id]);
        await pool.query('UPDATE user_sessions SET is_active = 0 WHERE user_id = $1', [row.user_id]);

        res.json({ success: true, message: 'Parola a fost resetata. Te poti autentifica cu noua parola.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
