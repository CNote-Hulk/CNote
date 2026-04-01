/**
 * Profile Dropdown Module
 * Shows profile dropdown for both logged-in and logged-out states,
 * with language selector and theme switcher in both.
 */

import { AuthModule } from './auth.js';
import { I18nModule } from './i18n.js';

const THEME_KEY = 'cnote-theme';
const ACCENT_KEY = 'cnote-accent-color';

// Apply saved theme immediately on module load (prevents flash)
(function () {
    const t = localStorage.getItem(THEME_KEY) || '';
    document.documentElement.dataset.theme = t;
})();

// Apply saved accent color immediately on module load
(function () {
    const hex = localStorage.getItem(ACCENT_KEY);
    if (!hex) return;
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const lighten = (c) => Math.min(255, Math.floor(c + (255 - c) * 0.2));
    const light = `#${lighten(r).toString(16).padStart(2,'0')}${lighten(g).toString(16).padStart(2,'0')}${lighten(b).toString(16).padStart(2,'0')}`;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', hex);
    root.style.setProperty('--accent-light', light);
    root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--glow-accent', `0 0 20px rgba(${r}, ${g}, ${b}, 0.15)`);
})();

export const ProfileDropdownModule = {
    _dropdown: null,
    _btn: null,
    _open: false,

    _escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    init() {
        if (this._dropdown) return;
        this._btn = document.querySelector('.navbar-profile-btn');
        if (!this._btn) return;

        this._btn.parentElement.querySelectorAll('.profile-dropdown').forEach(d => d.remove());

        this._createDropdown();
        this._bind();
    },

    _resolvePagePath(page) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + page;
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../' + page;
        if (path.includes('/pages/') || path.includes('\\pages\\')) return page;
        return '/html/pages/' + page;
    },

    _langSelectorHTML() {
        return `
            <div class="profile-dropdown__divider"></div>
            <div class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <span data-i18n="profile_language"></span>
                <select class="profile-dropdown__lang-select" aria-label="Language selector">
                    <option value="en" data-i18n="lang_en">English</option>
                    <option value="ro" data-i18n="lang_ro">Română</option>
                    <option value="es" data-i18n="lang_es">Español</option>
                    <option value="fr" data-i18n="lang_fr">Français</option>
                    <option value="it" data-i18n="lang_it">Italiano</option>
                    <option value="de" data-i18n="lang_de">Deutsch</option>
                </select>
            </div>`;
    },

    _themePickerHTML() {
        const current = localStorage.getItem(THEME_KEY) || '';
        const active = (t) => current === t ? ' active' : '';
        return `
            <div class="profile-dropdown__divider"></div>
            <div class="profile-dropdown__item profile-dropdown__theme-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                <span data-i18n="profile_theme">Theme</span>
                <div class="profile-dropdown__theme-btns">
                    <button class="profile-dropdown__theme-btn${active('')}" data-theme="" title="Default">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </button>
                    <button class="profile-dropdown__theme-btn${active('dark')}" data-theme="dark" title="Dark">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                    </button>
                    <button class="profile-dropdown__theme-btn${active('light')}" data-theme="light" title="Light">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                    </button>
                </div>
            </div>`;
    },

    _createDropdown() {
        const dd = document.createElement('div');
        dd.className = 'profile-dropdown';
        this._btn.parentElement.appendChild(dd);
        this._dropdown = dd;

        if (AuthModule.isLoggedIn()) {
            this._buildLoggedIn(dd);
        } else {
            this._buildLoggedOut(dd);
        }

        I18nModule.apply();
    },

    _buildLoggedIn(dd) {
        const user = AuthModule.getCurrentUser() || {};
        const name = this._escapeHtml(user.username || 'User');
        const email = this._escapeHtml(user.email || 'No email');
        const avatar = user.avatar ? this._escapeHtml(user.avatar) : '';
        const profilePath = this._resolvePagePath('profil.html');
        const avatarMarkup = avatar
            ? `<img src="${avatar}" alt="User avatar" class="profile-dropdown__avatar-img">`
            : `<span class="profile-dropdown__avatar-fallback" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                    </svg>
               </span>`;

        dd.innerHTML = `
            <a href="${profilePath}" class="profile-dropdown__profile">
                <span class="profile-dropdown__avatar">${avatarMarkup}</span>
                <span class="profile-dropdown__meta">
                    <span class="profile-dropdown__name">${name}</span>
                    <span class="profile-dropdown__email">${email}</span>
                </span>
            </a>
            <div class="profile-dropdown__divider profile-dropdown__divider--profile"></div>
            <a href="${this._resolvePagePath('community.html')}#dm" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span data-i18n="profile_dm">Direct Messages</span>
            </a>
            <a href="${this._resolvePagePath('community.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span data-i18n="profile_notifications">Notifications</span>
            </a>
            <a href="${this._resolvePagePath('help.html')}#repair" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span data-i18n="profile_requests">Requests</span>
            </a>
            <div class="profile-dropdown__divider"></div>
            <a href="${this._resolvePagePath('invata.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span data-i18n="profile_courses">My Courses</span>
            </a>
            <a href="${this._resolvePagePath('home.html')}#achievements" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span data-i18n="profile_achievements">Achievements</span>
            </a>
            <a href="${this._resolvePagePath('community.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <span data-i18n="profile_announcements">My Posts</span>
            </a>
            <a href="${this._resolvePagePath('community.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span data-i18n="profile_favorites">Liked Posts</span>
            </a>
            <a href="${this._resolvePagePath('home.html')}#friends" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span data-i18n="profile_friends">Friends</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#account" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span data-i18n="profile_settings">Settings</span>
            </a>
            <a href="${this._resolvePagePath('statistici.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span data-i18n="profile_stats">Statistics</span>
            </a>
            ${this._langSelectorHTML()}
            ${this._themePickerHTML()}
            <div class="profile-dropdown__divider"></div>
            <button class="profile-dropdown__item profile-dropdown__logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span data-i18n="profile_logout">Log out</span>
            </button>
        `;
    },

    _buildLoggedOut(dd) {
        dd.innerHTML = `
            <a href="${this._resolvePagePath('login.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                <span data-i18n="profile_login">Log in</span>
            </a>
            ${this._langSelectorHTML()}
            ${this._themePickerHTML()}
        `;
    },

    _setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        if (theme) {
            localStorage.setItem(THEME_KEY, theme);
        } else {
            localStorage.removeItem(THEME_KEY);
        }
        this._dropdown.querySelectorAll('.profile-dropdown__theme-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    },

    _bind() {
        // Strip any event listeners added by the fallback script
        // (fallback runs before ES modules and may attach a redirect-to-login handler)
        const cleanBtn = this._btn.cloneNode(true);
        this._btn.parentElement.replaceChild(cleanBtn, this._btn);
        this._btn = cleanBtn;

        this._btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        document.addEventListener('click', (e) => {
            if (this._open && !this._dropdown.contains(e.target) && !this._btn.contains(e.target)) {
                this.hide();
            }
        });

        const logoutBtn = this._dropdown.querySelector('.profile-dropdown__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await AuthModule.logout();
                window.location.reload();
            });
        }

        const langSelect = this._dropdown.querySelector('.profile-dropdown__lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                I18nModule.setLang(e.target.value);
            });
        }

        this._dropdown.querySelectorAll('.profile-dropdown__theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._setTheme(btn.dataset.theme);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._open) this.hide();
        });
    },

    toggle() {
        this._open ? this.hide() : this.show();
    },

    show() {
        this._open = true;
        this._dropdown.classList.add('profile-dropdown--active');
    },

    hide() {
        this._open = false;
        this._dropdown.classList.remove('profile-dropdown--active');
    }
};
