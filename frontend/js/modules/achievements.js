/**
 * Achievements Module
 * Badge system tracked in localStorage
 */

import { ProgressModule } from './progress.js';

export const AchievementsModule = {
    STORAGE_KEY: 'cn_achievements',
    VISITED_STORAGE_KEY: 'cn_visited_consoles',
    QUIZ_STATS_KEY: 'cn_quiz_stats',

    BADGES: [
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
    checkAndAward(userId) {
        const awarded = [];
        const progress = ProgressModule.getAllProgress(userId);
        let totalCompleted = 0;
        const visitedCount = this._getVisitedCount();
        const quiz = this._getQuizSummary(userId);

        for (const courseId in progress) {
            const lessons = progress[courseId] || [];
            totalCompleted += lessons.length;
            const course = ProgressModule.COURSES.find(c => c.id === courseId);
            if (course) {
                const pct = Math.round((lessons.length / course.totalLessons) * 100);
                if (pct >= 100 && this.award(userId, 'console_doctor')) awarded.push('console_doctor');
                if (pct >= 50 && this.award(userId, 'halfway')) awarded.push('halfway');
                if (pct >= 80 && this.award(userId, 'almost_there')) awarded.push('almost_there');
            }
        }

        if (totalCompleted >= 1 && this.award(userId, 'first_steps')) awarded.push('first_steps');
        if (totalCompleted >= 3 && this.award(userId, 'starter_pack')) awarded.push('starter_pack');
        if (totalCompleted >= 5 && this.award(userId, 'tech_explorer')) awarded.push('tech_explorer');
        if (totalCompleted >= 15 && this.award(userId, 'bookworm')) awarded.push('bookworm');
        if (totalCompleted >= 25 && this.award(userId, 'grinder_25')) awarded.push('grinder_25');

        if (quiz.attempts >= 1 && this.award(userId, 'quiz_rookie')) awarded.push('quiz_rookie');
        if (quiz.attempts >= 20 && this.award(userId, 'quiz_veteran')) awarded.push('quiz_veteran');
        if (quiz.perfectLessons >= 1 && this.award(userId, 'perfect_hit')) awarded.push('perfect_hit');
        if (quiz.perfectLessons >= 5 && this.award(userId, 'perfect_streak')) awarded.push('perfect_streak');

        if (visitedCount >= 3 && this.award(userId, 'console_scout')) awarded.push('console_scout');
        if (visitedCount >= 10 && this.award(userId, 'retro_master')) awarded.push('retro_master');
        if (visitedCount >= 25 && this.award(userId, 'archive_hunter')) awarded.push('archive_hunter');
        if (visitedCount >= 10 && totalCompleted >= 15 && this.award(userId, 'all_rounder')) awarded.push('all_rounder');

        return awarded;
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
