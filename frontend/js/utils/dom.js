/**
 * DOM Utilities
 * Selectors, event handlers, class management
 */

export const DOMUtils = {
    /**
     * Selectează element
     */
    select(selector) {
        return document.querySelector(selector);
    },

    /**
     * Selectează toate elementele
     */
    selectAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Creadă element
     */
    createElement(tag, classes = '', attrs = {}) {
        const el = document.createElement(tag);
        if (classes) el.className = classes;
        Object.keys(attrs).forEach(key => el.setAttribute(key, attrs[key]));
        return el;
    },

    /**
     * Adaugă clase
     */
    addClass(el, className) {
        if (el) el.classList.add(className);
    },

    /**
     * Elimină clase
     */
    removeClass(el, className) {
        if (el) el.classList.remove(className);
    },

    /**
     * Toggle clasă
     */
    toggleClass(el, className) {
        if (el) el.classList.toggle(className);
    },

    /**
     * Schimbă text
     */
    setText(el, text) {
        if (el) el.textContent = text;
    },

    /**
     * Schimbă HTML
     */
    setHTML(el, html) {
        if (el) el.innerHTML = html;
    },

    /**
     * Obține valoare input
     */
    getValue(selector) {
        const el = document.querySelector(selector);
        return el ? el.value : null;
    },

    /**
     * Setează valoare input
     */
    setValue(selector, value) {
        const el = document.querySelector(selector);
        if (el) el.value = value;
    },

    /**
     * Adaugă event listener
     */
    on(selector, event, callback) {
        const el = document.querySelector(selector);
        if (el) el.addEventListener(event, callback);
    },

    /**
     * Adaugă event listener pe multiple elemente
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
