/* ─────────────────────────────────────────
   FILE: contact.js
   DESCRIPTION: Contact form route. Validates input,
   checks honeypot for bots, and sends email via Resend.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const emailService = require('../services/email');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — Submit contact form and send email to admin + confirmation to user
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message, _honey } = req.body || {};

        // Honeypot field: if filled, it’s a bot — return silent success
        if (_honey && String(_honey).trim().length > 0) {
            return res.json({ success: true });
        }

        const cleanName = String(name || '').trim();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanSubject = String(subject || '').trim();
        const cleanMessage = String(message || '').trim();

        if (!cleanName || cleanName.length < 2) {
            return res.status(400).json({ success: false, error: 'Numele este obligatoriu.' });
        }
        if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Email invalid.' });
        }
        if (!cleanSubject) {
            return res.status(400).json({ success: false, error: 'Subiectul este obligatoriu.' });
        }
        if (!cleanMessage || cleanMessage.length < 5) {
            return res.status(400).json({ success: false, error: 'Mesajul este prea scurt.' });
        }
        if (cleanMessage.length > 5000) {
            return res.status(400).json({ success: false, error: 'Mesajul este prea lung.' });
        }

        // Email: sends contact message to admin + auto-confirmation to sender
        const contactResult = await emailService.sendContactEmail(cleanEmail, cleanName, cleanSubject, cleanMessage);
        if (!contactResult.success) {
            console.error('Contact email error:', contactResult.error);
            return res.status(500).json({ success: false, error: 'Nu am putut trimite mesajul. Incearca din nou.' });
        }
        return res.json({ success: true, message: 'Mesajul a fost trimis.' });
    } catch (err) {
        console.error('Contact form error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Nu am putut trimite mesajul. Incearca din nou.' });
    }
});

module.exports = router;
