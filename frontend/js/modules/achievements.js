/**
 * Achievements Module
 * Badge system tracked in localStorage
 */

// import { ProgressModule } from './progress.js'; // unused while course/quiz badges are in working

export const AchievementsModule = {
    STORAGE_KEY: 'cn_achievements',
    VISITED_STORAGE_KEY: 'cn_visited_consoles',
    QUIZ_STATS_KEY: 'cn_quiz_stats',

    BADGES: [
        // -- Lesson badges (in working) --
        // { id: 'first_steps', name: 'First Steps', description: 'Complete 1 lesson (finish a lesson quiz).', icon: '🎯' },
        // { id: 'starter_pack', name: 'Starter Pack', description: 'Complete 3 lessons.', icon: '🧩' },
        // { id: 'tech_explorer', name: 'Tech Explorer', description: 'Complete 5 lessons.', icon: '🔬' },
        // { id: 'bookworm', name: 'Bookworm', description: 'Complete 15 lessons.', icon: '📚' },
        // { id: 'grinder_25', name: 'Grinder', description: 'Complete 25 lessons.', icon: '⚙️' },
        // { id: 'halfway', name: 'Halfway There', description: 'Reach 50% progress in a course.', icon: '⭐' },
        // { id: 'almost_there', name: 'Almost There', description: 'Reach 80% progress in a course.', icon: '🚀' },
        // { id: 'console_doctor', name: 'Console Doctor', description: 'Complete the entire course (100%).', icon: '🔧' },
        // -- Quiz badges (in working) --
        // { id: 'quiz_rookie', name: 'Quiz Rookie', description: 'Complete your first quiz.', icon: '❓' },
        // { id: 'quiz_veteran', name: 'Quiz Veteran', description: 'Complete 20 quizzes in total.', icon: '🧠' },
        // { id: 'perfect_hit', name: 'Perfect Hit', description: 'Score 100% on a quiz.', icon: '💯' },
        // { id: 'perfect_streak', name: 'Perfect Streak', description: 'Score 100% on 5 different quizzes.', icon: '🏅' },
        // -- Console visit badges (active) --
        { id: 'console_scout', name: 'Console Scout', description: 'Visit 3 console pages.', icon: '🧭' },
        { id: 'retro_master', name: 'Retro Master', description: 'Visit 10 console pages.', icon: '🕹️' },
        { id: 'archive_hunter', name: 'Archive Hunter', description: 'Visit 25 console pages.', icon: '🗂️' },
        // -- Friends badges (active) --
        { id: 'first_friend', name: 'First Friend', description: 'Make your first friend on the platform.', icon: '👋' },
        { id: 'social_butterfly', name: 'Social Butterfly', description: 'Have 5 friends on the platform.', icon: '🦋' },
        { id: 'popular', name: 'Popular', description: 'Have 10 friends on the platform.', icon: '🌟' },
        // -- Favorites badges (active) --
        { id: 'first_fav', name: 'First Favorite', description: 'Add your first console to favorites.', icon: '❤️' },
        { id: 'collector_heart', name: "Collector's Heart", description: 'Have 5 favorite consoles.', icon: '💝' },
        // -- Owned consoles badges (active) --
        { id: 'first_owned', name: 'Owner', description: 'Add your first console to your collection.', icon: '🎮' },
        { id: 'collector', name: 'Collector', description: 'Own 5 consoles in your collection.', icon: '📦' },
        // -- Veteran badges (active) --
        { id: 'week_veteran', name: 'Week Regular', description: 'Be a member for 7 days.', icon: '📅' },
        { id: 'month_veteran', name: 'Monthly', description: 'Be a member for 30 days.', icon: '🗓️' },
        { id: 'year_veteran', name: 'Veteran', description: 'Be a member for 365 days.', icon: '🏛️' },
        // -- Combined badge (in working — requires lessons) --
        // { id: 'all_rounder', name: 'All-Rounder', description: 'Complete 15 lessons and visit 10 consoles.', icon: '👑' }
    ],

    /** Get quiz stats object from localStorage for a user */
    _getQuizStats(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.QUIZ_STATS_KEY)) || {};
            return data[userId] || {};
        } catch { return {}; }
    },

    /** Get count of unique consoles visited (from localStorage) */
    _getVisitedCount() {
        try {
            const visited = JSON.parse(localStorage.getItem(this.VISITED_STORAGE_KEY)) || [];
            return Array.isArray(visited) ? visited.length : 0;
        } catch { return 0; }
    },

    /** Aggregate quiz stats: total quizzes, perfect scores, avg score */
    _getQuizSummary(userId) {
        const byCourse = this._getQuizStats(userId);
        let attempts = 0;
        let perfectLessons = 0;

        Object.values(byCourse).forEach((courseStats) => {
            if (!courseStats || typeof courseStats !== 'object') return;
            Object.values(courseStats).forEach((lessonStats) => {
                if (!lessonStats || typeof lessonStats !== 'object') return;
                attempts += Number(lessonStats.attempts || 0);
                if (Number(lessonStats.best_percent || 0) >= 100) {
                    perfectLessons += 1;
                }
            });
        });

        return { attempts, perfectLessons };
    },

    /** Get earned achievements for a user */
    /** Get list of earned badge IDs for a user */
    getEarned(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            return data[userId] || [];
        } catch { return []; }
    },

    /** Award an achievement */
    /** Award a badge to a user (persists to localStorage) */
    award(userId, badgeId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            if (!data[userId]) data[userId] = [];
            if (data[userId].find(a => a.id === badgeId)) return false; // already earned
            data[userId].push({ id: badgeId, earned_at: new Date().toISOString() });
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch { return false; }
    },

    /** Check and award achievements based on current state */
    /** Check all badge conditions and award any newly earned ones */
    /**
     * Check all badge conditions and award newly earned ones.
     * @param {string} userId
     * @param {object} stats - { visitedConsoles, friends, favorites, owned, daysMember }
     */
    checkAndAward(userId, stats = {}) {
        const awarded = [];
        const visitedCount = typeof stats.visitedConsoles === 'number' ? stats.visitedConsoles : this._getVisitedCount();
        const friends   = Number(stats.friends   || 0);
        const favorites = Number(stats.favorites || 0);
        const owned     = Number(stats.owned     || 0);
        const days      = Number(stats.daysMember || 0);

        // -- Lesson badges (in working) --
        // -- Quiz badges (in working) --

        // -- Console visit badges --
        if (visitedCount >= 3  && this.award(userId, 'console_scout'))   awarded.push('console_scout');
        if (visitedCount >= 10 && this.award(userId, 'retro_master'))    awarded.push('retro_master');
        if (visitedCount >= 25 && this.award(userId, 'archive_hunter'))  awarded.push('archive_hunter');

        // -- Friends badges --
        if (friends >= 1  && this.award(userId, 'first_friend'))      awarded.push('first_friend');
        if (friends >= 5  && this.award(userId, 'social_butterfly'))  awarded.push('social_butterfly');
        if (friends >= 10 && this.award(userId, 'popular'))           awarded.push('popular');

        // -- Favorites badges --
        if (favorites >= 1 && this.award(userId, 'first_fav'))          awarded.push('first_fav');
        if (favorites >= 5 && this.award(userId, 'collector_heart'))     awarded.push('collector_heart');

        // -- Owned consoles badges --
        if (owned >= 1 && this.award(userId, 'first_owned'))  awarded.push('first_owned');
        if (owned >= 5 && this.award(userId, 'collector'))    awarded.push('collector');

        // -- Veteran badges --
        if (days >= 7   && this.award(userId, 'week_veteran'))   awarded.push('week_veteran');
        if (days >= 30  && this.award(userId, 'month_veteran'))  awarded.push('month_veteran');
        if (days >= 365 && this.award(userId, 'year_veteran'))   awarded.push('year_veteran');

        return awarded;
    },

    /** All level tiers with display info and score thresholds */
    LEVELS: [
        {
            name: 'Novice',       emoji: '🌱', minScore: 0,
            description: 'Just getting started. Explore consoles and earn your first badges!',
            requirements: 'Visit any console page or earn a badge to get started.',
        },
        {
            name: 'Intermediate', emoji: '🌿', minScore: 35,
            description: 'Good progress. Keep exploring and earning achievements.',
            requirements: 'Reach score 35 — e.g. earn 3 badges and visit 14 consoles.',
        },
        {
            name: 'Advanced',     emoji: '⚡', minScore: 55,
            description: 'Solid platform knowledge. You\'re building real momentum.',
            requirements: 'Reach score 55 — e.g. earn 7 badges and visit 15 consoles.',
        },
        {
            name: 'Expert',       emoji: '🔥', minScore: 75,
            description: 'Impressive activity. You know Console Notebook inside out.',
            requirements: 'Reach score 75 — e.g. earn 9 badges and visit 22 consoles.',
        },
        {
            name: 'Legend',       emoji: '👑', minScore: 90,
            description: 'Elite status. You\'ve mastered Console Notebook.',
            requirements: 'Reach score 90 — e.g. earn 12 badges and visit 22 consoles.',
        },
    ],

    /**
     * Compute the user's level from achievements% and console visits.
     * Returns rich data: level info, score, progress to next, what to do next.
     * @param {number} achievementsPct  0-100
     * @param {number} visitedConsoles  raw count
     * @param {number} totalBadges      total active badges (default 13)
     */
    computeLevel(achievementsPct, visitedConsoles, totalBadges = 13) {
        const consolePct = Math.min((visitedConsoles / 25) * 100, 100);
        const score = Math.round((achievementsPct * 0.6) + (consolePct * 0.4));

        const levels = this.LEVELS;
        let currentIdx = 0;
        for (let i = levels.length - 1; i >= 0; i--) {
            if (score >= levels[i].minScore) { currentIdx = i; break; }
        }

        const current = levels[currentIdx];
        const next    = levels[currentIdx + 1] || null;

        // Points contributed per action
        const pointsPerBadge   = (100 / totalBadges) * 0.6;           // ~4.6 pts
        const pointsPerConsole = visitedConsoles < 25 ? 4 * 0.4 : 0;  // 1.6 pts (if < max)

        let nextRequirements = null;
        let progressToNext   = 100;
        if (next) {
            const needed = next.minScore - score;
            progressToNext = Math.round(((score - current.minScore) / (next.minScore - current.minScore)) * 100);
            nextRequirements = {
                scoreNeeded:    needed,
                badgesNeeded:   Math.ceil(needed / pointsPerBadge),
                consolesNeeded: pointsPerConsole > 0 ? Math.ceil(needed / pointsPerConsole) : null,
            };
        }

        return {
            name:           current.name,
            emoji:          current.emoji,
            description:    current.description,
            score,
            index:          currentIdx,
            nextLevel:      next,
            nextRequirements,
            progressToNext,
            sub: next
                ? `${next.emoji} ${next.name} in ${next.minScore - score} points — earn a badge or visit more consoles!`
                : 'You have fully mastered the platform.',
        };
    },

    /**
     * Compute a level for a public user profile (no achievements/visited data available).
     * Uses friends, favorites, owned consoles, and days on platform.
     */
    computePublicLevel(friendCount, favCount, ownedCount, daysMember) {
        const friendScore  = Math.min(Math.round((friendCount  / 10)  * 100), 100);
        const collectScore = Math.min(Math.round(((favCount + ownedCount) / 20) * 100), 100);
        const veteranScore = Math.min(Math.round((daysMember / 365) * 100), 100);
        const score = Math.round((friendScore * 0.4) + (collectScore * 0.35) + (veteranScore * 0.25));
        if (score >= 90) return { name: 'Legend',       emoji: '👑' };
        if (score >= 75) return { name: 'Expert',       emoji: '🔥' };
        if (score >= 55) return { name: 'Advanced',     emoji: '⚡' };
        if (score >= 35) return { name: 'Intermediate', emoji: '🌿' };
        return              { name: 'Novice',       emoji: '🌱' };
    },

    /** Track a console page visit */
    /** Record a console page visit for the Explorer badge */
    trackConsoleVisit(consoleId) {
        try {
            const visited = JSON.parse(localStorage.getItem(this.VISITED_STORAGE_KEY)) || [];
            if (!visited.includes(consoleId)) {
                visited.push(consoleId);
                localStorage.setItem(this.VISITED_STORAGE_KEY, JSON.stringify(visited));
            }
            return visited.length;
        } catch { /* noop */ }
        return 0;
    },

    /** Show toast notifications for newly unlocked badges */
    showUnlockNotifications(awardedIds) {
        if (!Array.isArray(awardedIds) || awardedIds.length === 0) return;

        let stack = document.querySelector('.achievement-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'achievement-toast-stack';
            document.body.appendChild(stack);
        }

        awardedIds.forEach((badgeId, index) => {
            const badge = this.BADGES.find(b => b.id === badgeId);
            if (!badge) return;

            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.innerHTML = `
                <div class="achievement-toast__icon">${badge.icon}</div>
                <div class="achievement-toast__content">
                    <div class="achievement-toast__label">Achievement Deblocat</div>
                    <div class="achievement-toast__title">${badge.name}</div>
                    <div class="achievement-toast__desc">${badge.description}</div>
                </div>
            `;

            setTimeout(() => {
                stack.appendChild(toast);
                requestAnimationFrame(() => toast.classList.add('visible'));
            }, index * 180);

            setTimeout(() => {
                toast.classList.remove('visible');
                setTimeout(() => {
                    toast.remove();
                    if (stack && !stack.children.length) {
                        stack.remove();
                    }
                }, 260);
            }, 4200 + index * 220);
        });
    },

    resetUserAchievements(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            data[userId] = [];
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch { /* noop */ }
    },

    resetUserQuizStats(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.QUIZ_STATS_KEY)) || {};
            data[userId] = {};
            localStorage.setItem(this.QUIZ_STATS_KEY, JSON.stringify(data));
        } catch { /* noop */ }
    },

    resetVisitedConsoles() {
        localStorage.setItem(this.VISITED_STORAGE_KEY, JSON.stringify([]));
    },

    /** Get full badge info with earned status */
    /** Get all badges with earned status for display */
    getAllBadges(userId) {
        const earned = this.getEarned(userId);
        return this.BADGES.map(b => {
            const e = earned.find(a => a.id === b.id);
            return { ...b, earned: !!e, earned_at: e ? e.earned_at : null };
        });
    }
};
