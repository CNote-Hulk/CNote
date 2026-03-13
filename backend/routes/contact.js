const express = require('express');
const emailService = require('../services/email');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/contact', async (req, res) => {
    try {
        const { name, email, message, _honey } = req.body || {};

        // Silent success for bots filling hidden fields.
        if (_honey && String(_honey).trim().length > 0) {
            return res.json({ success: true });
        }

        const cleanName = String(name || '').trim();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanMessage = String(message || '').trim();

        if (!cleanName || cleanName.length < 2) {
            return res.status(400).json({ success: false, error: 'Numele este obligatoriu.' });
        }
        if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Email invalid.' });
        }
        if (!cleanMessage || cleanMessage.length < 5) {
            return res.status(400).json({ success: false, error: 'Mesajul este prea scurt.' });
        }
        if (cleanMessage.length > 5000) {
            return res.status(400).json({ success: false, error: 'Mesajul este prea lung.' });
        }

        await emailService.sendContactMessageEmail(cleanName, cleanEmail, cleanMessage);
        return res.json({ success: true });
    } catch (err) {
        console.error('Contact form error:', err);
        return res.status(500).json({ success: false, error: 'Eroare interna.' });
    }
});

module.exports = router;
