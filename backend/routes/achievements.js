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
    // TODO: Replace with real logic to check which badges are unlocked for req.user.id
    // For now, return all locked (demo)
    // You should implement logic to check user progress and mark unlocked badges
    const userId = req.user.id;
    // Example: get unlocked badge ids from DB (not implemented)
    const unlockedIds = new Set();
    const achievements = BADGES.map(b => ({ ...b, unlocked: unlockedIds.has(b.id) }));
    res.json({ success: true, achievements });
});

module.exports = router;
