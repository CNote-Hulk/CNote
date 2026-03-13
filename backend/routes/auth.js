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

        const usernameTrimmed = String(username).trim();
        const usernameCheck = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [usernameTrimmed]);
        if (usernameCheck.rows[0]) {
            return res.status(409).json({ success: false, error: 'Username-ul este deja folosit. Alege altul.' });
        }

        const emailLower = email.toLowerCase().trim();
        const existingResult = await pool.query('SELECT id FROM users WHERE email = $1', [emailLower]);
        if (existingResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Exista deja un cont cu acest email.' });
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

        let emailSent = true;
        try {
            await emailService.sendVerificationEmail(user.email, verificationToken, process.env.BASE_URL);
        } catch (emailErr) {
            emailSent = false;
            console.error('Verification email error:', emailErr.message);
        }

        res.status(201).json({
            success: true,
            user: sanitizeUser(user),
            emailSent,
            message: emailSent
                ? 'Cont creat cu succes! Verifica emailul pentru a activa contul.'
                : 'Cont creat, dar emailul de verificare nu a putut fi trimis momentan.'
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

        if (!user.email_verified && !user.google_id) {
            return res.status(403).json({ success: false, error: 'email_not_verified' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ success: false, error: 'Acest cont foloseste Google pentru autentificare.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Email sau parola incorecta.' });
        }

        // Check 2FA
        if (user.two_factor_enabled) {
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
                try {
                    await emailService.sendTwoFactorEmail(user.email, code);
                } catch (err) {
                    console.error('2FA email error:', err.message);
                }
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
        await pool.query('UPDATE user_sessions SET is_active = false WHERE id = $1', [req.sessionId]);
    }
    clearSessionCookie(res);
    res.json({ success: true });
});

router.get('/verify-email', async (req, res) => {
    try {
        const token = String(req.query.token || '').trim();
        if (!token) {
            return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
        }

        const rowResult = await pool.query(
            'SELECT * FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
            [token]
        );
        const row = rowResult.rows[0];
        if (!row) {
            return res.status(400).json({ success: false, error: 'Token invalid sau expirat.' });
        }

        await pool.query('UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1', [row.user_id]);
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [row.user_id]);

        return res.json({ success: true, message: 'Email verificat cu succes! Poti acum sa te conectezi.' });
    } catch (err) {
        console.error('Verify email error:', err);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/resend-verification', authRequired, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT id, email, email_verified FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilizator inexistent.' });
        }
        if (user.email_verified) {
            return res.json({ success: true, message: 'Emailul este deja verificat.', emailSent: false });
        }

        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);

        const token = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt()]
        );

        await emailService.sendVerificationEmail(user.email, token, process.env.BASE_URL);
        return res.json({ success: true, emailSent: true, message: 'Emailul de verificare a fost retrimis.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/resend-verification-public', async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ success: false, error: 'Emailul este obligatoriu.' });
        }

        const userResult = await pool.query(
            'SELECT id, email, email_verified FROM users WHERE email = $1',
            [email]
        );
        const user = userResult.rows[0];

        if (!user || user.email_verified) {
            return res.json({ success: true, message: 'Daca exista un cont neverificat cu acest email, am retrimis linkul.' });
        }

        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
        const token = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt()]
        );

        await emailService.sendVerificationEmail(user.email, token, process.env.BASE_URL);
        return res.json({ success: true, message: 'Daca exista un cont neverificat cu acest email, am retrimis linkul.' });
    } catch (err) {
        console.error('Public resend verification error:', err);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
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
        if (emailLower === user.email) {
            return res.status(400).json({ success: false, error: 'Noul email este identic cu cel curent.' });
        }

        const dupResult = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [emailLower, req.user.id]);
        if (dupResult.rows[0]) {
            return res.status(409).json({ success: false, error: 'Exista deja un cont cu acest email.' });
        }

        await pool.query('UPDATE users SET email = $1, email_verified = FALSE, updated_at = NOW() WHERE id = $2', [emailLower, req.user.id]);

        // Send verification email for the new address
        await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [req.user.id]);
        const verificationToken = generateToken();
        await pool.query(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [req.user.id, verificationToken, expiresAt()]
        );
        try {
            await emailService.sendVerificationEmail(emailLower, verificationToken, process.env.BASE_URL);
        } catch (emailErr) {
            console.error('Verification email after email change failed:', emailErr.message);
        }

        const updatedResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        res.json({ success: true, user: sanitizeUser(updatedResult.rows[0]), message: 'Email schimbat. Verifica noul email pentru a-l confirma.' });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.put('/me/password', authRequired, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || String(newPassword).length < 6) {
            return res.status(400).json({ success: false, error: 'Parola noua trebuie sa aiba minim 6 caractere.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        // Google-only users can set initial password without current password
        if (!user.password_hash) {
            const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
            await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
            return res.json({ success: true, message: 'Parola a fost setata.' });
        }

        if (!currentPassword) {
            return res.status(400).json({ success: false, error: 'Introdu parola curenta.' });
        }

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

router.post('/account/set-password', authRequired, async (req, res) => {
    try {
        const { password, confirmPassword } = req.body || {};

        const userResult = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilizator inexistent.' });
        }

        if (user.password_hash) {
            return res.status(400).json({ success: false, error: 'Ai deja o parol\u0103 setat\u0103. Folose\u0219te schimbarea parolei.' });
        }

        if (!password || String(password).length < 8) {
            return res.status(400).json({ success: false, error: 'Parola trebuie s\u0103 aib\u0103 minim 8 caractere.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, error: 'Parolele nu coincid.' });
        }

        const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

        res.json({ success: true, message: 'Parola a fost setat\u0103 cu succes.' });
    } catch (err) {
        console.error('Set password error:', err);
        res.status(500).json({ success: false, error: 'Eroare intern\u0103.' });
    }
});

router.delete('/account', authRequired, async (req, res) => {
    const client = await pool.connect();
    try {
        const { password, confirmText } = req.body || {};

        const userResult = await client.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, error: 'Utilizator inexistent.' });
        }

        if (user.password_hash) {
            if (!password) {
                return res.status(400).json({ success: false, error: 'Parola este obligatorie.' });
            }
            const valid = await bcrypt.compare(String(password), user.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Parolă incorectă.' });
            }
        } else {
            if (confirmText !== 'STERGE') {
                return res.status(400).json({ success: false, error: 'Scrie STERGE pentru a confirma.' });
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

        emailService.sendPasswordResetEmail(user.email, token, process.env.BASE_URL).catch(err => {
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
        await pool.query('UPDATE user_sessions SET is_active = false WHERE user_id = $1', [row.user_id]);

        res.json({ success: true, message: 'Parola a fost resetata. Te poti autentifica cu noua parola.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

// ─── Two-Factor Authentication Routes ───────────────────

router.post('/2fa/verify', async (req, res) => {
    try {
        // Accept tempToken from Authorization header OR request body
        const authHeader = req.headers.authorization;
        const tempToken = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.body?.tempToken;

        if (!tempToken) {
            return res.status(401).json({ success: false, error: 'Token lipsa.' });
        }
        const JWT_SECRET = req.app.get('JWT_SECRET');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, error: 'Sesiunea a expirat. Autentifica-te din nou.' });
        }

        if (!decoded.twoFactorPending) {
            return res.status(400).json({ success: false, error: 'Token invalid.' });
        }

        const { code, method: requestedMethod } = req.body || {};
        if (!code || String(code).trim().length !== 6) {
            return res.status(400).json({ success: false, error: 'Codul trebuie sa aiba 6 cifre.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Utilizator inexistent.' });
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
                return res.status(401).json({ success: false, error: 'Cod invalid sau expirat.' });
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
                return res.status(401).json({ success: false, error: 'Cod invalid.' });
            }
        } else {
            return res.status(400).json({ success: false, error: 'Metoda 2FA necunoscuta.' });
        }

        // 2FA verified — create real session
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

        res.json({
            success: true,
            user: sanitizeUser(user),
            token: jwtToken,
            session_token: sessionToken
        });
    } catch (err) {
        console.error('2FA verify error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/2fa/fallback-email', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const tempToken = (authHeader && authHeader.startsWith('Bearer '))
            ? authHeader.slice(7)
            : req.body?.tempToken;

        if (!tempToken) {
            return res.status(401).json({ success: false, error: 'Token lipsa.' });
        }
        const JWT_SECRET = req.app.get('JWT_SECRET');

        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET);
        } catch {
            return res.status(401).json({ success: false, error: 'Sesiunea a expirat. Autentifica-te din nou.' });
        }

        if (!decoded.twoFactorPending) {
            return res.status(400).json({ success: false, error: 'Token invalid.' });
        }

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(401).json({ success: false, error: 'Utilizator inexistent.' });
        }

        if (!user.two_factor_email_enabled) {
            return res.status(400).json({ success: false, error: '2FA prin email nu este activat.' });
        }

        const code = String(crypto.randomInt(100000, 999999));
        const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [user.id]);
        await pool.query(
            'INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
            [user.id, code, codeExpiry]
        );
        try {
            await emailService.sendTwoFactorEmail(user.email, code);
        } catch (err) {
            console.error('2FA fallback email error:', err.message);
            return res.status(500).json({ success: false, error: 'Nu s-a putut trimite emailul.' });
        }

        res.json({ success: true, message: 'Codul a fost trimis pe email.' });
    } catch (err) {
        console.error('2FA fallback-email error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/2fa/setup/totp', authRequired, async (req, res) => {
    try {
        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');

        const secret = speakeasy.generateSecret({
            name: 'CNote (' + req.user.email + ')',
            issuer: 'CNote'
        });

        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            secret: secret.base32,
            qrCode
        });
    } catch (err) {
        console.error('TOTP setup error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.post('/2fa/setup/totp/confirm', authRequired, async (req, res) => {
    try {
        const { code, secret } = req.body || {};
        console.log('TOTP confirm req.body:', { code: code ? '***' : undefined, secret: secret ? '(set)' : undefined });
        if (!code || !secret) {
            return res.status(400).json({ success: false, error: 'Codul si secretul sunt obligatorii.' });
        }

        const speakeasy = require('speakeasy');
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: String(code).trim(),
            window: 1
        });

        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Codul nu este valid. Incearca din nou.' });
        }

        await pool.query(
            'UPDATE users SET two_factor_enabled = TRUE, two_factor_method = $1, two_factor_secret = $2, two_factor_totp_enabled = TRUE, updated_at = NOW() WHERE id = $3',
            ['totp', secret, req.user.id]
        );

        res.json({ success: true, message: '2FA prin Authenticator a fost activat.' });
    } catch (err) {
        console.error('TOTP confirm error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

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
        res.json({ success: true, message: '2FA prin Email a fost activat.' });
    } catch (err) {
        console.error('Email 2FA setup error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

router.delete('/2fa/disable', authRequired, async (req, res) => {
    try {
        const { password, method } = req.body || {};

        const userResult = await pool.query('SELECT id, password_hash, two_factor_totp_enabled, two_factor_email_enabled FROM users WHERE id = $1', [req.user.id]);
        const user = userResult.rows[0];

        if (user.password_hash) {
            if (!password) {
                return res.status(400).json({ success: false, error: 'Parola este obligatorie.' });
            }
            const valid = await bcrypt.compare(String(password), user.password_hash);
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Parola incorecta.' });
            }
        }

        if (method === 'totp') {
            // Disable only TOTP
            const stillHasEmail = !!user.two_factor_email_enabled;
            await pool.query(
                'UPDATE users SET two_factor_totp_enabled = FALSE, two_factor_secret = NULL, two_factor_enabled = $1, two_factor_method = $2, updated_at = NOW() WHERE id = $3',
                [stillHasEmail, stillHasEmail ? 'email' : null, req.user.id]
            );
            res.json({ success: true, message: '2FA prin aplicatie a fost dezactivat.' });
        } else if (method === 'email') {
            // Disable only email
            const stillHasTotp = !!user.two_factor_totp_enabled;
            await pool.query(
                'UPDATE users SET two_factor_email_enabled = FALSE, two_factor_enabled = $1, two_factor_method = $2, updated_at = NOW() WHERE id = $3',
                [stillHasTotp, stillHasTotp ? 'totp' : null, req.user.id]
            );
            await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [req.user.id]);
            res.json({ success: true, message: '2FA prin email a fost dezactivat.' });
        } else {
            // Disable all
            await pool.query(
                'UPDATE users SET two_factor_enabled = FALSE, two_factor_method = NULL, two_factor_secret = NULL, two_factor_totp_enabled = FALSE, two_factor_email_enabled = FALSE, updated_at = NOW() WHERE id = $1',
                [req.user.id]
            );
            await pool.query('DELETE FROM two_factor_codes WHERE user_id = $1', [req.user.id]);
            res.json({ success: true, message: '2FA a fost dezactivat complet.' });
        }
    } catch (err) {
        console.error('2FA disable error:', err);
        res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
