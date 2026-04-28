// Achievements API route
const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');

const BADGES = [
    // Learning
    { id: 'first_lesson',     name: 'First Lesson',       description: 'Complete your first lesson.',         icon: '📝', category: 'learning' },
    { id: 'knowledge_seeker', name: 'Knowledge Seeker',   description: 'Complete 5 lessons.',                 icon: '🔍', category: 'learning' },
    { id: 'bookworm',         name: 'Bookworm',           description: 'Complete 10 lessons.',                icon: '📖', category: 'learning' },
    { id: 'course_finisher',  name: 'Course Finisher',    description: 'Complete your first full course.',    icon: '🎓', category: 'learning' },
    // Explorer
    { id: 'console_scout',   name: 'Console Scout',      description: 'Visit 3 console pages.',              icon: '🧭', category: 'explorer' },
    { id: 'retro_master',    name: 'Retro Master',        description: 'Visit 10 console pages.',             icon: '🕹️', category: 'explorer' },
    { id: 'archive_hunter',  name: 'Archive Hunter',      description: 'Visit 25 console pages.',             icon: '🗂️', category: 'explorer' },
    // Social
    { id: 'first_friend',     name: 'First Friend',       description: 'Make your first friend.',             icon: '👋', category: 'social' },
    { id: 'social_butterfly', name: 'Social Butterfly',   description: 'Have 5 friends on the platform.',    icon: '🦋', category: 'social' },
    { id: 'popular',          name: 'Popular',            description: 'Have 10 friends on the platform.',   icon: '🌟', category: 'social' },
    // Collector
    { id: 'first_fav',        name: 'First Favorite',     description: 'Add your first console to favorites.',       icon: '❤️', category: 'collector' },
    { id: 'collector_heart',  name: "Collector's Heart",  description: 'Have 5 favorite consoles.',                  icon: '💝', category: 'collector' },
    { id: 'first_owned',      name: 'Owner',              description: 'Add your first console to your collection.', icon: '🎮', category: 'collector' },
    { id: 'collector',        name: 'Collector',          description: 'Own 5 consoles in your collection.',         icon: '📦', category: 'collector' },
    // Veteran
    { id: 'week_veteran',     name: 'Week Regular',       description: 'Be a member for 7 days.',   icon: '📅', category: 'veteran' },
    { id: 'month_veteran',    name: 'Monthly',            description: 'Be a member for 30 days.',  icon: '🗓️', category: 'veteran' },
    { id: 'year_veteran',     name: 'Veteran',            description: 'Be a member for 365 days.', icon: '🏛️', category: 'veteran' },
];

router.get('/', authRequired, async (req, res) => {
    const userId = req.user.id;
    const pool = require('../db');

    try {
        const [visitedRes, friendsRes, favRes, ownedRes, userRes, lessonsRes, courseRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM user_console_visits WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) AS total_friends FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
            pool.query('SELECT COUNT(*) AS total_favs FROM user_favorites WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) AS total_owned FROM user_owned_consoles WHERE user_id = $1', [userId]),
            pool.query('SELECT created_at FROM users WHERE id = $1', [userId]),
            pool.query('SELECT COUNT(*) AS total_lessons FROM user_lessons WHERE user_id = $1 AND completed = true', [userId]),
            pool.query('SELECT COUNT(*) AS total_courses FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
        ]);

        const visited    = parseInt(visitedRes.rows[0].count, 10);
        const friends    = parseInt(friendsRes.rows[0].total_friends, 10);
        const favs       = parseInt(favRes.rows[0].total_favs, 10);
        const owned      = parseInt(ownedRes.rows[0].total_owned, 10);
        const lessons    = parseInt(lessonsRes.rows[0].total_lessons, 10);
        const courses    = parseInt(courseRes.rows[0].total_courses, 10);
        const daysMember = Math.floor((Date.now() - new Date(userRes.rows[0].created_at)) / (1000 * 60 * 60 * 24));

        const unlockedIds = new Set();

        // Learning
        if (lessons >= 1)  unlockedIds.add('first_lesson');
        if (lessons >= 5)  unlockedIds.add('knowledge_seeker');
        if (lessons >= 10) unlockedIds.add('bookworm');
        if (courses >= 1)  unlockedIds.add('course_finisher');

        // Explorer
        if (visited >= 3)  unlockedIds.add('console_scout');
        if (visited >= 10) unlockedIds.add('retro_master');
        if (visited >= 25) unlockedIds.add('archive_hunter');

        // Social
        if (friends >= 1)  unlockedIds.add('first_friend');
        if (friends >= 5)  unlockedIds.add('social_butterfly');
        if (friends >= 10) unlockedIds.add('popular');

        // Collector
        if (favs >= 1)     unlockedIds.add('first_fav');
        if (favs >= 5)     unlockedIds.add('collector_heart');
        if (owned >= 1)    unlockedIds.add('first_owned');
        if (owned >= 5)    unlockedIds.add('collector');

        // Veteran
        if (daysMember >= 7)   unlockedIds.add('week_veteran');
        if (daysMember >= 30)  unlockedIds.add('month_veteran');
        if (daysMember >= 365) unlockedIds.add('year_veteran');

        const achievements = BADGES.map(b => ({ ...b, unlocked: unlockedIds.has(b.id) }));
        res.json({ success: true, achievements });

    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ success: false, message: 'Server error fetching achievements.', achievements: [] });
    }
});

module.exports = router;
