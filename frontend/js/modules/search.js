/**
 * Advanced Search Module v2
 * Categories (priority order): Consoles → People → Marketplace Posts → Settings/Pages
 * Features: filter tabs, recent searches, keyboard nav, async API search
 */

import { API_BASE_URL } from '../config.js';

/* ── SVG icon map ── */
const ICONS = {
    console:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="6" y2="12.01"/><line x1="10" y1="12" x2="10" y2="12.01"/><line x1="14" y1="12" x2="14" y2="12.01"/><line x1="18" y1="12" x2="18" y2="12.01"/></svg>',
    user:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    marketplace: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    settings:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    page:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    dashboard:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    learn:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    recent:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
};

/* ── Category display labels ── */
const CATEGORY_LABELS = {
    console:     'Consoles',
    user:        'People',
    marketplace: 'Marketplace',
    settings:    'Settings',
    page:        'Pages',
    dashboard:   'Dashboard',
    learn:       'Courses',
};

/* ── Render priority order ── */
const RENDER_ORDER = ['console', 'user', 'marketplace', 'page', 'dashboard', 'settings', 'learn'];

/* ── Filter tab definitions ── */
const FILTER_TABS = [
    { id: 'all',         label: 'All' },
    { id: 'console',     label: 'Consoles' },
    { id: 'user',        label: 'People' },
    { id: 'marketplace', label: 'Posts' },
    { id: 'settings',    label: 'Settings' },
];

/* ── Categories visible per filter tab ── */
const FILTER_CATEGORIES = {
    all:         null, // show all
    console:     ['console'],
    user:        ['user'],
    marketplace: ['marketplace'],
    settings:    ['settings', 'page', 'dashboard', 'learn'],
};

/* ── localStorage key for recent searches ── */
const RECENT_KEY = 'cn_search_recent';
const RECENT_MAX  = 6;

export const SearchModule = {
    _overlay:       null,
    _input:         null,
    _results:       null,
    _consoles:      [],
    _selectedIndex: -1,
    _visible:       false,
    _debounceTimer: null,
    _activeFilter:  'all',

    /* Accumulated results state — each async call updates its slice then re-renders */
    _state: { console: [], user: [], marketplace: [], page: [], dashboard: [], settings: [], learn: [] },
    _currentQuery: '',

    /* ── Init ── */

    init() {
        if (window.__SEARCH_PROFILE_INITIALIZED__) return;
        window.__SEARCH_PROFILE_INITIALIZED__ = true;
        this._loadConsoles();
        this._createOverlay();
        this._bindNavButton();
        this._bindKeys();

        window.addEventListener('cn:language-changed', () => {
            setTimeout(() => { if (window.CONSOLES_DATA) this._consoles = window.CONSOLES_DATA; }, 100);
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
            { cat: 'page', name: 'Home',       desc: 'Dashboard',                   keywords: 'home dashboard acasa panou',                                                               href: 'home.html' },
            { cat: 'page', name: 'Community',  desc: 'Forum, Marketplace, Repair',  keywords: 'community forum marketplace piata reparatii comunitate',                                   href: 'community.html' },
            { cat: 'page', name: 'Learn',      desc: 'Courses & lessons',           keywords: 'learn invata cursuri lectii courses education educatie',                                    href: 'invata.html' },
            { cat: 'page', name: 'Evolution',  desc: 'Console encyclopedia',        keywords: 'evolution evolutie enciclopedie encyclopedia timeline istorie history',                     href: 'evolutie.html' },
            { cat: 'page', name: 'Compare',    desc: 'Compare consoles side by side', keywords: 'compare comparatie consoles versus vs side',                                             href: 'comparatie.html' },
            { cat: 'page', name: 'Help',       desc: 'FAQ & contact',               keywords: 'help ajutor faq intrebari contact support',                                                href: 'help.html' },
            { cat: 'page', name: 'Statistics', desc: 'Platform statistics',         keywords: 'statistics statistici stats analytics',                                                    href: 'statistici.html' },

            // ── Settings tabs ──
            { cat: 'settings', name: 'Account settings',   desc: 'Username, bio, email',              keywords: 'account cont username email bio setari settings',                                  href: 'profil.html#account' },
            { cat: 'settings', name: 'Profile settings',   desc: 'Avatar, social links, privacy',     keywords: 'profile profil avatar poza social discord twitter youtube instagram privacy',       href: 'profil.html#profil' },
            { cat: 'settings', name: 'Security',           desc: 'Password, 2FA, sessions',           keywords: 'security securitate parola password 2fa two factor authenticator sessions',        href: 'profil.html#security' },
            { cat: 'settings', name: 'Notifications',      desc: 'Email notification preferences',    keywords: 'notifications notificari email alerts mesaje messages friend request',              href: 'profil.html#notifications' },
            { cat: 'settings', name: 'Appearance',         desc: 'Theme, accent color, language',     keywords: 'appearance aparenta tema theme dark light accent color culoare language limba',     href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Change password',    desc: 'Update your account password',      keywords: 'change password schimba parola update',                                            href: 'profil.html#security' },
            { cat: 'settings', name: 'Two-factor auth',    desc: 'Enable TOTP or email 2FA',          keywords: '2fa two factor authenticator totp backup codes google doi factori',                 href: 'profil.html#security' },
            { cat: 'settings', name: 'Change email',       desc: 'Update your email address',         keywords: 'change email schimba adresa address',                                              href: 'profil.html#security' },
            { cat: 'settings', name: 'Theme',              desc: 'Switch between dark and light mode', keywords: 'theme dark light auto mode tema luminos intunecat',                               href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Language',           desc: 'Change app language',               keywords: 'language limba english romana franceza germana spaniola',                          href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Accent color',       desc: 'Customize your accent color',       keywords: 'accent color culoare personalizare customize',                                     href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Delete account',     desc: 'Permanently delete your account',   keywords: 'delete account sterge cont permanent',                                             href: 'profil.html#security' },
            { cat: 'settings', name: 'Trusted devices',    desc: 'Manage devices that skip 2FA',      keywords: 'trusted devices dispozitive incredere 2fa skip',                                   href: 'profil.html#security' },
            { cat: 'settings', name: 'Active sessions',    desc: 'View and manage login sessions',    keywords: 'sessions sesiuni active login devices dispozitive logout',                         href: 'profil.html#security' },
            { cat: 'settings', name: 'Social links',       desc: 'Discord, Twitter, YouTube, Instagram', keywords: 'social links discord twitter youtube instagram connect',                        href: 'profil.html#profil' },
            { cat: 'settings', name: 'Privacy',            desc: 'Control profile visibility',        keywords: 'privacy confidentialitate visibility show hide email stats friends',               href: 'profil.html#profil' },

            // ── Dashboard panels ──
            { cat: 'dashboard', name: 'Collection',   desc: 'Your owned consoles',     keywords: 'collection colectie owned consoles detinute my',       href: 'home.html#collection' },
            { cat: 'dashboard', name: 'Favorites',    desc: 'Your favorite consoles',  keywords: 'favorites favorite consoles preferate',                 href: 'home.html#favorites' },
            { cat: 'dashboard', name: 'Progress',     desc: 'Course progress tracker', keywords: 'progress progres course curs tracker',                  href: 'home.html#progress' },
            { cat: 'dashboard', name: 'Achievements', desc: 'Badges and milestones',   keywords: 'achievements realizari badges insigne milestones',       href: 'home.html#achievements' },
            { cat: 'dashboard', name: 'Friends',      desc: 'Your friends list',       keywords: 'friends prieteni lista list requests cereri',            href: 'home.html#friends' },
            { cat: 'dashboard', name: 'My Posts',     desc: 'Your forum posts',        keywords: 'my posts postarile mele forum threads',                  href: 'home.html#posts' },
            { cat: 'dashboard', name: 'Liked Posts',  desc: 'Posts you liked',         keywords: 'liked posts apreciate favorite forum',                   href: 'home.html#liked' },

            // ── Courses ──
            { cat: 'learn', name: 'Console Engineering', desc: '42 lessons — electricity, electronics, hardware', keywords: 'console engineering inginerie electricitate hardware arhitectura diagnostics', href: 'invata.html' },
            { cat: 'learn', name: 'Console Modding',     desc: 'Learn to mod consoles',                          keywords: 'console modding mod custom retro repair reparare',                          href: 'invata.html' },
        ];
    },

    /* ── Path resolution ── */

    _resolveImagePath(imgRelativePath) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../../' + imgRelativePath;
        if (path.includes('/pages/curs/')     || path.includes('\\pages\\curs\\'))     return '../../' + imgRelativePath;
        if (path.includes('/pages/')          || path.includes('\\pages\\'))           return '../../' + imgRelativePath;
        return '/' + String(imgRelativePath || '').replace(/^\/+/, '');
    },

    _resolvePath(href) {
        const path = window.location.pathname;
        if (href.startsWith('/') || href.startsWith('http')) return href;
        if (href.endsWith('.html') && !href.includes('/') && !href.includes('#')) {
            if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + href;
            if (path.includes('/pages/curs/')     || path.includes('\\pages\\curs\\'))     return '../' + href;
            if (path.includes('/pages/')          || path.includes('\\pages\\'))           return href;
            return '/html/pages/' + href;
        }
        if (href.includes('.html')) {
            const [file, hash] = href.split('#');
            let resolved;
            if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) resolved = '../' + file;
            else if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\'))    resolved = '../' + file;
            else if (path.includes('/pages/')      || path.includes('\\pages\\'))          resolved = file;
            else resolved = '/html/pages/' + file;
            return hash ? resolved + '#' + hash : resolved;
        }
        return href;
    },

    _resolveConsolePath(consoleId) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return consoleId + '.html';
        if (path.includes('/pages/curs/')     || path.includes('\\pages\\curs\\'))     return '../consoles/' + consoleId + '.html';
        if (path.includes('/pages/')          || path.includes('\\pages\\'))           return 'consoles/' + consoleId + '.html';
        return '/html/pages/consoles/' + consoleId + '.html';
    },

    _resolveUserPath(username) {
        const path = window.location.pathname;
        const file = 'user-profile.html?username=' + encodeURIComponent(username);
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../' + file;
        if (path.includes('/pages/curs/')     || path.includes('\\pages\\curs\\'))     return '../' + file;
        if (path.includes('/pages/')          || path.includes('\\pages\\'))           return file;
        return '/html/pages/' + file;
    },

    _resolveCommunityPath() {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) return '../community.html';
        if (path.includes('/pages/curs/')     || path.includes('\\pages\\curs\\'))     return '../community.html';
        if (path.includes('/pages/')          || path.includes('\\pages\\'))           return 'community.html';
        return '/html/pages/community.html';
    },

    /* ── Overlay DOM ── */

    _createOverlay() {
        const filterHtml = FILTER_TABS.map(t =>
            `<button class="search-filter-btn${t.id === 'all' ? ' search-filter-btn--active' : ''}" data-filter="${t.id}">${t.label}</button>`
        ).join('');

        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-overlay__backdrop"></div>
            <div class="search-overlay__container">
                <div class="search-overlay__input-wrap">
                    <svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="search-overlay__input" placeholder="Search consoles, people, posts, settings..." autocomplete="off" spellcheck="false">
                    <kbd class="search-overlay__kbd">ESC</kbd>
                </div>
                <div class="search-overlay__filters">${filterHtml}</div>
                <div class="search-overlay__results"></div>
                <div class="search-overlay__footer">
                    <span class="search-footer-hint"><kbd>↑↓</kbd> navigate</kbd></span>
                    <span class="search-footer-hint"><kbd>↵</kbd> open</span>
                    <span class="search-footer-hint"><kbd>ESC</kbd> close</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._input   = overlay.querySelector('.search-overlay__input');
        this._results = overlay.querySelector('.search-overlay__results');

        overlay.querySelector('.search-overlay__backdrop').addEventListener('click', () => this.close());
        this._input.addEventListener('input',   () => this._onInput());
        this._input.addEventListener('keydown', (e) => this._handleInputKey(e));

        overlay.querySelectorAll('.search-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this._setFilter(btn.dataset.filter));
        });
    },

    _bindNavButton() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.navbar-search-btn')) {
                e.preventDefault();
                this.open();
            }
        });
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
        this._currentQuery = '';
        this._selectedIndex = -1;
        this._setFilter('all', false);
        this._clearState();
        this._showRecent();
        setTimeout(() => this._input.focus(), 50);
    },

    close() {
        this._visible = false;
        this._overlay.classList.remove('search-overlay--active');
        document.body.classList.remove('search-open');
    },

    /* ── State helpers ── */

    _clearState() {
        Object.keys(this._state).forEach(k => { this._state[k] = []; });
    },

    /* ── Filter tab ── */

    _setFilter(filterId, rerender = true) {
        this._activeFilter = filterId;
        this._overlay.querySelectorAll('.search-filter-btn').forEach(btn => {
            btn.classList.toggle('search-filter-btn--active', btn.dataset.filter === filterId);
        });
        if (rerender && this._currentQuery) this._render();
    },

    /* ── Normalization ── */

    _normalize(str) {
        return str.toLowerCase()
            .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
            .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
            .replace(/[-_]/g, ' ');
    },

    /* ── Input handler ── */

    _onInput() {
        this._selectedIndex = -1;
        const query = this._input.value.trim();
        this._currentQuery = query;

        if (!query) { this._clearState(); this._showRecent(); return; }

        this._searchLocal(query);

        clearTimeout(this._debounceTimer);
        if (query.length >= 2) {
            this._debounceTimer = setTimeout(() => this._searchAsync(query), 300);
        }
    },

    /* ── Local search (consoles + static index) ── */

    _searchLocal(query) {
        const q = this._normalize(query);

        // Consoles
        this._state.console = this._consoles.filter(c => {
            const name = this._normalize(c.name || '');
            const mfr  = this._normalize(c.manufacturer || '');
            const year = String(c.release || '');
            const id   = this._normalize(c.id || '');
            return name.includes(q) || mfr.includes(q) || year.includes(q) || id.includes(q);
        }).slice(0, 6).map(c => ({
            cat:  'console',
            name: c.name,
            desc: c.manufacturer + ' · ' + c.release,
            href: this._resolveConsolePath(c.id),
            img:  this._resolveImagePath(c.image || ''),
        }));

        // Static index (settings, pages, dashboard, learn)
        const staticIndex = this._getStaticIndex();
        ['page', 'dashboard', 'settings', 'learn'].forEach(cat => { this._state[cat] = []; });

        staticIndex.forEach(item => {
            const searchable = this._normalize(item.name + ' ' + item.desc + ' ' + (item.keywords || ''));
            if (!searchable.includes(q)) return;
            const bucket = item.cat;
            if (this._state[bucket] && this._state[bucket].length < 5) {
                this._state[bucket].push({
                    cat:  bucket,
                    name: item.name,
                    desc: item.desc,
                    href: this._resolvePath(item.href),
                });
            }
        });

        this._render();
    },

    /* ── Async search (users + marketplace) ── */

    async _searchAsync(query) {
        if (query !== this._currentQuery) return;
        await Promise.allSettled([
            this._searchUsers(query),
            this._searchMarketplace(query),
        ]);
    },

    async _searchUsers(query) {
        try {
            const token = localStorage.getItem('cn_token');
            if (!token) return;
            const res = await fetch(API_BASE_URL + '/users/search?q=' + encodeURIComponent(query), {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success || !data.users?.length) return;
            if (query !== this._currentQuery) return;

            this._state.user = data.users.slice(0, 5).map(u => ({
                cat:  'user',
                name: u.username,
                desc: u.bio ? u.bio.substring(0, 60) : 'User',
                href: this._resolveUserPath(u.username),
                img:  u.avatar || '',
            }));
            this._render();
        } catch { /* silently fail */ }
    },

    async _searchMarketplace(query) {
        try {
            const res = await fetch(API_BASE_URL + '/marketplace/listings?search=' + encodeURIComponent(query) + '&limit=4&sort=newest');
            if (!res.ok) return;
            const data = await res.json();
            if (!data.success || !data.listings?.length) return;
            if (query !== this._currentQuery) return;

            this._state.marketplace = data.listings.slice(0, 4).map(l => ({
                cat:   'marketplace',
                name:  l.title,
                desc:  (l.price != null ? l.price + ' RON' : '') + (l.condition ? ' · ' + l.condition : ''),
                href:  this._resolveCommunityPath(),
                img:   l.cover_image || '',
                badge: l.price != null ? l.price + ' RON' : null,
            }));
            this._render();
        } catch { /* silently fail */ }
    },

    /* ── Recent searches ── */

    _getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
    },

    _saveRecent(query) {
        if (!query || query.length < 2) return;
        const list = this._getRecent().filter(q => q !== query);
        list.unshift(query);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
    },

    _clearRecent() {
        localStorage.removeItem(RECENT_KEY);
        this._showRecent();
    },

    _showRecent() {
        const recent = this._getRecent();
        if (!recent.length) {
            this._results.innerHTML = '<div class="search-overlay__empty">Start typing to search...</div>';
            return;
        }
        let html = '<div class="search-recent">';
        html += '<div class="search-recent__header"><span class="search-recent__label">Recent searches</span><button class="search-recent__clear">Clear</button></div>';
        recent.forEach(q => {
            html += `<button class="search-recent-item" data-query="${this._escHtml(q)}">
                <span class="search-result__icon">${ICONS.recent}</span>
                <span class="search-recent-item__text">${this._escHtml(q)}</span>
            </button>`;
        });
        html += '</div>';
        this._results.innerHTML = html;

        this._results.querySelector('.search-recent__clear')?.addEventListener('click', () => this._clearRecent());
        this._results.querySelectorAll('.search-recent-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this._input.value = btn.dataset.query;
                this._onInput();
                this._input.focus();
            });
        });
    },

    _escHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /* ── Rendering ── */

    _render() {
        const allowed = FILTER_CATEGORIES[this._activeFilter];

        // Collect results in priority order, filtered by active tab
        const grouped = new Map();
        RENDER_ORDER.forEach(cat => {
            if (allowed && !allowed.includes(cat)) return;
            if (this._state[cat]?.length) grouped.set(cat, this._state[cat]);
        });

        if (!grouped.size) {
            this._results.innerHTML = '<div class="search-overlay__empty">No results found</div>';
            return;
        }

        let html = '';
        let globalIdx = 0;

        for (const [cat, items] of grouped) {
            html += `<div class="search-category" data-cat-section="${cat}">`;
            html += `<div class="search-category__label search-category__label--${cat}">${ICONS[cat] || ''} ${CATEGORY_LABELS[cat] || cat}</div>`;
            items.forEach(item => {
                const imgTag = item.img
                    ? `<img class="search-result__img" src="${item.img}" alt="" loading="lazy" onerror="this.style.display='none'">`
                    : `<span class="search-result__icon search-result__icon--${cat}">${ICONS[cat] || ''}</span>`;
                const badgeHtml = item.badge
                    ? `<span class="search-result__badge">${this._escHtml(item.badge)}</span>`
                    : '';
                html += `<a href="${item.href}" class="search-result" data-index="${globalIdx}">
                    ${imgTag}
                    <div class="search-result__info">
                        <span class="search-result__name">${this._escHtml(item.name)}</span>
                        <span class="search-result__meta">${this._escHtml(item.desc)}</span>
                    </div>
                    ${badgeHtml}
                </a>`;
                globalIdx++;
            });
            html += '</div>';
        }

        this._results.innerHTML = html;

        // Save query to recent when user clicks a result
        this._results.querySelectorAll('.search-result').forEach(a => {
            a.addEventListener('click', () => this._saveRecent(this._currentQuery), { once: true });
        });
    },

    /* ── Keyboard navigation ── */

    _handleInputKey(e) {
        const items = Array.from(this._results.querySelectorAll('.search-result'));
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
            const target = items[this._selectedIndex];
            if (target) { this._saveRecent(this._currentQuery); window.location.href = target.href; }
        }
    },

    _highlightResult(items) {
        items.forEach((el, i) => {
            el.classList.toggle('search-result--active', i === this._selectedIndex);
            if (i === this._selectedIndex) el.scrollIntoView({ block: 'nearest' });
        });
    }
};
