import { AchievementsModule } from './achievements.js';

let socket = null;

export function initAchievementSocket(userId) {
    if (!window.io || !userId) return;
    if (socket) {
        // Already connected — just re-register in the room (e.g. after page reload)
        socket.emit('register', String(userId));
        return;
    }

    socket = window.io({ reconnectionAttempts: Infinity, reconnectionDelay: 2000 });

    // Register immediately and on every reconnect (covers phone wake-up / network switch)
    socket.emit('register', String(userId));
    socket.on('connect', () => socket.emit('register', String(userId)));

    socket.on('achievement_unlocked', (payload) => {
        if (payload && Array.isArray(payload.awardedIds)) {
            AchievementsModule.showUnlockNotifications(payload.awardedIds, AchievementsModule.BADGES);
        }
    });
}
