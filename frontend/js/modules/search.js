/**
 * Advanced Search Module
 * Multi-category search: consoles, pages, settings, users, dashboard sections
 * Supports Ctrl+K shortcut, keyboard navigation, categorized results
 */

import { API_BASE_URL } from '../config.js';

/* ── SVG icon map (inline, no external deps) ── */
const ICONS = {
    console: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="6" y2="12.01"/><line x1="10" y1="12" x2="10" y2="12.01"/><line x1="14" y1="12" x2="14" y2="12.01"/><line x1="18" y1="12" x2="18" y2="12.01"/></svg>',
    page: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    learn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
};

/* ── Category label map ── */
const CATEGORY_LABELS = {
    console: 'Consoles',
    page: 'Pages',
    settings: 'Settings',
    dashboard: 'Dashboard',
    user: 'Users',
    learn: 'Courses',
};

export const SearchModule = {
    _overlay: null,
    _input: null,
    _results: null,
    _consoles: [],
    _selectedIndex: -1,
    _visible: false,
    _debounceTimer: null,
    _lastUserQuery: '',

    init() {
        if (window.__SEARCH_PROFILE_INITIALIZED__) return;
        window.__SEARCH_PROFILE_INITIALIZED__ = true;
        this._loadConsoles();
        this._createOverlay();
        this._bindNavButton();
        this._bindKeys();

        window.addEventListener('cn:language-changed', () => {
            setTimeout(() => {
                if (window.CONSOLES_DATA) this._consoles = window.CONSOLES_DATA;
            }, 100);
        });
    },

    /* ── Data loading ── */

    _loadConsoles() {
        if (window.CONSOLES_DATA) { this._consoles = window.CONSOLES_DATA; return; }
        const tryLoad = () => {
            if (window.CONSOLES_DATA) this._consoles = window.CONSOLES_DATA;
            else setTimeout(tryLoad, 200);
        };
        setTimeout(tryLoad, 300);
    },

    /* ── Static search index ── */

    _getStaticIndex() {
        return [
            // ── Pages ──
            { cat: 'page', name: 'Home', desc: 'Dashboard', keywords: 'home dashboard acasa panou', href: 'home.html' },
            { cat: 'page', name: 'Community', desc: 'Forum, Marketplace, Repair', keywords: 'community forum marketplace piata reparatii comunitate', href: 'community.html' },
            { cat: 'page', name: 'Learn', desc: 'Courses & lessons', keywords: 'learn invata cursuri lectii courses education educatie', href: 'invata.html' },
            { cat: 'page', name: 'Evolution', desc: 'Console encyclopedia', keywords: 'evolution evolutie enciclopedie encyclopedia timeline istorie history', href: 'evolutie.html' },
            { cat: 'page', name: 'Compare', desc: 'Compare consoles side by side', keywords: 'compare comparatie consoles versus vs side', href: 'comparatie.html' },
            { cat: 'page', name: 'Help', desc: 'FAQ & contact', keywords: 'help ajutor faq intrebari contact support', href: 'help.html' },
            { cat: 'page', name: 'Statistics', desc: 'Platform statistics', keywords: 'statistics statistici stats analytics', href: 'statistici.html' },

            // ── Settings tabs ──
            { cat: 'settings', name: 'Account settings', desc: 'Username, bio, email', keywords: 'account cont username email bio setari settings', href: 'profil.html#account' },
            { cat: 'settings', name: 'Profile settings', desc: 'Avatar, social links, privacy', keywords: 'profile profil avatar poza social discord twitter youtube instagram privacy', href: 'profil.html#profil' },
            { cat: 'settings', name: 'Security', desc: 'Password, 2FA, sessions', keywords: 'security securitate parola password 2fa two factor authenticator sessions dispozitive devices trusted', href: 'profil.html#security' },
            { cat: 'settings', name: 'Notifications', desc: 'Email notification preferences', keywords: 'notifications notificari email alerts mesaje messages friend request', href: 'profil.html#notifications' },
            { cat: 'settings', name: 'Appearance', desc: 'Theme, accent color, language', keywords: 'appearance aparenta tema theme dark light accent color culoare language limba', href: 'profil.html#appearance' },

            // ── Granular settings ──
            { cat: 'settings', name: 'Change password', desc: 'Update your account password', keywords: 'change password schimba parola update', href: 'profil.html#security' },
            { cat: 'settings', name: 'Two-factor authentication', desc: 'Enable TOTP or email 2FA', keywords: '2fa two factor authenticator totp backup codes google authenticator doi factori', href: 'profil.html#security' },
            { cat: 'settings', name: 'Change email', desc: 'Update your email address', keywords: 'change email schimba email adresa address', href: 'profil.html#security' },
            { cat: 'settings', name: 'Theme', desc: 'Switch between dark and light mode', keywords: 'theme dark light auto mode tema luminos intunecat', href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Language', desc: 'Change app language', keywords: 'language limba english romana franceza germana spaniola italiana en ro fr de es it', href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Accent color', desc: 'Customize your accent color', keywords: 'accent color culoare personalizare customize', href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Delete account', desc: 'Permanently delete your account', keywords: 'delete account sterge cont permanent', href: 'profil.html#security' },
            { cat: 'settings', name: 'Connected accounts', desc: 'Google account linking', keywords: 'google linked connected accounts conturi conectate', href: 'profil.html#security' },
            { cat: 'settings', name: 'Trusted devices', desc: 'Manage devices that skip 2FA', keywords: 'trusted devices dispozitive incredere 2fa skip', href: 'profil.html#security' },
            { cat: 'settings', name: 'Active sessions', desc: 'View and manage login sessions', keywords: 'sessions sesiuni active login devices dispozitive logout', href: 'profil.html#security' },
            { cat: 'settings', name: 'Social links', desc: 'Discord, Twitter, YouTube, Instagram', keywords: 'social links discord twitter youtube instagram connect', href: 'profil.html#profil' },
            { cat: 'settings', name: 'Privacy', desc: 'Control profile visibility', keywords: 'privacy confidentialitate visibility show hide email stats friends', href: 'profil.html#profil' },

            // ── Dashboard panels ──
            { cat: 'dashboard', name: 'Collection', desc: 'Your owned consoles', keywords: 'collection colectie owned consoles console detinute my', href: 'home.html#collection' },
            { cat: 'dashboard', name: 'Favorites', desc: 'Your favorite consoles', keywords: 'favorites favorite consoles preferate', href: 'home.html#favorites' },
            { cat: 'dashboard', name: 'Progress', desc: 'Course progress tracker', keywords: 'progress progres course curs tracker', href: 'home.html#progress' },
            { cat: 'dashboard', name: 'Achievements', desc: 'Badges and milestones', keywords: 'achievements realizari badges insigne milestones', href: 'home.html#achievements' },
            { cat: 'dashboard', name: 'My Courses', desc: 'Enrolled courses', keywords: 'my courses cursurile mele enrolled inscris', href: 'home.html#courses' },
            { cat: 'dashboard', name: 'Friends', desc: 'Your friends list', keywords: 'friends prieteni lista list requests cereri', href: 'home.html#friends' },
            { cat: 'dashboard', name: 'My Posts', desc: 'Your forum posts', keywords: 'my posts postarile mele forum threads', href: 'home.html#posts' },
            { cat: 'dashboard', name: 'Liked Posts', desc: 'Posts you liked', keywords: 'liked posts apreciate favorite forum', href: 'home.html#liked' },

            // ── Courses ──
            { cat: 'learn', name: 'Console Engineering', desc: '42 lessons — electricity, electronics, hardware', keywords: 'console engineering inginerie electricitate electricity electronics electronica hardware arhitectura architecture diagnostics diagnosticare', href: 'invata.html' },
            { cat: 'learn', name: 'Console Modding', desc: 'Learn to mod consoles', keywords: 'console modding mod custom retro repair reparare', href: 'invata.html' },
        ];
    },

    /* ── Path resolution ── */

    _resolveImagePath(imgRelativePath) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../../' + imgRelativePath;
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../../' + imgRelativePath;
        if (path.includes('/pages/') || path.includes('\\pages\\')) return '../../' + imgRelativePath;
        return '/' + String(imgRelativePath || '').replace(/^\/+/, '');
    },

    _resolvePath(href) {
        const path = window.location.pathname;
        // If href is already absolute, return as-is
        if (href.startsWith('/') || href.startsWith('http')) return href;
        // Console detail pages
        if (href.endsWith('.html') && !href.includes('/') && !href.includes('#')) {
            // It's a simple page like "home.html" — resolve from /pages/
            if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + href;
            if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../' + href;
            if (path.includes('/pages/') || path.includes('\\pages\\')) return href;
            return '/html/pages/' + href;
        }
        // Pages with hash like "profil.html#security"
        if (href.includes('.html')) {
            const [file, hash] = href.split('#');
            let resolved;
            if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) resolved = '../' + file;
            else if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) resolved = '../' + file;
            else if (path.includes('/pages/') || path.includes('\\pages\\')) resolved = file;
            else resolved = '/html/pages/' + file;
            return hash ? resolved + '#' + hash : resolved;
        }
        return href;
    },

    _resolveConsolePath(consoleId) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return consoleId + '.html';
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../consoles/' + consoleId + '.html';
        if (path.includes('/pages/') || path.includes('\\pages\\')) return 'consoles/' + consoleId + '.html';
        return '/html/pages/consoles/' + consoleId + '.html';
    },

    _resolveUserPath(username) {
        const path = window.location.pathname;
        const file = 'user-profile.html?user=' + encodeURIComponent(username);
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + file;
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) return '../' + file;
        if (path.includes('/pages/') || path.includes('\\pages\\')) return file;
        return '/html/pages/' + file;
    },

    /* ── Overlay DOM ── */

    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-overlay__backdrop"></div>
            <div class="search-overlay__container">
                <div class="search-overlay__input-wrap">
                    <svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="search-overlay__input" placeholder="Search consoles, settings, pages, users..." autocomplete="off" spellcheck="false">
                    <kbd class="search-overlay__kbd">ESC</kbd>
                </div>
                <div class="search-overlay__results"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._input = overlay.querySelector('.search-overlay__input');
        this._results = overlay.querySelector('.search-overlay__results');

        overlay.querySelector('.search-overlay__backdrop').addEventListener('click', () => this.close());
        this._input.addEventListener('input', () => this._onInput());
        this._input.addEventListener('keydown', (e) => this._handleInputKey(e));
    },

    _bindNavButton() {
        const btn = document.querySelector('.navbar-search-btn');
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    },

    _bindKeys() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.open(); }
            if (e.key === 'Escape' && this._visible) this.close();
        });
    },

    open() {
        this._visible = true;
        this._overlay.classList.add('search-overlay--active');
        document.body.classList.add('search-open');
        this._input.value = '';
        this._results.innerHTML = '';
        this._selectedIndex = -1;
        this._lastUserQuery = '';
        setTimeout(() => this._input.focus(), 50);
    },

    close() {
        this._visible = false;
        this._overlay.classList.remove('search-overlay--active');
        document.body.classList.remove('search-open');
    },

    /* ── Normalization ── */

    _normalize(str) {
        return str.toLowerCase()
            .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
            .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
            .replace(/[-_]/g, ' ');
    },

    /* ── Input handler with debounced user search ── */

    _onInput() {
        this._selectedIndex = -1;
        const query = this._input.value.trim();
        this._searchLocal(query);

        // Debounce API user search (only for 2+ chars)
        clearTimeout(this._debounceTimer);
        if (query.length >= 2) {
            this._debounceTimer = setTimeout(() => this._searchUsers(query), 300);
        }
    },

    /* ── Local search (consoles + static index) ── */

    _searchLocal(query) {
        const q = this._normalize(query);
        if (!q) { this._results.innerHTML = ''; return; }

        const results = [];

        // Search consoles
        const consoleMatches = this._consoles.filter(c => {
            const name = this._normalize(c.name || '');
            const mfr = this._normalize(c.manufacturer || '');
            const year = String(c.release || '');
            const id = this._normalize(c.id || '');
            return name.includes(q) || mfr.includes(q) || year.includes(q) || id.includes(q);
        }).slice(0, 5);

        consoleMatches.forEach(c => {
            results.push({
                cat: 'console',
                name: c.name,
                desc: c.manufacturer + ' · ' + c.release,
                href: this._resolveConsolePath(c.id),
                img: this._resolveImagePath(c.image || ''),
            });
        });

        // Search static index
        const staticIndex = this._getStaticIndex();
        const staticMatches = staticIndex.filter(item => {
            const searchable = this._normalize(item.name + ' ' + item.desc + ' ' + (item.keywords || ''));
            return searchable.includes(q);
        }).slice(0, 6);

        staticMatches.forEach(item => {
            results.push({
                cat: item.cat,
                name: item.name,
                desc: item.desc,
                href: this._resolvePath(item.href),
            });
        });

        this._renderResults(results);
    },

    /* ── API user search ── */

    async _searchUsers(query) {
        if (query === this._lastUserQuery) return;
        this._lastUserQuery = query;

        try {
            const token = localStorage.getItem('cn_token');
            if (!token) return; // Not logged in, skip user search

            const res = await fetch(API_BASE_URL + '/users/search?q=' + encodeURIComponent(query), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success || !data.users?.length) return;

            // Merge with current results — re-read current query to avoid stale
            if (this._normalize(this._input.value.trim()) !== this._normalize(query)) return;

            const userResults = data.users.slice(0, 4).map(u => ({
                cat: 'user',
                name: u.username,
                desc: u.bio ? u.bio.substring(0, 50) : 'User',
                href: this._resolveUserPath(u.username),
                img: u.avatar || '',
            }));

            // Append user results to existing DOM
            if (userResults.length && this._results.innerHTML) {
                const existingUserSection = this._results.querySelector('[data-cat-section="user"]');
                if (existingUserSection) existingUserSection.remove();

                const userHtml = this._renderCategoryHtml('user', userResults);
                this._results.insertAdjacentHTML('beforeend', userHtml);
            }
        } catch { /* silently fail */ }
    },

    /* ── Rendering ── */

    _renderResults(results) {
        if (!results.length) {
            this._results.innerHTML = '<div class="search-overlay__empty">No results found</div>';
            return;
        }

        // Group by category, preserve order
        const grouped = new Map();
        results.forEach(r => {
            if (!grouped.has(r.cat)) grouped.set(r.cat, []);
            grouped.get(r.cat).push(r);
        });

        let html = '';
        let globalIdx = 0;
        for (const [cat, items] of grouped) {
            html += `<div class="search-category" data-cat-section="${cat}">`;
            html += `<div class="search-category__label">${ICONS[cat] || ''} ${CATEGORY_LABELS[cat] || cat}</div>`;
            items.forEach(item => {
                const imgTag = item.img
                    ? `<img class="search-result__img" src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">`
                    : `<span class="search-result__icon">${ICONS[item.cat] || ''}</span>`;
                html += `<a href="${item.href}" class="search-result" data-index="${globalIdx}">
                    ${imgTag}
                    <div class="search-result__info">
                        <span class="search-result__name">${item.name}</span>
                        <span class="search-result__meta">${item.desc}</span>
                    </div>
                </a>`;
                globalIdx++;
            });
            html += '</div>';
        }
        this._results.innerHTML = html;
    },

    _renderCategoryHtml(cat, items) {
        const existingCount = this._results.querySelectorAll('.search-result').length;
        let html = `<div class="search-category" data-cat-section="${cat}">`;
        html += `<div class="search-category__label">${ICONS[cat] || ''} ${CATEGORY_LABELS[cat] || cat}</div>`;
        let idx = existingCount;
        items.forEach(item => {
            const imgTag = item.img
                ? `<img class="search-result__img" src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">`
                : `<span class="search-result__icon">${ICONS[item.cat] || ''}</span>`;
            html += `<a href="${item.href}" class="search-result" data-index="${idx}">
                ${imgTag}
                <div class="search-result__info">
                    <span class="search-result__name">${item.name}</span>
                    <span class="search-result__meta">${item.desc}</span>
                </div>
            </a>`;
            idx++;
        });
        html += '</div>';
        return html;
    },

    /* ── Keyboard navigation ── */

    _handleInputKey(e) {
        const items = this._results.querySelectorAll('.search-result');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this._selectedIndex = Math.min(this._selectedIndex + 1, items.length - 1);
            this._highlightResult(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
            this._highlightResult(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this._selectedIndex >= 0 && items[this._selectedIndex]) {
                window.location.href = items[this._selectedIndex].href;
            }
        }
    },

    _highlightResult(items) {
        items.forEach((el, i) => {
            el.classList.toggle('search-result--active', i === this._selectedIndex);
            if (i === this._selectedIndex) el.scrollIntoView({ block: 'nearest' });
        });
    }
};
