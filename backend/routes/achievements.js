// Achievements API route
const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');

// Static badge definitions (sync with frontend)
const BADGES = [
    { id: 'first_steps', name: 'First Steps', description: 'Complete 1 lesson (finish a lesson quiz).', icon: '🎯' },
    { id: 'starter_pack', name: 'Starter Pack', description: 'Complete 3 lessons.', icon: '🧩' },
    { id: 'tech_explorer', name: 'Tech Explorer', description: 'Complete 5 lessons.', icon: '🔬' },
    { id: 'bookworm', name: 'Bookworm', description: 'Complete 15 lessons.', icon: '📚' },
    { id: 'grinder_25', name: 'Grinder', description: 'Complete 25 lessons.', icon: '⚙️' },
    { id: 'halfway', name: 'Halfway There', description: 'Reach 50% progress in a course.', icon: '⭐' },
    { id: 'almost_there', name: 'Almost There', description: 'Reach 80% progress in a course.', icon: '🚀' },
    { id: 'console_doctor', name: 'Console Doctor', description: 'Complete the entire course (100%).', icon: '🔧' },
    { id: 'quiz_rookie', name: 'Quiz Rookie', description: 'Complete your first quiz.', icon: '❓' },
    { id: 'quiz_veteran', name: 'Quiz Veteran', description: 'Complete 20 quizzes in total.', icon: '🧠' },
    { id: 'perfect_hit', name: 'Perfect Hit', description: 'Score 100% on a quiz.', icon: '💯' },
    { id: 'perfect_streak', name: 'Perfect Streak', description: 'Score 100% on 5 different quizzes.', icon: '🏅' },
    { id: 'console_scout', name: 'Console Scout', description: 'Visit 3 console pages.', icon: '🧭' },
    { id: 'retro_master', name: 'Retro Master', description: 'Visit 10 console pages.', icon: '🕹️' },
    { id: 'archive_hunter', name: 'Archive Hunter', description: 'Visit 25 console pages.', icon: '🗂️' },
    { id: 'all_rounder', name: 'All-Rounder', description: 'Complete 15 lessons and visit 10 consoles.', icon: '👑' }
];

// GET /api/achievements
router.get('/', authRequired, async (req, res) => {
    const userId = req.user.id;
    const pool = require('../db');
    let visitedCount = 0;
    try {
        // Count visited consoles for this user
        const result = await pool.query('SELECT COUNT(*) FROM user_console_visits WHERE user_id = $1', [userId]);
        visitedCount = parseInt(result.rows[0].count, 10);
    } catch (err) {
        console.error('Error counting visited consoles:', err);
    }

    // Unlock logic for visited consoles achievements
    const unlockedIds = new Set();
    if (visitedCount >= 3) unlockedIds.add('console_scout');
    if (visitedCount >= 10) unlockedIds.add('retro_master');
    if (visitedCount >= 25) unlockedIds.add('archive_hunter');
    // All-Rounder: needs 15 lessons and 10 consoles, but we only check consoles for now
    // (leave locked until lesson data is available)

    const achievements = BADGES.map(b => ({ ...b, unlocked: unlockedIds.has(b.id) }));
    res.json({ success: true, achievements });
});

module.exports = router;
