/**
 * Hamburger Menu Fallback (non-module)
 * Allows file:// usage without ES module loading
 * On live servers, main.js modules may be loaded - this script should not conflict
 */

// Wait for DOM to be ready, then check if main.js already initialized
const initHamburgerFallback = () => {
    // Check if NavigationModule already initialized the menu (on live servers with ES6 modules)
    if (window.__HAMBURGER_INITIALIZED__) {
        console.log('📱 Hamburger menu already initialized by main.js module, skipping fallback');
        return;
    }
    
    console.log('📱 Hamburger menu fallback script initializing...');
    
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (!hamburger || !navLinks) {
        console.warn('⚠️ Hamburger or nav-links element not found');
        return;
    }

    console.log('✓ Hamburger menu elements found, initializing...');
    
    // Mark that we're initializing hamburger menu
    window.__HAMBURGER_INITIALIZED__ = true;

    const openMenu = () => {
        console.log('🔓 Opening menu');
        hamburger.classList.add('active');
        navLinks.classList.add('active');
        body.classList.add('menu-open');
        hamburger.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        console.log('🔒 Closing menu');
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        body.classList.remove('menu-open');
        hamburger.setAttribute('aria-expanded', 'false');
    };

    const toggleMenu = () => {
        console.log('📋 Toggle menu pressed', navLinks.classList.contains('active') ? 'closing' : 'opening');
        return (navLinks.classList.contains('active') ? closeMenu() : openMenu());
    };

    // Ensure button has explicit type to avoid form submit behavior
    if (hamburger && hamburger.tagName === 'BUTTON' && !hamburger.getAttribute('type')) {
        hamburger.setAttribute('type', 'button');
    }

    // Support both click and touch on mobile to improve reliability
    const bindToggle = (el) => {
        el.addEventListener('click', (e) => {
            console.log('🖱️ Click event on hamburger', e);
            e.stopPropagation();
            toggleMenu();
        });
        el.addEventListener('touchstart', (e) => {
            console.log('👆 Touch event on hamburger', e);
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        }, { passive: false });
    };

    bindToggle(hamburger);
    console.log('✓ Hamburger click/touch listeners attached');
    
    const links = navLinks.querySelectorAll('a');
    console.log('📋 Found', links.length, 'links in nav-links');
    links.forEach((link, index) => {
        console.log(`  Link ${index}:`, link.href, link.textContent, 'pointer-events:', window.getComputedStyle(link).pointerEvents);
        link.addEventListener('click', (e) => {
            console.log('🔗 Link clicked:', link.href, e);
            closeMenu();
        });
    });
    console.log('✓ Nav link click listeners attached');

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navLinks.classList.contains('active')) {
            closeMenu();
        }
    });

    document.addEventListener('click', event => {
        if (navLinks.classList.contains('active') && !navLinks.contains(event.target) && !hamburger.contains(event.target)) {
            closeMenu();
        }
    });

    /* Auto-hide navbar on scroll (fallback, fără module) */
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        let lastScrollY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY;

            if (body.classList.contains('menu-open')) {
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            if (currentY < 80) {
                navbar.classList.remove('navbar--hidden');
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            if (Math.abs(delta) < 15) {
                ticking = false;
                return;
            }

            navbar.classList.toggle('navbar--hidden', delta > 0);
            lastScrollY = currentY < 0 ? 0 : currentY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(onScroll);
                ticking = true;
            }
        }, { passive: true });
    }
    
    console.log('✅ Hamburger menu fallback fully initialized');
};

// Initialize on DOMContentLoaded or immediately if DOM is ready
const scheduleInit = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Wait a tiny bit more to let main.js modules load/fail
            setTimeout(initHamburgerFallback, 50);
        });
    } else {
        // Wait a tiny bit to let main.js modules load/fail
        setTimeout(initHamburgerFallback, 50);
    }
};

scheduleInit();

