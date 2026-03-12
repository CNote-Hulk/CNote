/**
 * Animations Module
 * Scroll animations, fade-ins, intersection observer
 */

import { DOMUtils } from '../utils/dom.js';

export const AnimationsModule = {
    observer: null,

    init() {
        this.setupIntersectionObserver();
        this.setupScrollAnimations();
    },

    /**
     * Intersection Observer pentru fade-in pe scroll
     */
    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    entry.target.style.animation = 'fadeIn 0.8s ease-in';
                }
            });
        }, { threshold: 0.1 });

        // Observă cards și alte elemente
        document.querySelectorAll('.card, .section-intro').forEach(el => {
            this.observer.observe(el);
        });
    },

    /**
     * Scroll animations
     */
    setupScrollAnimations() {
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY;
            // Poți adăuga logică suplimentară de animații pe scroll
        });
    },

    /**
     * Adaugă fade animation
     */
    addFadeInAnimation(selector) {
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
            el.classList.add('animate-fade-in');
        });
    }
};
