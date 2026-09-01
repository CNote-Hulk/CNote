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
const { publicUrlForKey } = require('../utils/objectStorage');

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

// content_reports.id is a uuid column (the live table predates and doesn't match this
// file's own `CREATE TABLE IF NOT EXISTS ... id SERIAL` in db.js — it was provisioned some
// other way, before that migration code existed). Every :id route below used to do
// `parseInt(req.params.id, 10)`, which silently truncated a real uuid like
// "428e4567-e89b-..." down to just 428 (parseInt stops at the first non-digit) and sent
// that mangled value to Postgres — surfaced live as "invalid input syntax for type uuid:
// '428'" on every PATCH/POST/DELETE admin-reports action. Validate as a uuid string instead.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidReportId(id) {
    return typeof id === 'string' && UUID_REGEX.test(id);
}

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
            r.content_image = null;
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
                    const l = await pool.query('SELECT user_id, title, description, images FROM listings WHERE id = $1', [r.content_id]);
                    const row = l.rows[0];
                    r.content_label = row?.title || `Listing #${r.content_id}`;
                    r.content_link = `/html/pages/community.html#listing-${r.content_id}`;
                    r.content_body = row?.description || null;
                    r.author_id = row?.user_id || null;
                    // images is a JSON-stringified array of object-storage keys (see
                    // PUT /marketplace/listings/:id's own RETURNING * note) — first photo only,
                    // this is a moderation preview, not a full gallery.
                    try {
                        const imgs = row?.images ? JSON.parse(row.images) : [];
                        r.content_image = Array.isArray(imgs) && imgs[0] ? publicUrlForKey(imgs[0]) : null;
                    } catch { r.content_image = null; }
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
                    const p = await pool.query('SELECT user_id, caption, image_key FROM community_photos WHERE id = $1', [r.content_id]);
                    const row = p.rows[0];
                    r.content_label = `Photo #${r.content_id}`;
                    r.content_body = row?.caption || null;
                    r.author_id = row?.user_id || null;
                    r.content_image = row?.image_key ? publicUrlForKey(row.image_key) : null;
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
    const reportId = req.params.id;
    if (!isValidReportId(reportId)) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const { status } = req.body || {};
    if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
        const result = await pool.query(
            `UPDATE content_reports SET status = $1 WHERE id = $2
             RETURNING id, status, content_type, content_id, reporter_contact, reporter_id`,
            [status, reportId]
        );
        if (!result.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });
        await notifyReportOutcome(result.rows[0], status);
        return res.json({ success: true, report: { id: result.rows[0].id, status: result.rows[0].status } });
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

// ── Outcome emails (dismiss/resolve) ────────────────────────────────────────
// Andrei: on dismiss, email the reporter it wasn't serious enough to act on; on
// resolve, email BOTH the reporter and the reported user (whose content/account was
// actioned) that the report was resolved. Fire-and-forget, same pattern as the
// admin-notification email in POST /reports below — a failed send must never break the
// status-change response.

async function getReporterEmail(report) {
    if (report.reporter_contact) return report.reporter_contact;
    if (report.reporter_id) {
        const r = await pool.query('SELECT email FROM users WHERE id = $1', [report.reporter_id]);
        return r.rows[0]?.email || null;
    }
    return null;
}

async function getUserEmail(userId) {
    if (!userId) return null;
    const r = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    return r.rows[0]?.email || null;
}

async function sendOutcomeEmail(to, subject, text) {
    if (!to) return;
    try {
        await resend.emails.send({ from: FROM, to, subject, text });
    } catch (err) {
        console.error('[reports] outcome email failed:', err.message || err);
    }
}

// `report` needs content_type, content_id, reporter_contact, reporter_id.
// `authorIdHint` — pass the already-resolved author id when the caller has one
// (ban-author/mute-author already call resolveAuthorId for their own purposes) to
// avoid resolving it twice.
//
// (2026-09-01) Wrapped the whole body in try/catch after a real bug: resolveAuthorId's
// query throws "invalid input syntax for type integer" for a report whose content_id
// isn't a real numeric id (hit live via a couple of synthetic test rows with content_id
// like "debug-test-002") — that exception was propagating all the way up through the
// PATCH/POST route handlers, turning an already-successful status change/ban/mute into a
// 500 response, even though the actual moderation action had already committed. This
// function must never be able to break the response it's attached to — sendOutcomeEmail
// already isolated the email-send itself, but not the DB lookups feeding it.
async function notifyReportOutcome(report, newStatus, authorIdHint) {
    try {
        await notifyReportOutcomeInner(report, newStatus, authorIdHint);
    } catch (err) {
        console.error('[reports] notifyReportOutcome failed (non-fatal):', err.message || err);
    }
}

async function notifyReportOutcomeInner(report, newStatus, authorIdHint) {
    if (newStatus !== 'dismissed' && newStatus !== 'resolved') return;
    const label = report.content_type.replace(/_/g, ' ');
    const reporterEmail = await getReporterEmail(report);

    if (newStatus === 'dismissed') {
        await sendOutcomeEmail(
            reporterEmail,
            '[Console Notebook] Your report has been reviewed',
            `Thanks for reporting a ${label} on Console Notebook.\n\n` +
            `Our moderation team reviewed it and determined no action was necessary — it didn't ` +
            `appear serious enough or in violation of our guidelines.\n\n` +
            `If you believe this was a mistake or have more details, feel free to submit a new report.\n\n` +
            `— Console Notebook Moderation`
        );
        return;
    }

    // resolved
    await sendOutcomeEmail(
        reporterEmail,
        '[Console Notebook] Your report has been resolved',
        `Thanks for reporting a ${label} on Console Notebook.\n\n` +
        `Our moderation team reviewed it and took action.\n\n` +
        `— Console Notebook Moderation`
    );
    const authorId = authorIdHint !== undefined ? authorIdHint : await resolveAuthorId(report.content_type, report.content_id);
    const authorEmail = await getUserEmail(authorId);
    await sendOutcomeEmail(
        authorEmail,
        '[Console Notebook] Your content was reviewed by our moderation team',
        `A report was filed regarding your ${label} on Console Notebook.\n\n` +
        `After review, our moderation team took action on it. If you have questions, please contact support.\n\n` +
        `— Console Notebook Moderation`
    );
}

// ── POST /api/reports/admin/:id/ban-author ──────────────────────────────────
// Body: { reason?, hours? }. Omit `hours` (or send 0/falsy) for a permanent ban;
// a positive integer (1–8760, capped at one year) makes it a temporary ban that
// auto-lifts — see middleware/auth.js's isActivelyBanned/liftExpiredBan.
router.post('/reports/admin/:id/ban-author', authRequired, adminOnly, async (req, res) => {
    const reportId = req.params.id;
    if (!isValidReportId(reportId)) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
    const rawHours = parseInt(req.body?.hours, 10);
    const hours = rawHours > 0 ? Math.min(8760, rawHours) : null; // null = permanent

    try {
        const report = await pool.query(
            'SELECT content_type, content_id, reporter_contact, reporter_id FROM content_reports WHERE id = $1',
            [reportId]
        );
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        if (hours) {
            await pool.query(
                `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW(), banned_until = NOW() + make_interval(hours => $2) WHERE id = $3`,
                [reason, hours, authorId]
            );
        } else {
            await pool.query(
                `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW(), banned_until = NULL WHERE id = $2`,
                [reason, authorId]
            );
        }
        await pool.query(`UPDATE content_reports SET status = 'resolved' WHERE id = $1`, [reportId]);
        await notifyReportOutcome(report.rows[0], 'resolved', authorId);

        return res.json({ success: true, authorId, hours });
    } catch (err) {
        console.error('[reports] POST ban-author error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/reports/admin/:id/unban-author ─────────────────────────────────
router.post('/reports/admin/:id/unban-author', authRequired, adminOnly, async (req, res) => {
    const reportId = req.params.id;
    if (!isValidReportId(reportId)) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    try {
        const report = await pool.query('SELECT content_type, content_id FROM content_reports WHERE id = $1', [reportId]);
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        await pool.query(
            `UPDATE users SET is_banned = FALSE, banned_reason = NULL, banned_at = NULL, banned_until = NULL WHERE id = $1`,
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
    const reportId = req.params.id;
    if (!isValidReportId(reportId)) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    const hours = Math.min(720, Math.max(1, parseInt(req.body?.hours, 10) || 72));

    try {
        const report = await pool.query(
            'SELECT content_type, content_id, reporter_contact, reporter_id FROM content_reports WHERE id = $1',
            [reportId]
        );
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const authorId = await resolveAuthorId(report.rows[0].content_type, report.rows[0].content_id);
        if (!authorId) return res.status(404).json({ success: false, error: 'Could not resolve the content author.' });

        await pool.query(
            `UPDATE users SET muted_until = NOW() + make_interval(hours => $1) WHERE id = $2`,
            [hours, authorId]
        );
        // (2026-09-01) Now counts as "resolving" the report, same as ban-author/delete-
        // content, per Andrei: clicking "Resolve" offers ban/mute/etc. as the actual
        // resolving action — so mute concludes with 'resolved' (was 'reviewed') and
        // triggers the same outcome emails.
        await pool.query(`UPDATE content_reports SET status = 'resolved' WHERE id = $1`, [reportId]);
        await notifyReportOutcome(report.rows[0], 'resolved', authorId);

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
    const reportId = req.params.id;
    if (!isValidReportId(reportId)) return res.status(400).json({ success: false, error: 'Invalid report ID.' });

    try {
        const report = await pool.query(
            'SELECT content_type, content_id, reporter_contact, reporter_id FROM content_reports WHERE id = $1',
            [reportId]
        );
        if (!report.rows.length) return res.status(404).json({ success: false, error: 'Report not found.' });

        const { content_type: contentType, content_id: contentId } = report.rows[0];
        // Resolve the author BEFORE deleting the content — the row (and its user_id/
        // sender_id column) won't exist to look up afterward.
        const authorId = await resolveAuthorId(contentType, contentId);

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
        await notifyReportOutcome(report.rows[0], 'resolved', authorId);

        return res.json({ success: true });
    } catch (err) {
        console.error('[reports] DELETE content error:', err.message || err);
        return res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
