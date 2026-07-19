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
const { adminOnly } = require('../middleware/adminOnly');
const { Resend } = require('resend');

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Constants ──────────────────────────────────────────────────────────────

const VALID_CONTENT_TYPES = [
    'forum_thread', 'forum_reply', 'direct_message', 'listing', 'user_profile', 'community_photo'
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

router.get('/reports/admin', authRequired, adminOnly, async (req, res) => {
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
            r.content_link = null;
            r.content_body = null;
            r.author_id = null;
            try {
                if (r.content_type === 'user_profile') {
                    const u = await pool.query('SELECT id, username, bio FROM users WHERE id = $1', [r.content_id]);
                    const row = u.rows[0];
                    r.content_label = row?.username ? `@${row.username}` : `User #${r.content_id}`;
                    r.content_link = row?.username ? `/html/pages/user-profile.html?u=${row.username}` : null;
                    r.content_body = row?.bio || null;
                    r.author_id = row?.id || null;
                } else if (r.content_type === 'forum_thread') {
                    const t = await pool.query('SELECT id, user_id, title, body, console FROM forum_threads WHERE id = $1', [r.content_id]);
                    const row = t.rows[0];
                    r.content_label = row?.title || `Thread #${r.content_id}`;
                    r.content_link = row ? `/html/pages/community.html#forum/${row.console}/thread/${row.id}` : null;
                    r.content_body = row?.body || null;
                    r.author_id = row?.user_id || null;
                } else if (r.content_type === 'forum_reply') {
                    const t = await pool.query(
                        `SELECT fr.body, fr.user_id, ft.id AS thread_id, ft.console, ft.title
                         FROM forum_replies fr
                         JOIN forum_threads ft ON ft.id = fr.thread_id
                         WHERE fr.id = $1`, [r.content_id]);
                    const row = t.rows[0];
                    r.content_label = row?.title ? `Reply in "${row.title}"` : `Reply #${r.content_id}`;
                    r.content_link = row ? `/html/pages/community.html#forum/${row.console}/thread/${row.thread_id}` : null;
                    r.content_body = row?.body || null;
                    r.author_id = row?.user_id || null;
                } else if (r.content_type === 'listing') {
                    const l = await pool.query('SELECT user_id, title, description FROM listings WHERE id = $1', [r.content_id]);
                    const row = l.rows[0];
                    r.content_label = row?.title || `Listing #${r.content_id}`;
                    r.content_link = `/html/pages/community.html#listing-${r.content_id}`;
                    r.content_body = row?.description || null;
                    r.author_id = row?.user_id || null;
                } else if (r.content_type === 'direct_message') {
                    const m = await pool.query(
                        `SELECT dm.message, dm.sender_id, s.username AS sender, rc.username AS receiver
                         FROM direct_messages dm
                         JOIN users s ON s.id = dm.sender_id
                         JOIN users rc ON rc.id = dm.receiver_id
                         WHERE dm.id = $1`, [r.content_id]);
                    const row = m.rows[0];
                    r.content_label = row ? `DM from @${row.sender} to @${row.receiver}` : `Message #${r.content_id}`;
                    r.content_body = row?.message || null;
                    r.author_id = row?.sender_id || null;
                } else if (r.content_type === 'community_photo') {
                    const p = await pool.query('SELECT user_id, caption FROM community_photos WHERE id = $1', [r.content_id]);
                    const row = p.rows[0];
                    r.content_label = `Photo #${r.content_id}`;
                    r.content_body = row?.caption || null;
                    r.author_id = row?.user_id || null;
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

router.patch('/reports/admin/:id', authRequired, adminOnly, async (req, res) => {
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

// ── Moderation actions (ban / mute / delete-content) ────────────────────────
// Admin only. Triggered from a specific report's card in the admin UI.

/**
 * resolveAuthorId
 * @description Looks up the user id that owns a piece of reported content,
 * by content_type. Mirrors the enrichment logic in GET /reports/admin.
 */
async function resolveAuthorId(contentType, contentId) {
    switch (contentType) {
        case 'user_profile': {
            const r = await pool.query('SELECT id FROM users WHERE id = $1', [contentId]);
            return r.rows[0]?.id || null;
        }
        case 'forum_thread': {
            const r = await pool.query('SELECT user_id FROM forum_threads WHERE id = $1', [contentId]);
            return r.rows[0]?.user_id || null;
        }
        case 'forum_reply': {
            const r = await pool.query('SELECT user_id FROM forum_replies WHERE id = $1', [contentId]);
            return r.rows[0]?.user_id || null;
        }
        case 'listing': {
            const r = await pool.query('SELECT user_id FROM listings WHERE id = $1', [contentId]);
            return r.rows[0]?.user_id || null;
        }
        case 'direct_message': {
            const r = await pool.query('SELECT sender_id FROM direct_messages WHERE id = $1', [contentId]);
            return r.rows[0]?.sender_id || null;
        }
        case 'community_photo': {
            const r = await pool.query('SELECT user_id FROM community_photos WHERE id = $1', [contentId]);
            return r.rows[0]?.user_id || null;
        }
        default:
            return null;
    }
}

// ── POST /api/reports/admin/:id/ban-author ──────────────────────────────────
router.post('/reports/admin/:id/ban-author', authRequired, adminOnly, async (req, res) => {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;

    try {
        const report = await pool.query('SELECT content_type, content_id FROM content_reports WHERE id = $1', [reportId]);
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        await pool.query(
            `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW() WHERE id = $2`,
            [reason, authorId]
        );
        await pool.query(`UPDATE content_reports SET status = 'resolved' WHERE id = $1`, [reportId]);

        return res.json({ success: true, authorId });
    } catch (err) {
        console.error('[reports] POST ban-author error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/reports/admin/:id/unban-author ─────────────────────────────────
router.post('/reports/admin/:id/unban-author', authRequired, adminOnly, async (req, res) => {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    try {
        const report = await pool.query('SELECT content_type, content_id FROM content_reports WHERE id = $1', [reportId]);
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        await pool.query(
            `UPDATE users SET is_banned = FALSE, banned_reason = NULL, banned_at = NULL WHERE id = $1`,
            [authorId]
        );

        return res.json({ success: true, authorId });
    } catch (err) {
        console.error('[reports] POST unban-author error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/reports/admin/:id/mute-author ──────────────────────────────────
router.post('/reports/admin/:id/mute-author', authRequired, adminOnly, async (req, res) => {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const hours = Math.min(720, Math.max(1, parseInt(req.body?.hours, 10) || 72));

    try {
        const report = await pool.query('SELECT content_type, content_id FROM content_reports WHERE id = $1', [reportId]);
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        await pool.query(
            `UPDATE users SET muted_until = NOW() + make_interval(hours => $1) WHERE id = $2`,
            [hours, authorId]
        );
        await pool.query(`UPDATE content_reports SET status = 'reviewed' WHERE id = $1`, [reportId]);

        return res.json({ success: true, authorId, hours });
    } catch (err) {
        console.error('[reports] POST mute-author error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── DELETE /api/reports/admin/:id/content ────────────────────────────────────
// Deletes the reported content itself (not the report row). user_profile
// reports can't be handled this way — use ban-author instead.
router.delete('/reports/admin/:id/content', authRequired, adminOnly, async (req, res) => {
    const reportId = parseInt(req.params.id, 10);
    if (!reportId) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    try {
        const report = await pool.query('SELECT content_type, content_id FROM content_reports WHERE id = $1', [reportId]);
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const { content_type: contentType, content_id: contentId } = report.rows[0];

        switch (contentType) {
            case 'listing':
                await pool.query('DELETE FROM listings WHERE id = $1', [contentId]);
                break;
            case 'forum_thread':
                await pool.query('DELETE FROM forum_threads WHERE id = $1', [contentId]);
                break;
            case 'forum_reply':
                await pool.query('DELETE FROM forum_replies WHERE id = $1', [contentId]);
                break;
            case 'direct_message':
                await pool.query('DELETE FROM direct_messages WHERE id = $1', [contentId]);
                break;
            case 'community_photo':
                await pool.query('DELETE FROM community_photos WHERE id = $1', [contentId]);
                break;
            default:
                return res.status(400).json({ success: false, error: 'This content type cannot be deleted here — use ban-author for user_profile reports.' });
        }

        await pool.query(`UPDATE content_reports SET status = 'resolved' WHERE id = $1`, [reportId]);

        return res.json({ success: true });
    } catch (err) {
        console.error('[reports] DELETE content error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
