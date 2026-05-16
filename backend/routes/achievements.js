// Achievements API route
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { ACHIEVEMENTS } = require('../utils/gamification');

router.get('/', authRequired, async (req, res) => {
    const userId = req.user.id;

    try {
        const [
            visitedRes, friendsRes, favRes, ownedRes, userRes,
            lessonsRes, courseRes, perfectRes, postsRes, dmsRes,
            upvotesRes, listingsRes, ebayRes, storedRes,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM user_console_visits WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_favorites WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_owned_consoles WHERE user_id = $1', [userId]),
            pool.query('SELECT id, created_at, avatar, bio FROM users WHERE id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_lessons WHERE user_id = $1 AND completed = true', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_lessons WHERE user_id = $1 AND quiz_score = 100', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM forum_threads WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM direct_messages WHERE sender_id = $1', [userId]),
            pool.query(
                `SELECT (SELECT COALESCE(SUM(upvotes),0) FROM forum_threads WHERE user_id=$1) +
                        (SELECT COALESCE(SUM(upvotes),0) FROM forum_replies WHERE user_id=$1) AS count`,
                [userId]
            ),
            pool.query('SELECT COUNT(*)::int AS count FROM listings WHERE user_id = $1', [userId]),
            pool.query(`SELECT COUNT(*)::int AS count FROM marketplace_accounts WHERE user_id = $1 AND provider = 'ebay'`, [userId]),
            pool.query('SELECT badge_id, earned_at, xp_awarded FROM user_achievements WHERE user_id = $1', [userId]),
        ]);

        const metrics = {
            lessons_completed:  lessonsRes.rows[0].count,
            courses_completed:  courseRes.rows[0].count,
            perfect_quizzes:    perfectRes.rows[0].count,
            consoles_visited:   visitedRes.rows[0].count,
            consoles_favorited: favRes.rows[0].count,
            consoles_owned:     ownedRes.rows[0].count,
            forum_posts:        postsRes.rows[0].count,
            friends_count:      friendsRes.rows[0].count,
            dms_sent:           dmsRes.rows[0].count,
            upvotes_received:   parseInt(upvotesRes.rows[0].count, 10) || 0,
            listings_created:   listingsRes.rows[0].count,
            ebay_connected:     ebayRes.rows[0].count > 0 ? 1 : 0,
            days_member:        Math.floor((Date.now() - new Date(userRes.rows[0].created_at)) / 86400000),
            profile_complete:   (userRes.rows[0].avatar && userRes.rows[0].bio) ? 1 : 0,
            user_id_value:      userRes.rows[0].id,
        };

        const storedMap = new Map(storedRes.rows.map(r => [r.badge_id, r]));
        const storedCount = storedMap.size;

        const achievements = ACHIEVEMENTS.map(ach => {
            const { type, threshold } = ach.condition;
            let value;
            if (type === 'user_id_under') {
                value = metrics.user_id_value < threshold ? 1 : 0;
            } else if (type === 'achievements_count') {
                value = storedCount;
            } else {
                value = metrics[type] ?? 0;
            }
            const stored = storedMap.get(ach.id);
            return {
                ...ach,
                unlocked: value >= threshold,
                earned_at: stored ? stored.earned_at : null,
                xp_awarded: stored ? stored.xp_awarded : null,
            };
        });

        res.json({ success: true, achievements });
    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ success: false, message: 'Server error fetching achievements.', achievements: [] });
    }
});

// GET /api/achievements/user/:username — Public achievement view for any user
router.get('/user/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const userResult = await pool.query(
            'SELECT id, created_at, avatar, bio FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.', achievements: [] });
        }
        const user = userResult.rows[0];
        const userId = user.id;

        const [
            visitedRes, friendsRes, favRes, ownedRes,
            lessonsRes, courseRes, perfectRes, postsRes, dmsRes,
            upvotesRes, listingsRes, ebayRes, storedRes,
        ] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM user_console_visits WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_favorites WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_owned_consoles WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_lessons WHERE user_id = $1 AND completed = true', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM user_lessons WHERE user_id = $1 AND quiz_score = 100', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM forum_threads WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*)::int AS count FROM direct_messages WHERE sender_id = $1', [userId]),
            pool.query(
                `SELECT (SELECT COALESCE(SUM(upvotes),0) FROM forum_threads WHERE user_id=$1) +
                        (SELECT COALESCE(SUM(upvotes),0) FROM forum_replies WHERE user_id=$1) AS count`,
                [userId]
            ),
            pool.query('SELECT COUNT(*)::int AS count FROM listings WHERE user_id = $1', [userId]),
            pool.query(`SELECT COUNT(*)::int AS count FROM marketplace_accounts WHERE user_id = $1 AND provider = 'ebay'`, [userId]),
            pool.query('SELECT badge_id, earned_at FROM user_achievements WHERE user_id = $1', [userId]),
        ]);

        const metrics = {
            lessons_completed:  lessonsRes.rows[0].count,
            courses_completed:  courseRes.rows[0].count,
            perfect_quizzes:    perfectRes.rows[0].count,
            consoles_visited:   visitedRes.rows[0].count,
            consoles_favorited: favRes.rows[0].count,
            consoles_owned:     ownedRes.rows[0].count,
            forum_posts:        postsRes.rows[0].count,
            friends_count:      friendsRes.rows[0].count,
            dms_sent:           dmsRes.rows[0].count,
            upvotes_received:   parseInt(upvotesRes.rows[0].count, 10) || 0,
            listings_created:   listingsRes.rows[0].count,
            ebay_connected:     ebayRes.rows[0].count > 0 ? 1 : 0,
            days_member:        Math.floor((Date.now() - new Date(user.created_at)) / 86400000),
            profile_complete:   (user.avatar && user.bio) ? 1 : 0,
            user_id_value:      user.id,
        };

        const storedMap = new Map(storedRes.rows.map(r => [r.badge_id, r]));
        const storedCount = storedMap.size;

        const achievements = ACHIEVEMENTS.map(ach => {
            const { type, threshold } = ach.condition;
            let value;
            if (type === 'user_id_under') {
                value = metrics.user_id_value < threshold ? 1 : 0;
            } else if (type === 'achievements_count') {
                value = storedCount;
            } else {
                value = metrics[type] ?? 0;
            }
            const stored = storedMap.get(ach.id);
            return {
                ...ach,
                unlocked: value >= threshold,
                earned_at: stored ? stored.earned_at : null,
            };
        });

        res.json({ success: true, achievements });
    } catch (err) {
        console.error('Error fetching public achievements:', err);
        res.status(500).json({ success: false, message: 'Server error.', achievements: [] });
    }
});

module.exports = router;
