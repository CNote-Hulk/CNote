/**
 * AchievementsModule (Frontend)
 * Badge definitions, level calculation, and toast notifications.
 */
export const AchievementsModule = {

    // Static badge definitions — keep in sync with backend/routes/achievements.js
    BADGES: [
        // Learning
        { id: 'first_lesson',     name: 'First Lesson',       description: 'Complete your first lesson.',         icon: '📝', category: 'learning' },
        { id: 'knowledge_seeker', name: 'Knowledge Seeker',   description: 'Complete 5 lessons.',                 icon: '🔍', category: 'learning' },
        { id: 'bookworm',         name: 'Bookworm',           description: 'Complete 10 lessons.',                icon: '📖', category: 'learning' },
        { id: 'course_finisher',  name: 'Course Finisher',    description: 'Complete your first full course.',    icon: '🎓', category: 'learning' },
        // Explorer
        { id: 'console_scout',   name: 'Console Scout',       description: 'Visit 3 console pages.',              icon: '🧭', category: 'explorer' },
        { id: 'retro_master',    name: 'Retro Master',         description: 'Visit 10 console pages.',             icon: '🕹️', category: 'explorer' },
        { id: 'archive_hunter',  name: 'Archive Hunter',       description: 'Visit 25 console pages.',             icon: '🗂️', category: 'explorer' },
        // Social
        { id: 'first_friend',     name: 'First Friend',        description: 'Make your first friend.',             icon: '👋', category: 'social' },
        { id: 'social_butterfly', name: 'Social Butterfly',    description: 'Have 5 friends on the platform.',    icon: '🦋', category: 'social' },
        { id: 'popular',          name: 'Popular',             description: 'Have 10 friends on the platform.',   icon: '🌟', category: 'social' },
        // Collector
        { id: 'first_fav',        name: 'First Favorite',      description: 'Add your first console to favorites.',       icon: '❤️', category: 'collector' },
        { id: 'collector_heart',  name: "Collector's Heart",   description: 'Have 5 favorite consoles.',                  icon: '💝', category: 'collector' },
        { id: 'first_owned',      name: 'Owner',               description: 'Add your first console to your collection.', icon: '🎮', category: 'collector' },
        { id: 'collector',        name: 'Collector',           description: 'Own 5 consoles in your collection.',         icon: '📦', category: 'collector' },
        // Veteran
        { id: 'week_veteran',     name: 'Week Regular',        description: 'Be a member for 7 days.',   icon: '📅', category: 'veteran' },
        { id: 'month_veteran',    name: 'Monthly',             description: 'Be a member for 30 days.',  icon: '🗓️', category: 'veteran' },
        { id: 'year_veteran',     name: 'Veteran',             description: 'Be a member for 365 days.', icon: '🏛️', category: 'veteran' },
    ],

    CATEGORIES: [
        { id: 'learning',  label: 'Learning',  icon: '📚' },
        { id: 'explorer',  label: 'Explorer',  icon: '🌍' },
        { id: 'social',    label: 'Social',    icon: '👥' },
        { id: 'collector', label: 'Collector', icon: '💾' },
        { id: 'veteran',   label: 'Veteran',   icon: '🏛️' },
    ],

    LEVELS: [
        {
            name: 'Novice',
            emoji: '🌱',
            description: 'You just registered on Console Notebook. Welcome!',
            requirements: 'Create an account.',
        },
        {
            name: 'Beginner',
            emoji: '📖',
            description: 'You know the basics of gaming consoles.',
            requirements: 'Complete the Console Starter Guide and visit 10 console pages.',
        },
    ],

    /**
     * Transform backend badge array into enriched format
     */
    getAllBadges(badgesFromBackend) {
        return badgesFromBackend.map(b => ({
            ...b,
            earned: !!b.unlocked,
            earned_at: b.earned_at || null
        }));
    },

    /**
     * Compute level from API response data.
     * Pass the parsed /api/me/level response object.
     */
    computeLevel(apiData) {
        const level = apiData.level || 'Novice';
        const emoji = apiData.emoji || '🌱';
        const progressToNext = apiData.progressToNext ?? 0;
        const nextLevel = apiData.nextLevel || null;
        const req = apiData.requirements || {};

        let sub;
        if (!nextLevel) {
            sub = 'More levels coming soon!';
        } else {
            const parts = [];
            if (!req.starter_guide_complete) parts.push('Complete the Console Starter Guide');
            const stillNeeded = Math.max(0, (req.console_visits_needed || 10) - (req.console_visits || 0));
            if (stillNeeded > 0) parts.push(`Visit ${stillNeeded} more console page${stillNeeded !== 1 ? 's' : ''}`);
            sub = parts.length
                ? `To reach ${nextLevel.emoji} ${nextLevel.name}: ${parts.join(' · ')}`
                : `${progressToNext}% to ${nextLevel.emoji} ${nextLevel.name}`;
        }

        const def = this.LEVELS.find(l => l.name === level) || this.LEVELS[0];
        return { name: level, emoji, description: def.description, progressToNext, nextLevel, sub };
    },

    /**
     * Estimate level for a public profile from visible social/collection data.
     * Approximate only — console visits and course completion aren't public.
     */
    computePublicLevel(friendCount = 0, favoriteCount = 0, ownedCount = 0, daysMember = 1) {
        // Rough heuristic: active collectors with friends are likely at least Beginner
        const active = favoriteCount >= 5 || ownedCount >= 3 || friendCount >= 3 || daysMember >= 30;
        return active
            ? { emoji: '📖', name: 'Beginner' }
            : { emoji: '🌱', name: 'Novice' };
    },

    /**
     * Display toast notifications for newly unlocked badges
     */
    showUnlockNotifications(awardedIds, allBadges) {
        if (!Array.isArray(awardedIds) || awardedIds.length === 0) return;

        let stack = document.querySelector('.achievement-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'achievement-toast-stack';
            document.body.appendChild(stack);
        }

        awardedIds.forEach((badgeId, index) => {
            const badge = allBadges.find(b => b.id === badgeId);
            if (!badge) return;

            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.innerHTML = `
                <div class="achievement-toast__icon">${badge.icon}</div>
                <div class="achievement-toast__content">
                    <div class="achievement-toast__label">Achievement Unlocked</div>
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
                    if (stack && !stack.children.length) stack.remove();
                }, 260);
            }, 4200 + index * 220);
        });
    },

    trackConsoleVisit(consoleId) {
        try {
            const visited = JSON.parse(localStorage.getItem('cn_visited_consoles')) || [];
            if (!visited.includes(consoleId)) {
                visited.push(consoleId);
                localStorage.setItem('cn_visited_consoles', JSON.stringify(visited));
            }
        } catch { /* noop */ }
    },
};
