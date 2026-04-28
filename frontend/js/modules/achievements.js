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
        { name: 'Novice',       emoji: '🌱', minScore: 0,  description: 'Just getting started. Explore consoles and unlock your first badges.',       requirements: 'Create your account and start exploring.' },
        { name: 'Intermediate', emoji: '🌿', minScore: 35, description: 'Good progress! You\'ve visited consoles and earned some badges.',             requirements: 'Reach 35 pts — visit 10+ consoles and earn 3+ badges.' },
        { name: 'Advanced',     emoji: '⚡', minScore: 55, description: 'Solid platform knowledge. You\'re an active member of the community.',        requirements: 'Reach 55 pts — visit 18+ consoles and earn 6+ badges.' },
        { name: 'Expert',       emoji: '🔥', minScore: 75, description: 'Impressive activity! You know your consoles inside and out.',                 requirements: 'Reach 75 pts — visit 22+ consoles and earn 9+ badges.' },
        { name: 'Legend',       emoji: '👑', minScore: 90, description: 'Elite status. You\'ve mastered the full platform — the rarest level.',        requirements: 'Reach 90 pts — explore all 25 consoles and unlock 13+ badges.' },
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
     * Compute user level from achievement% + console visits
     */
    computeLevel(achievementsPct, visitedConsoles, totalBadges = 17) {
        const consolePct = Math.min((visitedConsoles / 25) * 100, 100);
        const score = Math.round((achievementsPct * 0.6) + (consolePct * 0.4));

        const levels = this.LEVELS;
        let currentIdx = 0;
        for (let i = levels.length - 1; i >= 0; i--) {
            if (score >= levels[i].minScore) { currentIdx = i; break; }
        }

        const current = levels[currentIdx];
        const next = levels[currentIdx + 1] || null;

        let progressToNext = 100;
        let nextRequirements = null;
        if (next) {
            progressToNext = Math.round(((score - current.minScore) / (next.minScore - current.minScore)) * 100);
            const needed = next.minScore - score;
            const pointsPerBadge = (100 / totalBadges) * 0.6;
            const pointsPerConsole = visitedConsoles < 25 ? 4 * 0.4 : 0;
            nextRequirements = {
                scoreNeeded:    needed,
                badgesNeeded:   Math.ceil(needed / pointsPerBadge),
                consolesNeeded: pointsPerConsole > 0 ? Math.ceil(needed / pointsPerConsole) : null,
            };
        }

        return {
            name: current.name,
            emoji: current.emoji,
            description: current.description,
            score,
            index: currentIdx,
            nextLevel: next,
            nextRequirements,
            progressToNext,
            sub: next
                ? `${next.emoji} ${next.name} in ${next.minScore - score} points — earn more badges or visit more consoles!`
                : 'You have fully mastered the platform.'
        };
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
};
