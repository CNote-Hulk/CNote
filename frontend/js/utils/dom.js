/**
 * DOM Utilities
 * Selectors, event handlers, class management
 */

export const DOMUtils = {
    /**
     * Select element
     */
    select(selector) {
        return document.querySelector(selector);
    },

    /**
     * Select all elements
     */
    selectAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Create element
     */
    createElement(tag, classes = '', attrs = {}) {
        const el = document.createElement(tag);
        if (classes) el.className = classes;
        Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
        return el;
    },

    /**
     * Add class
     */
    addClass(el, className) {
        if (el) el.classList.add(className);
    },

    /**
     * Remove class
     */
    removeClass(el, className) {
        if (el) el.classList.remove(className);
    },

    /**
     * Toggle class
     */
    toggleClass(el, className) {
        if (el) el.classList.toggle(className);
    },

    /**
     * Set text
     */
    setText(el, text) {
        if (el) el.textContent = text;
    },

    /**
     * Set HTML
     */
    setHTML(el, html) {
        if (el) el.innerHTML = html;
    },

    /**
     * Get input value
     */
    getValue(selector) {
        const el = document.querySelector(selector);
        return el ? el.value : null;
    },

    /**
     * Set input value
     */
    setValue(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.value = value;
    },

    /**
     * Add event listener
     */
    on(selector, event, callback) {
        const el = document.querySelector(selector);
        if (el) el.addEventListener(event, callback);
    },

    /**
     * Add event listener on multiple elements
     */
    onAll(selector, event, callback) {
        document.querySelectorAll(selector).forEach(el => {
            el.addEventListener(event, callback);
        });
    },

    /**
     * Scroll smooth
     */
    smoothScroll(selector) {
        const el = document.querySelector(selector);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

};
