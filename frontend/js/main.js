/**
 * Main JavaScript Entry Point
 * Inițializează toate modulele
 */

// Import modules
import { NavigationModule } from './modules/navigation.js';
import { AnimationsModule } from './modules/animations.js';
import { ContactFormModule } from './modules/contact-form.js';
import { DiacriticsModule } from './modules/diacritics.js';
import { SearchModule } from './modules/search.js';
import { ProfileDropdownModule } from './modules/profile-dropdown.js';
import { AuthModule } from './modules/auth.js';
import { AchievementsModule } from './modules/achievements.js';

/**
 * App Class - Orchestrates all modules
 */
class App {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeModules());
        } else {
            this.initializeModules();
        }
    }

    /**
     * Initialize all modules
     */
    initializeModules() {
        console.log('🚀 Initializing Console Notebook App...');
        
        try {
            NavigationModule.init();
            console.log('✓ Navigation module initialized');
            
            AnimationsModule.init();
            console.log('✓ Animations module initialized');

            ContactFormModule.init();
            console.log('✓ Contact form module initialized');

            DiacriticsModule.init();
            console.log('✓ Diacritics module initialized');

            SearchModule.init();
            console.log('✓ Search module initialized');

            ProfileDropdownModule.init();
            console.log('✓ Profile dropdown module initialized');

            this.initAchievements();
            console.log('✓ Achievements module initialized');
            
            console.log('✅ All modules initialized successfully');
            this.initMathRendering();
        } catch (error) {
            console.error('❌ Error initializing modules:', error);
        }
    }

    initAchievements() {
        const checkAndNotify = () => {
            const user = AuthModule.getCurrentUser();
            if (!user) return;
            const awarded = AchievementsModule.checkAndAward(user.id);
            if (awarded.length) {
                AchievementsModule.showUnlockNotifications(awarded);
            }
        };

        checkAndNotify();
        window.addEventListener('cn:lesson-completed', checkAndNotify);
        window.addEventListener('cn:console-visited', checkAndNotify);
        window.addEventListener('cn:quiz-finished', checkAndNotify);
    }

    initMathRendering() {
        if (typeof renderMathInElement === 'undefined') return;

        renderMathInElement(document.body, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ]
        });
    }
}

// Inițializează app
new App();
