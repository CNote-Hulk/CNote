/**
 * Achievements Module
 * Badge system tracked in localStorage
 */

import { AuthModule } from './auth.js';
import { ProgressModule } from './progress.js';

export const AchievementsModule = {
    STORAGE_KEY: 'cn_achievements',

    BADGES: [
        { id: 'first_steps', name: 'Primii Pași', description: 'Ai completat prima lecție.', icon: '🎯' },
        { id: 'tech_explorer', name: 'Explorator Tech', description: 'Ai citit 5 lecții.', icon: '🔬' },
        { id: 'console_doctor', name: 'Doctor de Console', description: 'Ai terminat un curs de reparare.', icon: '🔧' },
        { id: 'retro_master', name: 'Maestru Retro', description: 'Ai vizitat 10 pagini de console.', icon: '🕹️' },
        { id: 'bookworm', name: 'Cititor Pasionat', description: 'Ai citit 15 lecții.', icon: '📚' },
        { id: 'halfway', name: 'La Jumătate', description: 'Ai completat 50% dintr-un curs.', icon: '⭐' }
    ],

    /** Get earned achievements for a user */
    getEarned(userId) {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
            return data[userId] || [];
        } catch { return []; }
    },

    /** Award an achievement */
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
    checkAndAward(userId) {
        const awarded = [];
        const progress = ProgressModule.getAllProgress(userId);
        let totalCompleted = 0;

        for (const courseId in progress) {
            const lessons = progress[courseId] || [];
            totalCompleted += lessons.length;
            const course = ProgressModule.COURSES.find(c => c.id === courseId);
            if (course) {
                const pct = Math.round((lessons.length / course.totalLessons) * 100);
                if (pct >= 100 && this.award(userId, 'console_doctor')) awarded.push('console_doctor');
                if (pct >= 50 && this.award(userId, 'halfway')) awarded.push('halfway');
            }
        }

        if (totalCompleted >= 1 && this.award(userId, 'first_steps')) awarded.push('first_steps');
        if (totalCompleted >= 5 && this.award(userId, 'tech_explorer')) awarded.push('tech_explorer');
        if (totalCompleted >= 15 && this.award(userId, 'bookworm')) awarded.push('bookworm');

        // Retro master: check visited consoles
        try {
            const visited = JSON.parse(localStorage.getItem('cn_visited_consoles')) || [];
            if (visited.length >= 10 && this.award(userId, 'retro_master')) awarded.push('retro_master');
        } catch { /* noop */ }

        return awarded;
    },

    /** Track a console page visit */
    trackConsoleVisit(consoleId) {
        try {
            const visited = JSON.parse(localStorage.getItem('cn_visited_consoles')) || [];
            if (!visited.includes(consoleId)) {
                visited.push(consoleId);
                localStorage.setItem('cn_visited_consoles', JSON.stringify(visited));
            }
            const user = AuthModule.getCurrentUser();
            if (user) this.checkAndAward(user.id);
        } catch { /* noop */ }
    },

    /** Get full badge info with earned status */
    getAllBadges(userId) {
        const earned = this.getEarned(userId);
        return this.BADGES.map(b => {
            const e = earned.find(a => a.id === b.id);
            return { ...b, earned: !!e, earned_at: e ? e.earned_at : null };
        });
    }
};
