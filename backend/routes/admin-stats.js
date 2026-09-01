/* ─────────────────────────────────────────
   FILE: admin-stats.js
   DESCRIPTION: Admin-only growth/activity dashboard — /api/admin.
   Single aggregate endpoint built entirely from data already present
   in the DB (no dedicated analytics tracking); active-user counts are
   an approximation derived from user_sessions, not exact page-view tracking.
   ───────────────────────────────────────── */
/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const { describeAction, sendOutcomeEmail, getUserEmail } = require('./reports');

const router = express.Router();

router.use(authRequired, adminOnly);

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [
            totalUsers, totalListings, totalThreads, totalReplies,
            signupsByDay, activeUsers7d, activeUsers30d, listingsByStatus,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM users'),
            pool.query('SELECT COUNT(*)::int AS count FROM listings'),
            pool.query('SELECT COUNT(*)::int AS count FROM forum_threads'),
            pool.query('SELECT COUNT(*)::int AS count FROM forum_replies'),
            pool.query(`
                SELECT DATE(created_at) AS day, COUNT(*)::int AS count
                FROM users
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY day ORDER BY day
            `),
            pool.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_sessions WHERE last_activity > NOW() - INTERVAL '7 days'`),
            pool.query(`SELECT COUNT(DISTINCT user_id)::int AS count FROM user_sessions WHERE last_activity > NOW() - INTERVAL '30 days'`),
            pool.query(`SELECT COALESCE(status, 'active') AS status, COUNT(*)::int AS count FROM listings GROUP BY status`),
        ]);

        res.json({
            success: true,
            totalUsers: totalUsers.rows[0].count,
            totalListings: totalListings.rows[0].count,
            totalThreads: totalThreads.rows[0].count,
            totalReplies: totalReplies.rows[0].count,
            signupsByDay: signupsByDay.rows,
            activeUsers7d: activeUsers7d.rows[0].count,
            activeUsers30d: activeUsers30d.rows[0].count,
            listingsByStatus: listingsByStatus.rows,
        });
    } catch (err) {
        console.error('[admin-stats] GET /stats error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/admin/moderated-users ──────────────────────────────────────────
// Andrei: "a list where you can see everyone you've banned or muted, so you can
// lift it if it was a mistake" — everyone currently under an active sanction,
// independent of which report (if any) led to it.
router.get('/moderated-users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, username, avatar, is_banned, banned_reason, banned_at, banned_until, muted_until
            FROM users
            WHERE is_banned = TRUE OR (muted_until IS NOT NULL AND muted_until > NOW())
            ORDER BY GREATEST(COALESCE(banned_at, 'epoch'), COALESCE(muted_until, 'epoch')) DESC
        `);
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('[admin-stats] GET /moderated-users error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── GET /api/admin/users/:id/status ─────────────────────────────────────────
// Lets an admin-only profile-page widget know a user's current ban/mute state
// without fetching the entire moderated-users list just to check one id.
router.get('/users/:id/status', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    try {
        const r = await pool.query(
            `SELECT is_banned, banned_reason, banned_at, banned_until, muted_until FROM users WHERE id = $1`,
            [userId]
        );
        if (!r.rows.length) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json({ success: true, ...r.rows[0] });
    } catch (err) {
        console.error('[admin-stats] GET user status error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/admin/users/:id/ban ───────────────────────────────────────────
// Direct-by-user-id ban — Andrei: "I'm admin, I should be able to do this from a
// user's profile too", not just through a content report. Body: { reason?, hours? } —
// same semantics as reports.js's ban-author (omitted/0 hours = permanent).
router.post('/users/:id/ban', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
    const rawHours = parseInt(req.body?.hours, 10);
    const hours = rawHours > 0 ? Math.min(8760, rawHours) : null;
    try {
        if (hours) {
            await pool.query(
                `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW(), banned_until = NOW() + make_interval(hours => $2) WHERE id = $3`,
                [reason, hours, userId]
            );
        } else {
            await pool.query(
                `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW(), banned_until = NULL WHERE id = $2`,
                [reason, userId]
            );
        }
        // Same "why and for how long" email as a report-triggered ban — this path has no
        // report/reporter, just the banned user themselves.
        const email = await getUserEmail(userId);
        await sendOutcomeEmail(
            email,
            '[Console Notebook] Your account was reviewed by our moderation team',
            `After review, our moderation team took the following action on your Console Notebook account: ` +
            `${describeAction({ type: 'ban', reason, hours })}\n\n` +
            `If you have questions, please contact support.\n\n— Console Notebook Moderation`
        );
        res.json({ success: true, hours });
    } catch (err) {
        console.error('[admin-stats] POST ban error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/admin/users/:id/mute ──────────────────────────────────────────
router.post('/users/:id/mute', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    const hours = Math.min(720, Math.max(1, parseInt(req.body?.hours, 10) || 72));
    try {
        await pool.query(`UPDATE users SET muted_until = NOW() + make_interval(hours => $1) WHERE id = $2`, [hours, userId]);
        const email = await getUserEmail(userId);
        await sendOutcomeEmail(
            email,
            '[Console Notebook] Your account was reviewed by our moderation team',
            `After review, our moderation team took the following action on your Console Notebook account: ` +
            `${describeAction({ type: 'mute', hours })}\n\n` +
            `If you have questions, please contact support.\n\n— Console Notebook Moderation`
        );
        res.json({ success: true, hours });
    } catch (err) {
        console.error('[admin-stats] POST mute error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/admin/users/:id/unban ─────────────────────────────────────────
// Direct-by-user-id unban — unlike reports.js's unban-author, doesn't require a
// report to hang off of (this list isn't tied to any specific report).
router.post('/users/:id/unban', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    try {
        await pool.query(
            `UPDATE users SET is_banned = FALSE, banned_reason = NULL, banned_at = NULL, banned_until = NULL WHERE id = $1`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[admin-stats] POST unban error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

// ── POST /api/admin/users/:id/unmute ────────────────────────────────────────
router.post('/users/:id/unmute', async (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    try {
        await pool.query(`UPDATE users SET muted_until = NULL WHERE id = $1`, [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('[admin-stats] POST unmute error:', err.message || err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
