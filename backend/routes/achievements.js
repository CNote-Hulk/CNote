// Achievements API route
const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');

// Static badge definitions (sync with frontend)
const BADGES = [
    { id: 'console_scout', name: 'Console Scout', description: 'Visit 3 console pages.', icon: '🧭' },
    { id: 'retro_master', name: 'Retro Master', description: 'Visit 10 console pages.', icon: '🕹️' },
    { id: 'archive_hunter', name: 'Archive Hunter', description: 'Visit 25 console pages.', icon: '🗂️' },
    { id: 'first_friend', name: 'First Friend', description: 'Make your first friend on the platform.', icon: '👋' },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Have 5 friends on the platform.', icon: '🦋' },
    { id: 'popular', name: 'Popular', description: 'Have 10 friends on the platform.', icon: '🌟' },
    { id: 'first_fav', name: 'First Favorite', description: 'Add your first console to favorites.', icon: '❤️' },
    { id: 'collector_heart', name: "Collector's Heart", description: 'Have 5 favorite consoles.', icon: '💝' },
    { id: 'first_owned', name: 'Owner', description: 'Add your first console to your collection.', icon: '🎮' },
    { id: 'collector', name: 'Collector', description: 'Own 5 consoles in your collection.', icon: '📦' },
    { id: 'week_veteran', name: 'Week Regular', description: 'Be a member for 7 days.', icon: '📅' },
    { id: 'month_veteran', name: 'Monthly', description: 'Be a member for 30 days.', icon: '🗓️' },
    { id: 'year_veteran', name: 'Veteran', description: 'Be a member for 365 days.', icon: '🏛️' },
];

router.get('/', authRequired, async (req, res) => {
    const userId = req.user.id;
    const pool = require('../db');

    try {
        const [
            visitedRes,
            friendsRes,
            favRes,
            ownedRes,
            userRes
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM user_console_visits WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) as total_friends FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
            pool.query('SELECT COUNT(*) as total_favs FROM user_favorites WHERE user_id = $1', [userId]),
            pool.query('SELECT COUNT(*) as total_owned FROM user_owned_consoles WHERE user_id = $1', [userId]),
            pool.query('SELECT created_at FROM users WHERE id = $1', [userId])
        ]);

        const visitedCount = parseInt(visitedRes.rows[0].count, 10);
        const totalFriends = parseInt(friendsRes.rows[0].total_friends, 10);
        const totalFavs = parseInt(favRes.rows[0].total_favs, 10);
        const totalOwned = parseInt(ownedRes.rows[0].total_owned, 10);
        const createdAt = new Date(userRes.rows[0].created_at);
        const now = new Date();
        const daysMember = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        const unlockedIds = new Set();

        // Visited consoles
        if (visitedCount >= 3) unlockedIds.add('console_scout');
        if (visitedCount >= 10) unlockedIds.add('retro_master');
        if (visitedCount >= 25) unlockedIds.add('archive_hunter');

        // Friends
        if (totalFriends >= 1) unlockedIds.add('first_friend');
        if (totalFriends >= 5) unlockedIds.add('social_butterfly');
        if (totalFriends >= 10) unlockedIds.add('popular');

        // Favorites
        if (totalFavs >= 1) unlockedIds.add('first_fav');
        if (totalFavs >= 5) unlockedIds.add('collector_heart');

        // Owned consoles
        if (totalOwned >= 1) unlockedIds.add('first_owned');
        if (totalOwned >= 5) unlockedIds.add('collector');

        // Veteran
        if (daysMember >= 7) unlockedIds.add('week_veteran');
        if (daysMember >= 30) unlockedIds.add('month_veteran');
        if (daysMember >= 365) unlockedIds.add('year_veteran');

        let achievements = BADGES.map(b => ({ ...b, unlocked: unlockedIds.has(b.id) }));
        if (!Array.isArray(achievements)) achievements = [];
        res.json({ success: true, achievements: achievements || [] });

    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ success: false, message: 'Server error fetching achievements.', achievements: [] });
    }
});

module.exports = router;
