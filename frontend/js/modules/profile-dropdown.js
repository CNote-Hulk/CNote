/**
 * Profile Dropdown Module
 * Shows profile dropdown or redirects to login
 */

import { AuthModule } from './auth.js';
import { I18nModule } from './i18n.js';

export const ProfileDropdownModule = {
    _dropdown: null,
    _btn: null,
    _open: false,

    /** Escape HTML special characters */
    _escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    /** Initialize the dropdown: find button, build DOM, bind events */
    init() {
        if (this._dropdown) return;
        this._btn = document.querySelector('.navbar-profile-btn');
        if (!this._btn) return;

        // Remove any pre-existing fallback dropdown
        this._btn.parentElement.querySelectorAll('.profile-dropdown').forEach(d => d.remove());

        this._createDropdown();
        this._bind();
    },

    /** Resolve relative page path based on current location depth */
    _resolvePagePath(page) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + page;
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../' + page;
        if (path.includes('/pages/') || path.includes('\\pages\\')) return page;
        return '/html/pages/' + page;
    },

    /** Build the dropdown HTML: avatar, name, email, links, logout */
    _createDropdown() {
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

        const dd = document.createElement('div');
        dd.className = 'profile-dropdown';
        dd.innerHTML = `
            <a href="${profilePath}" class="profile-dropdown__profile">
                <span class="profile-dropdown__avatar">${avatarMarkup}</span>
                <span class="profile-dropdown__meta">
                    <span class="profile-dropdown__name">${name}</span>
                    <span class="profile-dropdown__email">${email}</span>
                </span>
            </a>
            <div class="profile-dropdown__divider profile-dropdown__divider--profile"></div>
            <a href="${this._resolvePagePath('profil.html')}#cursuri" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <span data-i18n="profile_courses">My Courses</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#realizari" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                <span data-i18n="profile_achievements">Achievements</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#anunturi" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <span data-i18n="profile_announcements">My Posts</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#favorite" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span data-i18n="profile_favorites">Liked Posts</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#prieteni" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span data-i18n="profile_friends">Friends</span>
            </a>
            <a href="${this._resolvePagePath('profil.html')}#setari" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span data-i18n="profile_settings">Settings</span>
            </a>
            <a href="${this._resolvePagePath('statistici.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span data-i18n="profile_stats">Statistics</span>
            </a>
            <div class="profile-dropdown__divider"></div>
            <div class="profile-dropdown__item">
                <span data-i18n="profile_language"></span>
                <select class="profile-dropdown__lang-select" aria-label="Language selector">
                    <option value="en" data-i18n="lang_en">English</option>
                    <option value="ro" data-i18n="lang_ro">Română</option>
                    <option value="es" data-i18n="lang_es">Español</option>
                    <option value="fr" data-i18n="lang_fr">Français</option>
                    <option value="it" data-i18n="lang_it">Italiano</option>
                    <option value="de" data-i18n="lang_de">Deutsch</option>
                </select>
            </div>
            <div class="profile-dropdown__divider"></div>
            <button class="profile-dropdown__item profile-dropdown__logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span data-i18n="profile_logout">Log out</span>
            </button>
        `;
        this._btn.parentElement.appendChild(dd);
        this._dropdown = dd;

        // Translate the newly created dropdown content
        I18nModule.apply();
    },

    /** Bind click/keyboard events for open, close, outside-click */
    _bind() {
        this._btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!AuthModule.isLoggedIn()) {
                window.location.href = this._resolvePagePath('login.html');
                return;
            }
            this.toggle();
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this._open && !this._dropdown.contains(e.target) && !this._btn.contains(e.target)) {
                this.hide();
            }
        });

        // Logout
        const logoutBtn = this._dropdown.querySelector('.profile-dropdown__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await AuthModule.logout();
                window.location.reload();
            });
        }

        // Language switcher
        const langSelect = this._dropdown.querySelector('.profile-dropdown__lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (event) => {
                I18nModule.setLang(event.target.value);
            });
        }

        // Close on ESC
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
