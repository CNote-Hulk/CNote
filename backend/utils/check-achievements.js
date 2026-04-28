/**
 * Achievement check + emit utility
 * Call after any action that could unlock achievements.
 */
const pool = require('../db');

// Keep in sync with backend/routes/achievements.js BADGES
const BADGES = [
    // Learning
    { id: 'first_lesson',      name: 'First Lesson',       icon: '📝', category: 'learning' },
    { id: 'knowledge_seeker',  name: 'Knowledge Seeker',   icon: '🔍', category: 'learning' },
    { id: 'bookworm',          name: 'Bookworm',           icon: '📖', category: 'learning' },
    { id: 'course_finisher',   name: 'Course Finisher',    icon: '🎓', category: 'learning' },
    // Explorer
    { id: 'console_scout',     name: 'Console Scout',      icon: '🧭', category: 'explorer' },
    { id: 'retro_master',      name: 'Retro Master',       icon: '🕹️', category: 'explorer' },
    { id: 'archive_hunter',    name: 'Archive Hunter',     icon: '🗂️', category: 'explorer' },
    // Social
    { id: 'first_friend',      name: 'First Friend',       icon: '👋', category: 'social' },
    { id: 'social_butterfly',  name: 'Social Butterfly',   icon: '🦋', category: 'social' },
    { id: 'popular',           name: 'Popular',            icon: '🌟', category: 'social' },
    // Collector
    { id: 'first_fav',         name: 'First Favorite',     icon: '❤️', category: 'collector' },
    { id: 'collector_heart',   name: "Collector's Heart",  icon: '💝', category: 'collector' },
    { id: 'first_owned',       name: 'Owner',              icon: '🎮', category: 'collector' },
    { id: 'collector',         name: 'Collector',          icon: '📦', category: 'collector' },
    // Veteran
    { id: 'week_veteran',      name: 'Week Regular',       icon: '📅', category: 'veteran' },
    { id: 'month_veteran',     name: 'Monthly',            icon: '🗓️', category: 'veteran' },
    { id: 'year_veteran',      name: 'Veteran',            icon: '🏛️', category: 'veteran' },
];

// Ensure the persistence table exists
pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id   INTEGER NOT NULL,
        badge_id  TEXT    NOT NULL,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, badge_id)
    )
`).catch(err => console.error('user_achievements table init error:', err));

async function computeUnlockedIds(userId) {
    const [visitedRes, friendsRes, favRes, ownedRes, userRes, lessonsRes, courseRes] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM user_console_visits WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM user_favorites WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM user_owned_consoles WHERE user_id = $1', [userId]),
        pool.query('SELECT created_at FROM users WHERE id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM user_lessons WHERE user_id = $1 AND completed = true', [userId]),
        pool.query('SELECT COUNT(*) FROM user_course_progress WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
    ]);

    const visited    = parseInt(visitedRes.rows[0].count, 10);
    const friends    = parseInt(friendsRes.rows[0].count, 10);
    const favs       = parseInt(favRes.rows[0].count, 10);
    const owned      = parseInt(ownedRes.rows[0].count, 10);
    const lessons    = parseInt(lessonsRes.rows[0].count, 10);
    const courses    = parseInt(courseRes.rows[0].count, 10);
    const daysMember = Math.floor((Date.now() - new Date(userRes.rows[0].created_at)) / 86400000);

    const unlocked = new Set();

    // Learning
    if (lessons >= 1)  unlocked.add('first_lesson');
    if (lessons >= 5)  unlocked.add('knowledge_seeker');
    if (lessons >= 10) unlocked.add('bookworm');
    if (courses >= 1)  unlocked.add('course_finisher');

    // Explorer
    if (visited >= 3)  unlocked.add('console_scout');
    if (visited >= 10) unlocked.add('retro_master');
    if (visited >= 25) unlocked.add('archive_hunter');

    // Social
    if (friends >= 1)  unlocked.add('first_friend');
    if (friends >= 5)  unlocked.add('social_butterfly');
    if (friends >= 10) unlocked.add('popular');

    // Collector
    if (favs >= 1)     unlocked.add('first_fav');
    if (favs >= 5)     unlocked.add('collector_heart');
    if (owned >= 1)    unlocked.add('first_owned');
    if (owned >= 5)    unlocked.add('collector');

    // Veteran
    if (daysMember >= 7)   unlocked.add('week_veteran');
    if (daysMember >= 30)  unlocked.add('month_veteran');
    if (daysMember >= 365) unlocked.add('year_veteran');

    return unlocked;
}

/**
 * Check for newly unlocked achievements, persist them, and emit via Socket.io.
 */
async function checkAndEmitAchievements(io, userId) {
    try {
        const [currentUnlocked, storedRes] = await Promise.all([
            computeUnlockedIds(userId),
            pool.query('SELECT badge_id FROM user_achievements WHERE user_id = $1', [userId])
        ]);

        const storedIds     = new Set(storedRes.rows.map(r => r.badge_id));
        const newlyUnlocked = [...currentUnlocked].filter(id => !storedIds.has(id));
        if (newlyUnlocked.length === 0) return;

        for (const badgeId of newlyUnlocked) {
            await pool.query(
                'INSERT INTO user_achievements (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, badgeId]
            );
        }

        if (io) {
            io.to(String(userId)).emit('achievement_unlocked', { awardedIds: newlyUnlocked });
        }
    } catch (err) {
        console.error('checkAndEmitAchievements error:', err);
    }
}

module.exports = { checkAndEmitAchievements, BADGES };
