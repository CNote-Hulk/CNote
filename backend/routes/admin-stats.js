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

module.exports = router;
