/**
 * Navigation Module
 * Smooth scrolling, active links, mobile hamburger menu
 */

import { DOMUtils } from '../utils/dom.js';

export const NavigationModule = {
    init() {
        this.hideMbnIfGuest();
        this.setupSmoothScroll();
        this.setupActiveLinks();
        this.setupMobileMenu();
        this.setupAutoHideNavbar();
        this.setupMbnDropdown();
    },

    /**
     * Hide the mobile bottom nav for logged-out users
     */
    hideMbnIfGuest() {
        try {
            const s = JSON.parse(localStorage.getItem('cn_session'));
            if (s && s.id) return; // logged in — leave nav visible
        } catch { /* fall through */ }
        const mbn = document.getElementById('mobile-bottom-nav');
        if (mbn) mbn.style.display = 'none';
    },

    /**
     * Smooth scroll for anchor links
     */
    setupSmoothScroll() {
        DOMUtils.onAll('a[href^="#"]', 'click', (e) => {
            const href = e.currentTarget.getAttribute('href');
            if (href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Close mobile menu after navigation
                    this.closeMobileMenu();
                }
            }
        });
    },

    /**
     * Mark active link in navbar
     */
    setupActiveLinks() {
        const navLinks = document.querySelectorAll('.nav-links a');
        const logo = document.querySelector('.logo');
        
        // Add active class to logo if on the home page
        if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/pages/') || window.location.pathname.endsWith('/pages')) {
            if (logo) {
                logo.classList.add('active');
            }
        }
        
        // Add active class to navbar links
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
        const isCommunityPage = document.body.classList.contains('community-navbar-page');

        // Keep hamburger only on community page.
        if (!isCommunityPage && hamburger) {
            hamburger.remove();
            document.body.classList.remove('menu-open');
        }
        
        if (!isCommunityPage || !hamburger || !navLinks) return;
        
        // Mark that hamburger menu is initialized (to prevent fallback script from re-initializing)
        window.__HAMBURGER_INITIALIZED__ = true;
        
        // Ensure button has explicit type to avoid form submit behavior
        if (hamburger && hamburger.tagName === 'BUTTON' && !hamburger.getAttribute('type')) {
            hamburger.setAttribute('type', 'button');
        }

        // Toggle menu when hamburger is pressed (click + touchstart support for mobile)
        const toggleHandler = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.toggleMobileMenu();
        };

        hamburger.addEventListener('click', toggleHandler);
        hamburger.addEventListener('touchstart', toggleHandler, { passive: false });
        
        // Close menu when a link is pressed
        navLinksItems.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });
        
        // Close menu when ESC is pressed
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
        
        // Close menu when clicking outside it
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
     * Open mobile menu
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
     * Close mobile menu
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
     * Mobile bottom navigation — dropdown toggle and active-page marking.
     * Handles pages that use data-mbn-page attributes on nav items.
     */
    setupMbnDropdown() {
        const btn = document.getElementById('mbn-more-btn');
        const dd  = document.getElementById('mbn-dropdown');

        // Mark current page as active in the bottom nav
        const page = location.pathname.split('/').pop().replace('.html', '') || 'home';
        document.querySelectorAll('.mbn-item[data-mbn-page]').forEach(el => {
            if (el.dataset.mbnPage === page) el.classList.add('mbn-item--active');
        });
        document.querySelectorAll('.mbn-dd-item[data-mbn-page]').forEach(el => {
            if (el.dataset.mbnPage === page) {
                el.classList.add('mbn-item--active');
                if (btn) btn.classList.add('mbn-item--active');
            }
        });

        if (!btn || !dd) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dd.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('click', () => {
            dd.classList.remove('is-open');
            btn.setAttribute('aria-expanded', 'false');
        });
        dd.addEventListener('click', (e) => e.stopPropagation());
    },

    /**
     * Auto-hide navbar on scroll down, show on scroll up
     * Anti-jitter: ignore moves < 15px, stays visible near top (< 80px)
     */
    setupAutoHideNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        const mbn = document.getElementById('mobile-bottom-nav');

        const isHomePage = document.body.classList.contains('home-page');
        const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

        // Home desktop keeps navbar fixed; Home mobile uses auto-hide.
        if (isHomePage && !isMobileViewport) {
            navbar.classList.remove('navbar--hidden');
            if (mbn) mbn.classList.remove('mbn--hidden');
            return;
        }

        let lastScrollY = window.scrollY;
        let ticking = false;

        const onScroll = () => {
            const currentY = window.scrollY;
            const delta = currentY - lastScrollY;

            // Don't hide if mobile menu is open
            if (document.body.classList.contains('menu-open')) {
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            // Stay visible near top
            if (currentY < 80) {
                navbar.classList.remove('navbar--hidden');
                if (mbn && !isHomePage) mbn.classList.remove('mbn--hidden');
                lastScrollY = currentY;
                ticking = false;
                return;
            }

            // Anti-jitter: ignore small movements
            if (Math.abs(delta) < 15) {
                ticking = false;
                return;
            }

            if (delta > 0) {
                // Scroll down → hide
                navbar.classList.add('navbar--hidden');
                if (mbn && !isHomePage) mbn.classList.add('mbn--hidden');
            } else {
                // Scroll up → show
                navbar.classList.remove('navbar--hidden');
                if (mbn && !isHomePage) mbn.classList.remove('mbn--hidden');
            }

            lastScrollY = currentY < 0 ? 0 : currentY; // iOS elastic scroll protection
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
