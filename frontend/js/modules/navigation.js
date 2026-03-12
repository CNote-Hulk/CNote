/**
 * Navigation Module
 * Smooth scrolling, active links, mobile hamburger menu
 */

import { DOMUtils } from '../utils/dom.js';

export const NavigationModule = {
    init() {
        this.setupSmoothScroll();
        this.setupActiveLinks();
        this.setupMobileMenu();
        this.setupAutoHideNavbar();
    },

    /**
     * Smooth scroll pentru anchor links
     */
    setupSmoothScroll() {
        DOMUtils.onAll('a[href^="#"]', 'click', (e) => {
            const href = e.currentTarget.getAttribute('href');
            if (href !== '#') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Închide meniul mobile după navigare
                    this.closeMobileMenu();
                }
            }
        });
    },

    /**
     * Marchează link activ în navbar
     */
    setupActiveLinks() {
        const navLinks = document.querySelectorAll('.nav-links a');
        const logo = document.querySelector('.logo');
        
        // Adaugă active pe logo dacă suntem pe pagina de acasă
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/pages/') || window.location.pathname.endsWith('/pages')) {
            if (logo) {
                logo.classList.add('active');
            }
        }
        
        // Adaugă active pe linkurile din navbar
        navLinks.forEach(link => {
            if (link.href === window.location.href) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Mobile Hamburger Menu
     */
    setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        const navLinksItems = document.querySelectorAll('.nav-links a');
        
        if (!hamburger || !navLinks) return;
        
        // Mark that hamburger menu is initialized (to prevent fallback script from re-initializing)
        window.__HAMBURGER_INITIALIZED__ = true;
        
        // Ensure button has explicit type to avoid form submit behavior
        if (hamburger && hamburger.tagName === 'BUTTON' && !hamburger.getAttribute('type')) {
            hamburger.setAttribute('type', 'button');
        }

        // Toggle menu când se apasă hamburger (suport click + touchstart pentru mobile)
        const toggleHandler = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.toggleMobileMenu();
        };

        hamburger.addEventListener('click', toggleHandler);
        hamburger.addEventListener('touchstart', toggleHandler, { passive: false });
        
        // Închide meniul când se apasă un link
        navLinksItems.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });
        
        // Închide meniul când se apasă ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
        
        // Închide meniul când se face click în afara lui
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && 
                !navLinks.contains(e.target) && 
                !hamburger.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    },

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        if (!hamburger || !navLinks) return;
        
        const isActive = navLinks.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    },

    /**
     * Deschide mobile menu
     */
    openMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        if (!hamburger || !navLinks) return;
        
        hamburger.classList.add('active');
        navLinks.classList.add('active');
        document.body.classList.add('menu-open');
        
        // Update ARIA
        hamburger.setAttribute('aria-expanded', 'true');
    },

    /**
     * Închide mobile menu
     */
    closeMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        if (!hamburger || !navLinks) return;
        
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.classList.remove('menu-open');
        
        // Update ARIA
        hamburger.setAttribute('aria-expanded', 'false');
    },

    /**
     * Auto-hide navbar on scroll down, show on scroll up
     * Anti-jitter: ignoră mișcări < 15px, rămâne vizibil aproape de top (< 80px)
     */
    setupAutoHideNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY;

            // Nu ascunde dacă meniul mobil e deschis
            if (document.body.classList.contains('menu-open')) {
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            // Rămâne vizibil aproape de top
            if (currentY < 80) {
                navbar.classList.remove('navbar--hidden');
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            // Anti-jitter: ignoră mișcări mici
            if (Math.abs(delta) < 15) {
                ticking = false;
                return;
            }

            if (delta > 0) {
                // Scroll în jos → ascunde
                navbar.classList.add('navbar--hidden');
            } else {
                // Scroll în sus → arată
                navbar.classList.remove('navbar--hidden');
            }

            lastScrollY = currentY < 0 ? 0 : currentY; // Protecție iOS elastic scroll
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(onScroll);
                ticking = true;
            }
        }, { passive: true });
    }
};
