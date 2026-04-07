// Socket.io client for real-time achievement notifications
// This file is imported dynamically by main.js if not already present
import { AchievementsModule } from './achievements.js';

let socket = null;

export function initAchievementSocket(userId, allBadges) {
    if (!window.io || !userId) return;
    if (socket) return; // Already initialized
    socket = window.io();
    socket.emit('register', userId);
    socket.on('achievement_unlocked', (payload) => {
        // payload: { awardedIds: ["badge_id1", ...] }
        if (payload && Array.isArray(payload.awardedIds)) {
            AchievementsModule.showUnlockNotifications(payload.awardedIds, allBadges);
        }
    });
}
