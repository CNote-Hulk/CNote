/**
 * Main JavaScript Entry Point
 * Initializes all modules
 */

// Import modules
import { NavigationModule } from './modules/navigation.js';
import { AnimationsModule } from './modules/animations.js';
import { ContactFormModule } from './modules/contact-form.js';
import { DiacriticsModule } from './modules/diacritics.js';
import { SearchModule } from './modules/search.js';
import { ProfileDropdownModule } from './modules/profile-dropdown.js';
import { AuthModule } from './modules/auth.js';
import { I18nModule } from './modules/i18n.js';
import { AchievementsModule } from './modules/achievements.js';

/**
 * App Class - Orchestrates all modules
 */
class App {
    constructor() {
        this._navbarOffsetRaf = null;
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
        this.initGlobalNavbarOffset();
        
        try {
            NavigationModule.init();
            console.log('✓ Navigation module initialized');
            
            I18nModule.init();
            console.log('✓ i18n module initialized');

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

            const user = AuthModule.getCurrentUser();

            const privatePages = ['home.html', 'profile.html'];
            const currentPage = window.location.pathname.split('/').pop();

            if (user && privatePages.includes(currentPage)) {
                AuthModule.startSessionWatch();
                console.log('✓ Session watch initialized');
            }

            this.initAchievements();
            console.log('✓ Achievements module initialized');

            this.initQuickGuide();
            console.log('✓ Quick guide tracking initialized');
            
            console.log('✅ All modules initialized successfully');
            this.initMathRendering();
        } catch (error) {
            console.error('❌ Error initializing modules:', error);
        }
    }

    initGlobalNavbarOffset() {
        const updateOffset = () => {
            const navbar = document.querySelector('.navbar');
            if (!navbar) return;
            const rect = navbar.getBoundingClientRect();
            const height = Math.max(0, Math.ceil(rect.height));
            document.documentElement.style.setProperty('--cn-nav-offset', `${height}px`);
        };

        const scheduleOffsetUpdate = () => {
            if (this._navbarOffsetRaf !== null) return;
            this._navbarOffsetRaf = window.requestAnimationFrame(() => {
                this._navbarOffsetRaf = null;
                updateOffset();
            });
        };

        scheduleOffsetUpdate();
        window.addEventListener('resize', scheduleOffsetUpdate);
        window.addEventListener('orientationchange', scheduleOffsetUpdate);
        window.addEventListener('load', scheduleOffsetUpdate);
        window.addEventListener('cn:language-changed', scheduleOffsetUpdate);
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

    /**
     * Track quick guide step completion across all pages.
     * Steps: 0=encyclopedia, 1=compare, 2=community, 3=send message, 4=rate console
     */
    initQuickGuide() {
        if (!AuthModule.getCurrentUser()) return;

        const page = window.location.pathname.split('/').pop() || '';

        // Auto-complete steps based on page visit
        const pageStepMap = {
            'evolutie.html': 0,
            'comparatie.html': 1,
            'community.html': 2
        };
        if (page in pageStepMap) {
            this.markQuickGuideStep(pageStepMap[page]);
        }

        // Listen for activity-based step completion
        window.addEventListener('cn:message-sent', () => this.markQuickGuideStep(3));
        window.addEventListener('cn:rating-submitted', () => this.markQuickGuideStep(4));
    }

    markQuickGuideStep(stepIndex) {
        try {
            var data = JSON.parse(localStorage.getItem('cn_quickguide')) || { completed: [] };
            if (!Array.isArray(data.completed)) data.completed = [];
            if (data.completed.indexOf(stepIndex) === -1) {
                data.completed.push(stepIndex);
                localStorage.setItem('cn_quickguide', JSON.stringify(data));
            }
        } catch (e) { /* ignore */ }
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

// Initialize app
new App();
