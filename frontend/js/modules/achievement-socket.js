import { AchievementsModule } from './achievements.js';

let socket = null;

export function initAchievementSocket(userId) {
    if (!window.io || !userId) return;
    const token = localStorage.getItem('cn_session_token') || '';
    if (!token) return;

    if (socket) {
        socket.emit('register', token);
        return;
    }

    socket = window.io({ reconnectionAttempts: Infinity, reconnectionDelay: 2000 });

    socket.emit('register', token);
    socket.on('connect', () => socket.emit('register', localStorage.getItem('cn_session_token') || ''));

    socket.on('achievement_unlocked', (payload) => {
        if (payload && Array.isArray(payload.awardedIds)) {
            const allBadges = window.GAMIFICATION_DATA?.ACHIEVEMENTS ?? AchievementsModule.BADGES;
            AchievementsModule.showUnlockNotifications(
                payload.awardedIds,
                allBadges,
                payload.achievements ?? []
            );
        }
    });
}
