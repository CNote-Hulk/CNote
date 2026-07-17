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
const { verifyTurnstileToken } = require('../utils/turnstile');
const { parseDevice } = require('../utils/device');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact — Submit contact form and send email to admin + confirmation to user
router.post('/contact', async (req, res) => {
    try {
        const { name, email, subject, message, _honey, turnstileToken } = req.body || {};

        // Honeypot field: if filled, it’s a bot — return silent success
        if (_honey && String(_honey).trim().length > 0) {
            return res.json({ success: true });
        }

        const captcha = await verifyTurnstileToken(turnstileToken, parseDevice(req).ip);
        if (!captcha.success) {
            return res.status(400).json({ success: false, error: captcha.error });
        }

        const cleanName = String(name || '').trim();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanSubject = String(subject || '').trim();
        const cleanMessage = String(message || '').trim();

        if (!cleanName || cleanName.length < 2) {
            return res.status(400).json({ success: false, error: 'Name is required.' });
        }
        if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Invalid email.' });
        }
        if (!cleanSubject) {
            return res.status(400).json({ success: false, error: 'Subject is required.' });
        }
        if (!cleanMessage || cleanMessage.length < 5) {
            return res.status(400).json({ success: false, error: 'Message is too short.' });
        }
        if (cleanMessage.length > 5000) {
            return res.status(400).json({ success: false, error: 'Message is too long.' });
        }

        // Email: sends contact message to admin + auto-confirmation to sender
        const contactResult = await emailService.sendContactEmail(cleanEmail, cleanName, cleanSubject, cleanMessage);
        if (!contactResult.success) {
            console.error('Contact email error:', contactResult.error);
            return res.status(500).json({ success: false, error: 'Could not send the message. Please try again.' });
        }
        return res.json({ success: true, message: 'Message has been sent.' });
    } catch (err) {
        console.error('Contact form error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Could not send the message. Please try again.' });
    }
});

module.exports = router;
