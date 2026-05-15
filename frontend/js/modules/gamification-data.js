/**
 * gamification-data.js — Frontend copy of gamification constants.
 * Must stay in sync with backend/utils/gamification.js.
 * Exposed as window.GAMIFICATION_DATA for use by achievements.js and other modules.
 */
window.GAMIFICATION_DATA = {
    LEVELS: [
        { level: 1,  name: 'Newcomer',   emoji: '🔌', xpRequired: 0     },
        { level: 2,  name: 'Watcher',    emoji: '📺', xpRequired: 150   },
        { level: 3,  name: 'Player',     emoji: '🕹️', xpRequired: 400   },
        { level: 4,  name: 'Collector',  emoji: '🧩', xpRequired: 800   },
        { level: 5,  name: 'Tinkerer',   emoji: '🔧', xpRequired: 1500  },
        { level: 6,  name: 'Explorer',   emoji: '📡', xpRequired: 2500  },
        { level: 7,  name: 'Enthusiast', emoji: '🏆', xpRequired: 4000  },
        { level: 8,  name: 'Historian',  emoji: '🎓', xpRequired: 6000  },
        { level: 9,  name: 'Technician', emoji: '⚙️', xpRequired: 9000  },
        { level: 10, name: 'Legend',     emoji: '👑', xpRequired: 13000 },
    ],

    ACHIEVEMENTS: [
        // Learning (7)
        { id: 'first_lesson',    name: 'First Step',        emoji: '📝', category: 'learning',
          description: 'Complete your first lesson',       xpReward: 20 },
        { id: 'lesson_5',        name: 'Quick Learner',     emoji: '🔍', category: 'learning',
          description: 'Complete 5 lessons',               xpReward: 30 },
        { id: 'lesson_15',       name: 'Dedicated Student', emoji: '📚', category: 'learning',
          description: 'Complete 15 lessons',              xpReward: 50 },
        { id: 'lesson_30',       name: 'Scholar',           emoji: '🎒', category: 'learning',
          description: 'Complete 30 lessons',              xpReward: 75 },
        { id: 'first_course',    name: 'Graduate',          emoji: '🎓', category: 'learning',
          description: 'Complete your first course',       xpReward: 100 },
        { id: 'perfect_quiz',    name: 'Perfectionist',     emoji: '💯', category: 'learning',
          description: 'Score 100% on a quiz',             xpReward: 40 },
        { id: 'quiz_streak_5',   name: 'Quiz Master',       emoji: '🧠', category: 'learning',
          description: '5 perfect quiz scores',            xpReward: 80 },

        // Explorer (6)
        { id: 'console_3',       name: 'Scout',             emoji: '🧭', category: 'explorer',
          description: 'Visit 3 console pages',            xpReward: 15 },
        { id: 'console_10',      name: 'Explorer',          emoji: '🗺️', category: 'explorer',
          description: 'Visit 10 console pages',           xpReward: 30 },
        { id: 'console_25',      name: 'Archivist',         emoji: '🗂️', category: 'explorer',
          description: 'Visit 25 console pages',           xpReward: 50 },
        { id: 'console_52',      name: 'Encyclopedia',      emoji: '📖', category: 'explorer',
          description: 'Visit all console pages',          xpReward: 150 },
        { id: 'first_favorite',  name: 'Wishlist',          emoji: '❤️', category: 'explorer',
          description: 'Add your first console to favorites', xpReward: 10 },
        { id: 'first_owned',     name: 'Owner',             emoji: '🎮', category: 'explorer',
          description: 'Add your first owned console',     xpReward: 10 },

        // Community (6)
        { id: 'first_post',      name: 'Voice',             emoji: '💬', category: 'community',
          description: 'Create your first forum post',     xpReward: 25 },
        { id: 'post_10',         name: 'Contributor',       emoji: '✍️', category: 'community',
          description: 'Create 10 forum posts',            xpReward: 50 },
        { id: 'first_friend',    name: 'Connected',         emoji: '👋', category: 'community',
          description: 'Add your first friend',            xpReward: 20 },
        { id: 'friends_5',       name: 'Sociable',          emoji: '🦋', category: 'community',
          description: 'Have 5 friends',                   xpReward: 40 },
        { id: 'first_dm',        name: 'Messenger',         emoji: '✉️', category: 'community',
          description: 'Send your first direct message',   xpReward: 10 },
        { id: 'helpful_5',       name: 'Helper',            emoji: '⭐', category: 'community',
          description: 'Receive 5 upvotes on your posts',  xpReward: 30 },

        // Marketplace (4)
        { id: 'first_listing',   name: 'Seller',            emoji: '🏷️', category: 'marketplace',
          description: 'Create your first listing',        xpReward: 25 },
        { id: 'listing_5',       name: 'Dealer',            emoji: '🛒', category: 'marketplace',
          description: 'Create 5 listings',                xpReward: 50 },
        { id: 'first_ebay',      name: 'Connected Seller',  emoji: '🔗', category: 'marketplace',
          description: 'Connect your eBay account',        xpReward: 30 },
        { id: 'collector_5',     name: 'Hoarder',           emoji: '📦', category: 'marketplace',
          description: 'Own 5 consoles in your collection', xpReward: 40 },

        // Veteran (4)
        { id: 'week_1',          name: 'Regular',           emoji: '📅', category: 'veteran',
          description: 'Member for 7 days',                xpReward: 20 },
        { id: 'month_1',         name: 'Loyal',             emoji: '🗓️', category: 'veteran',
          description: 'Member for 30 days',               xpReward: 50 },
        { id: 'month_3',         name: 'Dedicated',         emoji: '🏅', category: 'veteran',
          description: 'Member for 90 days',               xpReward: 80 },
        { id: 'year_1',          name: 'Veteran',           emoji: '🏛️', category: 'veteran',
          description: 'Member for 365 days',              xpReward: 150 },

        // Special (3)
        { id: 'profile_complete', name: 'Identity',         emoji: '✨', category: 'special',
          description: 'Complete your profile (avatar + bio)', xpReward: 30 },
        { id: 'early_adopter',   name: 'Founder',           emoji: '🌟', category: 'special',
          description: 'One of the first 100 members',     xpReward: 100 },
        { id: 'completionist',   name: 'Completionist',     emoji: '💎', category: 'special',
          description: 'Unlock all other achievements',    xpReward: 500 },
    ],

    getLevelFromXP(xp) {
        const safeXp = Math.max(0, parseInt(xp) || 0);
        const levels = this.LEVELS;
        let currentLevel = levels[0];
        for (const level of levels) {
            if (safeXp >= level.xpRequired) {
                currentLevel = level;
            } else {
                break;
            }
        }
        const currentIndex = levels.indexOf(currentLevel);
        const nextLevel = levels[currentIndex + 1] || null;
        return {
            ...currentLevel,
            xp: safeXp,
            xpForNext: nextLevel ? nextLevel.xpRequired : currentLevel.xpRequired,
            progressPercent: nextLevel
                ? Math.round(((safeXp - currentLevel.xpRequired) /
                    (nextLevel.xpRequired - currentLevel.xpRequired)) * 100)
                : 100,
            isMaxLevel: !nextLevel,
        };
    },

    CATEGORIES: [
        { id: 'learning',    label: 'Learning',    icon: '📚' },
        { id: 'explorer',    label: 'Explorer',    icon: '🌍' },
        { id: 'community',   label: 'Community',   icon: '👥' },
        { id: 'marketplace', label: 'Marketplace', icon: '🛒' },
        { id: 'veteran',     label: 'Veteran',     icon: '🏛️' },
        { id: 'special',     label: 'Special',     icon: '✨' },
    ],
};
