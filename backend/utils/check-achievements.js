/**
 * Achievement check + emit utility
 * Call after any action that could unlock achievements.
 * Computes current unlocked set, diffs against stored ones,
 * persists new ones, and emits via Socket.io to the user's room.
 */
const pool = require('../db');

// Keep in sync with backend/routes/achievements.js BADGES
const BADGES = [
    { id: 'console_scout',   name: 'Console Scout',     icon: '🧭' },
    { id: 'retro_master',    name: 'Retro Master',       icon: '🕹️' },
    { id: 'archive_hunter',  name: 'Archive Hunter',     icon: '🗂️' },
    { id: 'first_friend',    name: 'First Friend',       icon: '👋' },
    { id: 'social_butterfly',name: 'Social Butterfly',   icon: '🦋' },
    { id: 'popular',         name: 'Popular',            icon: '🌟' },
    { id: 'first_fav',       name: 'First Favorite',     icon: '❤️' },
    { id: 'collector_heart', name: "Collector's Heart",  icon: '💝' },
    { id: 'first_owned',     name: 'Owner',              icon: '🎮' },
    { id: 'collector',       name: 'Collector',          icon: '📦' },
    { id: 'week_veteran',    name: 'Week Regular',       icon: '📅' },
    { id: 'month_veteran',   name: 'Monthly',            icon: '🗓️' },
    { id: 'year_veteran',    name: 'Veteran',            icon: '🏛️' },
];

// Ensure the persistence table exists (idempotent, runs once on first import)
pool.query(`
    CREATE TABLE IF NOT EXISTS user_achievements (
        user_id   INTEGER NOT NULL,
        badge_id  TEXT    NOT NULL,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (user_id, badge_id)
    )
`).catch(err => console.error('user_achievements table init error:', err));

async function computeUnlockedIds(userId) {
    const [visitedRes, friendsRes, favRes, ownedRes, userRes] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM user_console_visits WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM friends WHERE user1_id = $1 OR user2_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM user_favorites WHERE user_id = $1', [userId]),
        pool.query('SELECT COUNT(*) FROM user_owned_consoles WHERE user_id = $1', [userId]),
        pool.query('SELECT created_at FROM users WHERE id = $1', [userId])
    ]);

    const visited = parseInt(visitedRes.rows[0].count, 10);
    const friends = parseInt(friendsRes.rows[0].count, 10);
    const favs    = parseInt(favRes.rows[0].count, 10);
    const owned   = parseInt(ownedRes.rows[0].count, 10);
    const daysMember = Math.floor((Date.now() - new Date(userRes.rows[0].created_at)) / 86400000);

    const unlocked = new Set();
    if (visited >= 3)  unlocked.add('console_scout');
    if (visited >= 10) unlocked.add('retro_master');
    if (visited >= 25) unlocked.add('archive_hunter');
    if (friends >= 1)  unlocked.add('first_friend');
    if (friends >= 5)  unlocked.add('social_butterfly');
    if (friends >= 10) unlocked.add('popular');
    if (favs >= 1)     unlocked.add('first_fav');
    if (favs >= 5)     unlocked.add('collector_heart');
    if (owned >= 1)    unlocked.add('first_owned');
    if (owned >= 5)    unlocked.add('collector');
    if (daysMember >= 7)   unlocked.add('week_veteran');
    if (daysMember >= 30)  unlocked.add('month_veteran');
    if (daysMember >= 365) unlocked.add('year_veteran');
    return unlocked;
}

/**
 * Check for newly unlocked achievements, persist them, and emit via Socket.io.
 * @param {import('socket.io').Server} io - Socket.io server instance (req.app.get('io'))
 * @param {number} userId
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

        // Persist newly unlocked badges
        for (const badgeId of newlyUnlocked) {
            await pool.query(
                'INSERT INTO user_achievements (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [userId, badgeId]
            );
        }

        // Emit to every connected socket of this user (all devices)
        if (io) {
            io.to(String(userId)).emit('achievement_unlocked', { awardedIds: newlyUnlocked });
        }
    } catch (err) {
        console.error('checkAndEmitAchievements error:', err);
    }
}

module.exports = { checkAndEmitAchievements, BADGES };
