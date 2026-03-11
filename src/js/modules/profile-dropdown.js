/**
 * Profile Dropdown Module
 * Shows profile dropdown or redirects to login
 */

import { AuthModule } from './auth.js';

export const ProfileDropdownModule = {
    _dropdown: null,
    _btn: null,
    _open: false,

    init() {
        this._btn = document.querySelector('.navbar-profile-btn');
        if (!this._btn) return;

        this._createDropdown();
        this._bind();
    },

    _resolvePagePath(page) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + page;
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../' + page;
        if (path.includes('/pages/') || path.includes('\\pages\\')) return page;
        return 'src/html/pages/' + page;
    },

    _createDropdown() {
        const dd = document.createElement('div');
        dd.className = 'profile-dropdown';
        dd.innerHTML = `
            <a href="${this._resolvePagePath('profil.html')}" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profil
            </a>
            <a href="${this._resolvePagePath('profil.html')}#cursuri" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Cursurile Mele
            </a>
            <a href="${this._resolvePagePath('profil.html')}#realizari" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
                Realizări
            </a>
            <a href="${this._resolvePagePath('profil.html')}#setari" class="profile-dropdown__item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Setări
            </a>
            <div class="profile-dropdown__divider"></div>
            <button class="profile-dropdown__item profile-dropdown__logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Deconectare
            </button>
        `;
        this._btn.parentElement.appendChild(dd);
        this._dropdown = dd;
    },

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
            logoutBtn.addEventListener('click', () => {
                AuthModule.logout();
                window.location.reload();
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
