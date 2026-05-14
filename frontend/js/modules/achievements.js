/**
 * AchievementsModule (Frontend)
 * Display logic, level computation, and toast notifications.
 * Achievement/level definitions live in gamification-data.js (window.GAMIFICATION_DATA).
 */
export const AchievementsModule = {

    get BADGES() {
        return window.GAMIFICATION_DATA?.ACHIEVEMENTS ?? [];
    },

    get CATEGORIES() {
        return window.GAMIFICATION_DATA?.CATEGORIES ?? [];
    },

    get LEVELS() {
        return window.GAMIFICATION_DATA?.LEVELS ?? [];
    },

    /**
     * Transform backend badge array into enriched format.
     */
    getAllBadges(badgesFromBackend) {
        return badgesFromBackend.map(b => ({
            ...b,
            earned: !!b.unlocked,
            earned_at: b.earned_at || null,
        }));
    },

    /**
     * Compute display-ready level object from /api/me/level response.
     * Accepts the new shape: { level, name, emoji, xp, xpForCurrent, xpForNext, progressPercent, isMaxLevel }
     */
    computeLevel(apiData) {
        if (!apiData || !apiData.level) {
            return { level: 1, name: 'Newcomer', emoji: '🔌', xp: 0, progressPercent: 0, isMaxLevel: false, xpForNext: 150, xpNeeded: 150, nextLevel: null, sub: '150 XP to reach 📺 Watcher' };
        }
        const { level, name, emoji, xp = 0, xpForNext, progressPercent = 0, isMaxLevel = false } = apiData;
        const xpNeeded = isMaxLevel ? 0 : Math.max(0, (xpForNext ?? 0) - xp);
        const levels = this.LEVELS;
        const nextLevelData = isMaxLevel ? null : (levels.find(l => l.level === level + 1) ?? null);
        const sub = isMaxLevel
            ? '👑 Maximum level reached!'
            : `${xpNeeded} XP to reach ${nextLevelData?.emoji ?? ''} ${nextLevelData?.name ?? 'next level'}`;

        return { level, name, emoji, xp, progressPercent, isMaxLevel, xpForNext, xpNeeded, nextLevel: nextLevelData, sub };
    },

    /**
     * Estimate level for a public profile from visible social/collection data.
     * Rough heuristic only — actual XP is not public.
     */
    computePublicLevel(friendCount = 0, favoriteCount = 0, ownedCount = 0, daysMember = 1) {
        const levels = this.LEVELS;
        if (!levels.length) return { level: 1, emoji: '🔌', name: 'Newcomer' };
        // Rough score: weight visible signals
        const score = (friendCount * 15) + (favoriteCount * 5) + (ownedCount * 8) + Math.min(daysMember * 1, 365);
        const match = [...levels].reverse().find(l => score >= l.xpRequired) ?? levels[0];
        return { level: match.level, emoji: match.emoji, name: match.name };
    },

    /**
     * Display toast notifications for newly unlocked achievements.
     * awardedIds: string[] — IDs from socket payload
     * allBadges: badge objects from GAMIFICATION_DATA (used as fallback)
     * enriched: full achievement objects from socket payload (includes xpReward)
     */
    showUnlockNotifications(awardedIds, allBadges, enriched = []) {
        if (!Array.isArray(awardedIds) || awardedIds.length === 0) return;

        let stack = document.querySelector('.achievement-toast-stack');
        if (!stack) {
            stack = document.createElement('div');
            stack.className = 'achievement-toast-stack';
            document.body.appendChild(stack);
        }

        awardedIds.forEach((badgeId, index) => {
            const badge = enriched.find(b => b.id === badgeId)
                ?? allBadges.find(b => b.id === badgeId);
            if (!badge) return;

            const xpHtml = badge.xpReward
                ? `<div class="achievement-toast__xp">+${badge.xpReward} XP</div>`
                : '';
            const categoryLabel = badge.category
                ? `<div class="achievement-toast__category">${badge.category}</div>`
                : '';

            const toast = document.createElement('div');
            toast.className = 'achievement-toast';
            toast.innerHTML = `
                <div class="achievement-toast__icon">${badge.emoji ?? badge.icon ?? '🏆'}</div>
                <div class="achievement-toast__content">
                    <div class="achievement-toast__label">Achievement Unlocked ${categoryLabel}</div>
                    <div class="achievement-toast__title">${badge.name}</div>
                    <div class="achievement-toast__desc">${badge.description}</div>
                    ${xpHtml}
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
