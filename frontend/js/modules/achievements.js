/**
 * AchievementsModule (Frontend)
 * Totul se bazează pe date de la backend.
 * Nu folosește localStorage.
 */
export const AchievementsModule = {
    // Lista de nivele expusă global pentru UI
    LEVELS: [
        { name: 'Novice',       emoji: '🌱', minScore: 0,  description: 'Just getting started.' },
        { name: 'Intermediate', emoji: '🌿', minScore: 35, description: 'Good progress.' },
        { name: 'Advanced',     emoji: '⚡', minScore: 55, description: 'Solid platform knowledge.' },
        { name: 'Expert',       emoji: '🔥', minScore: 75, description: 'Impressive activity.' },
        { name: 'Legend',       emoji: '👑', minScore: 90, description: 'Elite status.' },
    ],

    /**
     * Transformă datele primite de la backend într-un format ușor de afișat
     * @param {Array} badgesFromBackend - lista de badge-uri cu {id, name, description, icon, unlocked, earned_at}
     */
    getAllBadges(badgesFromBackend) {
        return badgesFromBackend.map(b => ({
            ...b,
            earned: !!b.unlocked,
            earned_at: b.earned_at || null
        }));
    },

    /**
     * Afișează notificări toast pentru badge-uri noi
     * @param {Array} awardedIds - lista de ID-uri de badge-uri de la backend
     * @param {Array} allBadges - lista completă a badge-urilor
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
                    <div class="achievement-toast__label">Achievement Deblocat</div>
                    <div class="achievement-toast__title">${badge.name}</div>
                    <div class="achievement-toast__desc">${badge.description}</div>
                </div>
            `;

            // Animare intrare
            setTimeout(() => {
                stack.appendChild(toast);
                requestAnimationFrame(() => toast.classList.add('visible'));
            }, index * 180);

            // Animare ieșire
            setTimeout(() => {
                toast.classList.remove('visible');
                setTimeout(() => {
                    toast.remove();
                    if (stack && !stack.children.length) stack.remove();
                }, 260);
            }, 4200 + index * 220);
        });
    },

    /**
     * Calculează nivelul și progresul utilizatorului
     * @param {number} achievementsPct - procentaj realizări (0-100) de la backend
     * @param {number} visitedConsoles - număr de console vizitate (backend)
     * @param {number} totalBadges - total badge-uri active (default 13)
     */
    computeLevel(achievementsPct, visitedConsoles, totalBadges = 13) {
        const consolePct = Math.min((visitedConsoles / 25) * 100, 100);
        const score = Math.round((achievementsPct * 0.6) + (consolePct * 0.4));

        const levels = [
            { name: 'Novice',       emoji: '🌱', minScore: 0,  description: 'Just getting started.' },
            { name: 'Intermediate', emoji: '🌿', minScore: 35, description: 'Good progress.' },
            { name: 'Advanced',     emoji: '⚡', minScore: 55, description: 'Solid platform knowledge.' },
            { name: 'Expert',       emoji: '🔥', minScore: 75, description: 'Impressive activity.' },
            { name: 'Legend',       emoji: '👑', minScore: 90, description: 'Elite status.' },
        ];

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
            const pointsPerBadge = (100 / totalBadges) * 0.6;
            const pointsPerConsole = visitedConsoles < 25 ? 4 * 0.4 : 0;
            const needed = next.minScore - score;
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
     * Renderizare badge-uri în HTML
     * @param {Array} badges - lista badge-urilor cu earned status
     * @param {HTMLElement} container - container unde se vor afișa badge-urile
     */
    renderBadges(badges, container) {
        if (!container) return;
        container.innerHTML = '';
        badges.forEach(b => {
            const badgeEl = document.createElement('div');
            badgeEl.className = 'badge';
            badgeEl.innerHTML = `
                <div class="badge__icon">${b.icon}</div>
                <div class="badge__name">${b.name}</div>
                ${b.earned ? `<div class="badge__earned">Deblocat: ${b.earned_at}</div>` : ''}
            `;
            container.appendChild(badgeEl);
        });
    }
};
