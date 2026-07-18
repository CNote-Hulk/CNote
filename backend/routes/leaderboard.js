/* ─────────────────────────────────────────
   FILE: leaderboard.js
   DESCRIPTION: Public XP leaderboard. No auth required — visible to
   logged-out visitors (community-welcome-page.html links here). Users
   who set show_stats=false are excluded, same privacy flag statistici.html
   and user-profile.html already respect.
   ───────────────────────────────────────── */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authOptional } = require('../middleware/auth');
const { getLevelFromXP } = require('../utils/gamification');

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

// GET /api/leaderboard?limit=&offset= — top users by XP
router.get('/', authOptional, async (req, res) => {
    try {
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
        const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

        const [rowsResult, countResult] = await Promise.all([
            pool.query(
                `SELECT id, username, avatar, xp
                 FROM users
                 WHERE show_stats = true
                 ORDER BY xp DESC, id ASC
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
            pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE show_stats = true`),
        ]);

        const users = rowsResult.rows.map((u, i) => ({
            rank: offset + i + 1,
            id: u.id,
            username: u.username,
            avatar: u.avatar || '',
            xp: u.xp,
            level: getLevelFromXP(u.xp),
        }));

        let you = null;
        if (req.user) {
            const meResult = await pool.query(
                `SELECT xp, show_stats FROM users WHERE id = $1`,
                [req.user.id]
            );
            const me = meResult.rows[0];
            if (me && me.show_stats) {
                const aheadResult = await pool.query(
                    `SELECT COUNT(*)::int AS count FROM users WHERE show_stats = true AND xp > $1`,
                    [me.xp]
                );
                you = {
                    rank: aheadResult.rows[0].count + 1,
                    id: req.user.id,
                    username: req.user.username,
                    xp: me.xp,
                    level: getLevelFromXP(me.xp),
                };
            }
        }

        res.json({
            success: true,
            users,
            total: countResult.rows[0].count,
            limit,
            offset,
            you,
        });
    } catch (err) {
        console.error('GET /api/leaderboard error:', err.message || err);
        res.status(500).json({ success: false, error: 'Could not load leaderboard.' });
    }
});

module.exports = router;
