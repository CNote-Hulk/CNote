import { AchievementsModule } from './achievements.js';

let socket = null;

function getAuthToken() {
    return localStorage.getItem('cn_session_token') || localStorage.getItem('cn_token') || '';
}

export function initAchievementSocket(userId) {
    if (!window.io || !userId) return;
    const token = getAuthToken();
    if (!token) return;

    if (socket) {
        socket.emit('register', token);
        return;
    }

    socket = window.io({ reconnectionAttempts: Infinity, reconnectionDelay: 2000 });

    socket.emit('register', token);
    socket.on('connect', () => socket.emit('register', getAuthToken()));

    socket.on('achievement_unlocked', (payload) => {
        if (payload && Array.isArray(payload.awardedIds)) {
            const allBadges = window.GAMIFICATION_DATA?.ACHIEVEMENTS ?? AchievementsModule.BADGES;
            AchievementsModule.showUnlockNotifications(
                payload.awardedIds,
                allBadges,
                payload.achievements ?? []
            );
        }
        window.dispatchEvent(new CustomEvent('cn:xp-update'));
    });

    socket.on('notification', () => {
        document.dispatchEvent(new CustomEvent('cn:socket-notification'));
    });
}
