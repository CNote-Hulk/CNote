/* ─────────────────────────────────────────
   FILE: reports.js
   DESCRIPTION: DSA Article 16 — Notice & Action mechanism.
   POST /api/reports  — submit a content report (auth optional)
   GET  /api/reports/my — list current user's reports (auth required)
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { authRequired, authOptional } = require('../middleware/auth');
const { Resend } = require('resend');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_CONTENT_TYPES = [
    'forum_thread', 'forum_reply', 'direct_message', 'listing', 'user_profile'
];

const VALID_REASONS = [
    'illegal_content', 'hate_speech', 'harassment',
    'spam', 'csam', 'misinformation', 'other'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM = 'Console Notebook <noreply@consolenotebook.com>';

// ── Rate limiter: 10 reports per hour per IP ───────────────────────────────

const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Prea multe rapoarte. Încearcă din nou mai târziu.' }
});

// ── POST /api/reports ──────────────────────────────────────────────────────
// Auth: optional — both authenticated and anonymous users may report.
// Never 404 based on content_id (avoids content enumeration).

router.post('/reports', reportLimiter, authOptional, async (req, res) => {
    try {
        const { content_type, content_id, reason, description, reporter_contact } = req.body || {};

        // ── Validation ──────────────────────────────────────────────────

        if (!content_type || !VALID_CONTENT_TYPES.includes(String(content_type))) {
            return res.status(400).json({
                success: false,
                error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
            });
        }

        const cleanContentId = String(content_id || '').trim();
        if (!cleanContentId || cleanContentId.length > 255) {
            return res.status(400).json({
                success: false,
                error: 'content_id is required and must be at most 255 characters.'
            });
        }

        if (!reason || !VALID_REASONS.includes(String(reason))) {
            return res.status(400).json({
                success: false,
                error: `reason must be one of: ${VALID_REASONS.join(', ')}`
            });
        }

        const cleanDescription = description ? String(description).trim() : null;
        if (cleanDescription && cleanDescription.length > 2000) {
            return res.status(400).json({ success: false, error: 'description must be at most 2000 characters.' });
        }

        const cleanContact = reporter_contact ? String(reporter_contact).trim() : null;
        if (cleanContact && !EMAIL_REGEX.test(cleanContact)) {
            return res.status(400).json({ success: false, error: 'reporter_contact must be a valid email address.' });
        }

        // ── Insert into DB ──────────────────────────────────────────────

        const reporterId = req.user?.id || null;

        const result = await pool.query(`
            INSERT INTO content_reports
                (reporter_id, content_type, content_id, reason, description, reporter_contact)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        `, [reporterId, content_type, cleanContentId, reason, cleanDescription, cleanContact]);

        const { id: reportId, created_at } = result.rows[0];

        // ── Notification email to admin (fire-and-forget) ───────────────

        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            const reporterLabel = req.user?.username || 'anonymous';
            const subject = `[CNote] New report — ${reason} on ${content_type}`;
            const text = [
                `Content type: ${content_type}`,
                `Content ID: ${cleanContentId}`,
                `Reason: ${reason}`,
                `Description: ${cleanDescription || 'none'}`,
                `Reporter: ${reporterLabel}`,
                `Contact: ${cleanContact || 'none'}`,
                `Time: ${created_at.toISOString()}`,
            ].join('\n');

            try {
                await resend.emails.send({
                    from: FROM,
                    to: adminEmail,
                    subject,
                    text,
                });
            } catch (emailErr) {
                // Email failure must NOT break the endpoint — log and continue
                console.error('[reports] Admin notification email failed:', emailErr.message || emailErr);
            }
        }

        return res.status(201).json({ success: true, reportId });

    } catch (err) {
        console.error('[reports] POST /api/reports error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/reports/my ────────────────────────────────────────────────────
// Auth: required. Returns the current user's submitted reports, newest first.

router.get('/reports/my', authRequired, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, content_type, content_id, reason, status, created_at
            FROM content_reports
            WHERE reporter_id = $1
            ORDER BY created_at DESC
            LIMIT 20
        `, [req.user.id]);

        const reports = result.rows;

        // Enrich each report with a label and link for the reported content
        for (const r of reports) {
            try {
                if (r.content_type === 'user_profile') {
                    const u = await pool.query('SELECT username FROM users WHERE id = $1', [r.content_id]);
                    r.content_label = u.rows[0]?.username || null;
                    r.content_link = u.rows[0] ? `/html/pages/user-profile.html?u=${u.rows[0].username}` : null;
                } else if (r.content_type === 'forum_thread') {
                    const t = await pool.query('SELECT title, console FROM forum_threads WHERE id = $1', [r.content_id]);
                    r.content_label = t.rows[0]?.title || null;
                    r.content_link = t.rows[0] ? `/html/pages/community.html#forum/${t.rows[0].console}/thread/${r.content_id}` : null;
                } else if (r.content_type === 'forum_reply') {
                    const t = await pool.query('SELECT ft.id, ft.console FROM forum_replies fr JOIN forum_threads ft ON ft.id = fr.thread_id WHERE fr.id = $1', [r.content_id]);
                    r.content_label = `Reply #${r.content_id}`;
                    r.content_link = t.rows[0] ? `/html/pages/community.html#forum/${t.rows[0].console}/thread/${t.rows[0].id}` : null;
                } else if (r.content_type === 'listing') {
                    const l = await pool.query('SELECT title FROM listings WHERE id = $1', [r.content_id]);
                    r.content_label = l.rows[0]?.title || null;
                    r.content_link = `/html/pages/community.html#listing-${r.content_id}`;
                } else if (r.content_type === 'direct_message') {
                    r.content_label = `Message #${r.content_id}`;
                    r.content_link = null;
                }
            } catch { /* ignore enrichment errors */ }
        }

        return res.json({ success: true, reports });
    } catch (err) {
        console.error('[reports] GET /api/reports/my error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/reports/admin ────────────────────────────────────────────────
// Admin only. Returns all reports, newest first, with basic enrichment.

router.get('/reports/admin', authRequired, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden.' });

    try {
        const result = await pool.query(`
            SELECT cr.id, cr.content_type, cr.content_id, cr.reason, cr.description,
                   cr.status, cr.created_at, cr.reporter_contact,
                   u.username AS reporter_username
            FROM content_reports cr
            LEFT JOIN users u ON u.id = cr.reporter_id
            ORDER BY cr.created_at DESC
            LIMIT 200
        `);

        const reports = result.rows;

        for (const r of reports) {
            try {
                if (r.content_type === 'user_profile') {
                    const u = await pool.query('SELECT username FROM users WHERE id = $1', [r.content_id]);
                    r.content_label = u.rows[0]?.username ? `@${u.rows[0].username}` : `User #${r.content_id}`;
                } else if (r.content_type === 'forum_thread') {
                    const t = await pool.query('SELECT title FROM forum_threads WHERE id = $1', [r.content_id]);
                    r.content_label = t.rows[0]?.title || `Thread #${r.content_id}`;
                } else if (r.content_type === 'forum_reply') {
                    r.content_label = `Reply #${r.content_id}`;
                } else if (r.content_type === 'listing') {
                    const l = await pool.query('SELECT title FROM listings WHERE id = $1', [r.content_id]);
                    r.content_label = l.rows[0]?.title || `Listing #${r.content_id}`;
                } else if (r.content_type === 'direct_message') {
                    r.content_label = `Message #${r.content_id}`;
                } else {
                    r.content_label = `${r.content_type} #${r.content_id}`;
                }
            } catch { r.content_label = `${r.content_type} #${r.content_id}`; }
        }

        return res.json({ success: true, reports });
    } catch (err) {
        console.error('[reports] GET /api/reports/admin error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── PATCH /api/reports/admin/:id ──────────────────────────────────────────
// Admin only. Updates report status: pending → reviewed | resolved | dismissed.

const VALID_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'];

router.patch('/reports/admin/:id', authRequired, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden.' });

    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const { status } = req.body || {};
    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
        const result = await pool.query(
            `UPDATE content_reports SET status = $1 WHERE id = $2 RETURNING id, status`,
            [status, reportId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });
        return res.json({ success: true, report: result.rows[0] });
    } catch (err) {
        console.error('[reports] PATCH /api/reports/admin error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
