/**
 * Search & Profile Dropdown Fallback (non-module IIFE)
 * Advanced search: consoles → people → marketplace posts → settings/pages
 * Works on file:// protocol without ES module support
 */

(function() {
    if (window.__SEARCH_PROFILE_INITIALIZED__) return;
    window.__SEARCH_PROFILE_INITIALIZED__ = true;

    var API = (window.CN_API_BASE_URL || '/api').replace(/\/$/, '');

    // ---- Auth helper ----
    var AuthHelper = {
        SESSION_KEY: 'cn_session',
        TOKEN_KEY: 'cn_token',
        isLoggedIn: function() { return !!this.getCurrentUser(); },
        getCurrentUser: function() {
            try {
                var s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
                return s && s.id ? s : null;
            } catch(e) { return null; }
        },
        logout: function() {
            localStorage.removeItem(this.SESSION_KEY);
            localStorage.removeItem(this.TOKEN_KEY);
        }
    };

    // ---- Constants ----
    var RENDER_ORDER = ['console', 'user', 'marketplace', 'page', 'dashboard', 'settings', 'learn'];

    var CATEGORY_LABELS = {
        console:     'Consoles',
        user:        'People',
        marketplace: 'Marketplace',
        settings:    'Settings',
        page:        'Pages',
        dashboard:   'Dashboard',
        learn:       'Courses'
    };

    var FILTER_TABS = [
        { id: 'all',         label: 'All' },
        { id: 'console',     label: 'Consoles' },
        { id: 'user',        label: 'People' },
        { id: 'marketplace', label: 'Posts' },
        { id: 'settings',    label: 'Settings' }
    ];

    var FILTER_CATEGORIES = {
        all:         null,
        console:     ['console'],
        user:        ['user'],
        marketplace: ['marketplace'],
        settings:    ['settings', 'page', 'dashboard', 'learn']
    };

    var ICONS = {
        console:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="6" y2="12.01"/><line x1="10" y1="12" x2="10" y2="12.01"/><line x1="14" y1="12" x2="14" y2="12.01"/><line x1="18" y1="12" x2="18" y2="12.01"/></svg>',
        user:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        marketplace: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
        settings:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
        page:        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        dashboard:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        learn:       '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
        recent:      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
    };

    var RECENT_KEY = 'cn_search_recent';
    var RECENT_MAX  = 6;

    // ---- Path helpers ----
    function resolveImagePath(imgRelativePath) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return '../../' + imgRelativePath;
        if (p.indexOf('/pages/curs/')     !== -1 || p.indexOf('\\pages\\curs\\')     !== -1) return '../../' + imgRelativePath;
        if (p.indexOf('/pages/')          !== -1 || p.indexOf('\\pages\\')           !== -1) return '../../' + imgRelativePath;
        return '/' + String(imgRelativePath || '').replace(/^\/+/, '');
    }

    function resolveConsolePath(consoleId) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return consoleId + '.html';
        if (p.indexOf('/pages/curs/')     !== -1 || p.indexOf('\\pages\\curs\\')     !== -1) return '../consoles/' + consoleId + '.html';
        if (p.indexOf('/pages/')          !== -1 || p.indexOf('\\pages\\')           !== -1) return 'consoles/' + consoleId + '.html';
        return '/html/pages/consoles/' + consoleId + '.html';
    }

    function resolvePagePath(page) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return '../' + page;
        if (p.indexOf('/pages/curs/')     !== -1 || p.indexOf('\\pages\\curs\\')     !== -1) return '../' + page;
        if (p.indexOf('/pages/')          !== -1 || p.indexOf('\\pages\\')           !== -1) return page;
        return '/html/pages/' + page;
    }

    function resolveCommunityPath() { return resolvePagePath('community.html'); }
    function resolveUserPath(username) { return resolvePagePath('user-profile.html?username=' + encodeURIComponent(username)); }

    function escHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function normalize(str) {
        return str.toLowerCase()
            .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
            .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
            .replace(/[-_]/g, ' ');
    }

    // ---- Static index ----
    function getStaticIndex() {
        return [
            { cat: 'page', name: 'Home',       desc: 'Dashboard',                   keywords: 'home dashboard acasa panou',                                                           href: 'home.html' },
            { cat: 'page', name: 'Community',  desc: 'Forum, Marketplace, Repair',  keywords: 'community forum marketplace piata reparatii comunitate',                               href: 'community.html' },
            { cat: 'page', name: 'Learn',      desc: 'Courses & lessons',           keywords: 'learn invata cursuri lectii courses education educatie',                                href: 'invata.html' },
            { cat: 'page', name: 'Evolution',  desc: 'Console encyclopedia',        keywords: 'evolution evolutie enciclopedie encyclopedia timeline istorie history',                 href: 'evolutie.html' },
            { cat: 'page', name: 'Compare',    desc: 'Compare consoles side by side', keywords: 'compare comparatie consoles versus vs side',                                         href: 'comparatie.html' },
            { cat: 'page', name: 'Help',       desc: 'FAQ & contact',               keywords: 'help ajutor faq intrebari contact support',                                            href: 'help.html' },
            { cat: 'page', name: 'Statistics', desc: 'Platform statistics',         keywords: 'statistics statistici stats analytics',                                                href: 'statistici.html' },
            { cat: 'settings', name: 'Account settings',  desc: 'Username, bio, email',              keywords: 'account cont username email bio setari settings',                              href: 'profil.html#account' },
            { cat: 'settings', name: 'Profile settings',  desc: 'Avatar, social links, privacy',     keywords: 'profile profil avatar poza social discord twitter youtube instagram privacy',   href: 'profil.html#profil' },
            { cat: 'settings', name: 'Security',          desc: 'Password, 2FA, sessions',           keywords: 'security securitate parola password 2fa two factor authenticator sessions',    href: 'profil.html#security' },
            { cat: 'settings', name: 'Notifications',     desc: 'Email notification preferences',    keywords: 'notifications notificari email alerts mesaje messages friend request',          href: 'profil.html#notifications' },
            { cat: 'settings', name: 'Appearance',        desc: 'Theme, accent color, language',     keywords: 'appearance aparenta tema theme dark light accent color culoare language limba', href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Change password',   desc: 'Update your account password',      keywords: 'change password schimba parola update',                                        href: 'profil.html#security' },
            { cat: 'settings', name: 'Two-factor auth',   desc: 'Enable TOTP or email 2FA',          keywords: '2fa two factor authenticator totp backup codes google doi factori',             href: 'profil.html#security' },
            { cat: 'settings', name: 'Theme',             desc: 'Switch between dark and light mode', keywords: 'theme dark light auto mode tema luminos intunecat',                           href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Language',          desc: 'Change app language',               keywords: 'language limba english romana franceza germana spaniola',                      href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Accent color',      desc: 'Customize your accent color',       keywords: 'accent color culoare personalizare customize',                                 href: 'profil.html#appearance' },
            { cat: 'settings', name: 'Delete account',    desc: 'Permanently delete your account',   keywords: 'delete account sterge cont permanent',                                         href: 'profil.html#security' },
            { cat: 'settings', name: 'Trusted devices',   desc: 'Manage devices that skip 2FA',      keywords: 'trusted devices dispozitive incredere 2fa skip',                               href: 'profil.html#security' },
            { cat: 'settings', name: 'Active sessions',   desc: 'View and manage login sessions',    keywords: 'sessions sesiuni active login devices dispozitive logout',                     href: 'profil.html#security' },
            { cat: 'settings', name: 'Social links',      desc: 'Discord, Twitter, YouTube, Instagram', keywords: 'social links discord twitter youtube instagram connect',                    href: 'profil.html#profil' },
            { cat: 'settings', name: 'Privacy',           desc: 'Control profile visibility',        keywords: 'privacy confidentialitate visibility show hide email stats friends',           href: 'profil.html#profil' },
            { cat: 'dashboard', name: 'Collection',   desc: 'Your owned consoles',     keywords: 'collection colectie owned consoles detinute my',         href: 'home.html#collection' },
            { cat: 'dashboard', name: 'Favorites',    desc: 'Your favorite consoles',  keywords: 'favorites favorite consoles preferate',                   href: 'home.html#favorites' },
            { cat: 'dashboard', name: 'Progress',     desc: 'Course progress tracker', keywords: 'progress progres course curs tracker',                    href: 'home.html#progress' },
            { cat: 'dashboard', name: 'Achievements', desc: 'Badges and milestones',   keywords: 'achievements realizari badges insigne milestones',         href: 'home.html#achievements' },
            { cat: 'dashboard', name: 'Friends',      desc: 'Your friends list',       keywords: 'friends prieteni lista list requests cereri',              href: 'home.html#friends' },
            { cat: 'dashboard', name: 'My Posts',     desc: 'Your forum posts',        keywords: 'my posts postarile mele forum threads',                    href: 'home.html#posts' },
            { cat: 'dashboard', name: 'Liked Posts',  desc: 'Posts you liked',         keywords: 'liked posts apreciate favorite forum',                     href: 'home.html#liked' },
            { cat: 'learn', name: 'Console Engineering', desc: '42 lessons — electricity, electronics, hardware', keywords: 'console engineering inginerie electricitate hardware arhitectura diagnostics', href: 'invata.html' },
            { cat: 'learn', name: 'Console Modding',     desc: 'Learn to mod consoles',                          keywords: 'console modding mod custom retro repair reparare',                          href: 'invata.html' }
        ];
    }

    function resolveStaticHref(href) {
        var p = window.location.pathname;
        if (href.startsWith && (href.startsWith('/') || href.startsWith('http'))) return href;
        var parts = href.split('#');
        var file = parts[0], hash = parts[1];
        var resolved;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) resolved = '../' + file;
        else if (p.indexOf('/pages/curs/') !== -1 || p.indexOf('\\pages\\curs\\') !== -1)    resolved = '../' + file;
        else if (p.indexOf('/pages/')      !== -1 || p.indexOf('\\pages\\')       !== -1)    resolved = file;
        else resolved = '/html/pages/' + file;
        return hash ? resolved + '#' + hash : resolved;
    }

    // ---- Recent searches ----
    function getRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch(e) { return []; }
    }

    function saveRecent(query) {
        if (!query || query.length < 2) return;
        var list = getRecent().filter(function(q) { return q !== query; });
        list.unshift(query);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
    }

    // ---- Search state ----
    var searchOverlay, searchInput, searchResults, selectedIndex = -1, searchVisible = false;
    var activeFilter = 'all';
    var debounceTimer = null;
    var currentQuery = '';
    var consoles = [];
    var state = { console: [], user: [], marketplace: [], page: [], dashboard: [], settings: [], learn: [] };

    function loadConsoles() {
        if (window.CONSOLES_DATA) { consoles = window.CONSOLES_DATA; return; }
        var tryLoad = function() {
            if (window.CONSOLES_DATA) consoles = window.CONSOLES_DATA;
            else setTimeout(tryLoad, 200);
        };
        setTimeout(tryLoad, 300);
    }

    function clearState() {
        RENDER_ORDER.forEach(function(k) { state[k] = []; });
    }

    // ---- Overlay DOM ----
    function createSearchOverlay() {
        var filterHtml = FILTER_TABS.map(function(t) {
            return '<button class="search-filter-btn' + (t.id === 'all' ? ' search-filter-btn--active' : '') +
                   '" data-filter="' + t.id + '">' + t.label + '</button>';
        }).join('');

        var ov = document.createElement('div');
        ov.className = 'search-overlay';
        ov.innerHTML =
            '<div class="search-overlay__backdrop"></div>' +
            '<div class="search-overlay__container">' +
                '<div class="search-overlay__input-wrap">' +
                    '<svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                    '<input type="text" class="search-overlay__input" placeholder="Search consoles, people, posts, settings..." autocomplete="off" spellcheck="false">' +
                    '<kbd class="search-overlay__kbd">ESC</kbd>' +
                '</div>' +
                '<div class="search-overlay__filters">' + filterHtml + '</div>' +
                '<div class="search-overlay__results"></div>' +
                '<div class="search-overlay__footer">' +
                    '<span class="search-footer-hint"><kbd>↑↓</kbd> navigate</span>' +
                    '<span class="search-footer-hint"><kbd>↵</kbd> open</span>' +
                    '<span class="search-footer-hint"><kbd>ESC</kbd> close</span>' +
                '</div>' +
            '</div>';
        document.body.appendChild(ov);

        searchOverlay = ov;
        searchInput   = ov.querySelector('.search-overlay__input');
        searchResults = ov.querySelector('.search-overlay__results');

        ov.querySelector('.search-overlay__backdrop').addEventListener('click', closeSearch);
        searchInput.addEventListener('input', onInput);
        searchInput.addEventListener('keydown', handleSearchKey);

        ov.querySelectorAll('.search-filter-btn').forEach(function(btn) {
            btn.addEventListener('click', function() { setFilter(btn.getAttribute('data-filter')); });
        });
    }

    function openSearch() {
        searchVisible = true;
        searchOverlay.classList.add('search-overlay--active');
        document.body.classList.add('search-open');
        searchInput.value = '';
        currentQuery = '';
        selectedIndex = -1;
        setFilter('all', false);
        clearState();
        showRecent();
        setTimeout(function() { searchInput.focus(); }, 50);
    }

    function closeSearch() {
        searchVisible = false;
        searchOverlay.classList.remove('search-overlay--active');
        document.body.classList.remove('search-open');
    }

    // ---- Filter ----
    function setFilter(filterId, rerender) {
        activeFilter = filterId;
        searchOverlay.querySelectorAll('.search-filter-btn').forEach(function(btn) {
            btn.classList.toggle('search-filter-btn--active', btn.getAttribute('data-filter') === filterId);
        });
        if (rerender !== false && currentQuery) render();
    }

    // ---- Input ----
    function onInput() {
        selectedIndex = -1;
        var query = searchInput.value.trim();
        currentQuery = query;

        if (!query) { clearState(); showRecent(); return; }

        searchLocal(query);

        clearTimeout(debounceTimer);
        if (query.length >= 2) {
            debounceTimer = setTimeout(function() { searchAsync(query); }, 300);
        }
    }

    // ---- Local search ----
    function searchLocal(query) {
        var q = normalize(query);

        // Consoles
        var consoleMatches = [];
        for (var i = 0; i < consoles.length && consoleMatches.length < 6; i++) {
            var c = consoles[i];
            if (normalize(c.name || '').indexOf(q) !== -1 ||
                normalize(c.manufacturer || '').indexOf(q) !== -1 ||
                String(c.release || '').indexOf(q) !== -1 ||
                normalize(c.id || '').indexOf(q) !== -1) {
                consoleMatches.push({ cat: 'console', name: c.name, desc: c.manufacturer + ' · ' + c.release, href: resolveConsolePath(c.id), img: resolveImagePath(c.image || '') });
            }
        }
        state.console = consoleMatches;

        // Static index
        state.page = []; state.dashboard = []; state.settings = []; state.learn = [];
        var staticIndex = getStaticIndex();
        for (var j = 0; j < staticIndex.length; j++) {
            var item = staticIndex[j];
            var searchable = normalize(item.name + ' ' + item.desc + ' ' + (item.keywords || ''));
            if (searchable.indexOf(q) === -1) continue;
            var bucket = item.cat;
            if (state[bucket] && state[bucket].length < 5) {
                state[bucket].push({ cat: bucket, name: item.name, desc: item.desc, href: resolveStaticHref(item.href) });
            }
        }

        render();
    }

    // ---- Async search ----
    function searchAsync(query) {
        searchUsers(query);
        searchMarketplace(query);
    }

    function searchUsers(query) {
        var token = localStorage.getItem('cn_token');
        if (!token) return;
        fetch(API + '/users/search?q=' + encodeURIComponent(query), {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(function(res) {
            if (!res.ok) return null;
            return res.json();
        }).then(function(data) {
            if (!data || !data.success || !data.users || !data.users.length) return;
            if (query !== currentQuery) return;
            state.user = data.users.slice(0, 5).map(function(u) {
                return { cat: 'user', name: u.username, desc: u.bio ? u.bio.substring(0, 60) : 'User', href: resolveUserPath(u.username), img: u.avatar || '' };
            });
            render();
        }).catch(function() {});
    }

    function searchMarketplace(query) {
        fetch(API + '/marketplace/listings?search=' + encodeURIComponent(query) + '&limit=4&sort=newest')
        .then(function(res) {
            if (!res.ok) return null;
            return res.json();
        }).then(function(data) {
            if (!data || !data.success || !data.listings || !data.listings.length) return;
            if (query !== currentQuery) return;
            state.marketplace = data.listings.slice(0, 4).map(function(l) {
                return {
                    cat:   'marketplace',
                    name:  l.title,
                    desc:  (l.price != null ? l.price + ' RON' : '') + (l.condition ? ' · ' + l.condition : ''),
                    href:  resolveCommunityPath(),
                    img:   l.cover_image || '',
                    badge: l.price != null ? l.price + ' RON' : null
                };
            });
            render();
        }).catch(function() {});
    }

    // ---- Recent searches display ----
    function showRecent() {
        var recent = getRecent();
        if (!recent.length) {
            searchResults.innerHTML = '<div class="search-overlay__empty">Start typing to search...</div>';
            return;
        }
        var html = '<div class="search-recent">' +
            '<div class="search-recent__header">' +
                '<span class="search-recent__label">Recent searches</span>' +
                '<button class="search-recent__clear">Clear</button>' +
            '</div>';
        recent.forEach(function(q) {
            html += '<button class="search-recent-item" data-query="' + escHtml(q) + '">' +
                '<span class="search-result__icon">' + ICONS.recent + '</span>' +
                '<span class="search-recent-item__text">' + escHtml(q) + '</span>' +
            '</button>';
        });
        html += '</div>';
        searchResults.innerHTML = html;

        var clearBtn = searchResults.querySelector('.search-recent__clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                localStorage.removeItem(RECENT_KEY);
                showRecent();
            });
        }
        searchResults.querySelectorAll('.search-recent-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
                searchInput.value = btn.getAttribute('data-query');
                onInput();
                searchInput.focus();
            });
        });
    }

    // ---- Render ----
    function render() {
        var allowed = FILTER_CATEGORIES[activeFilter];
        var html = '';
        var globalIdx = 0;
        var hasAny = false;

        RENDER_ORDER.forEach(function(cat) {
            if (allowed && allowed.indexOf(cat) === -1) return;
            var items = state[cat];
            if (!items || !items.length) return;
            hasAny = true;

            html += '<div class="search-category" data-cat-section="' + cat + '">';
            html += '<div class="search-category__label search-category__label--' + cat + '">' + (ICONS[cat] || '') + ' ' + (CATEGORY_LABELS[cat] || cat) + '</div>';

            items.forEach(function(item) {
                var imgTag = item.img
                    ? '<img class="search-result__img" src="' + escHtml(item.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
                    : '<span class="search-result__icon search-result__icon--' + cat + '">' + (ICONS[cat] || '') + '</span>';
                var badgeHtml = item.badge
                    ? '<span class="search-result__badge">' + escHtml(item.badge) + '</span>'
                    : '';
                html += '<a href="' + escHtml(item.href) + '" class="search-result" data-index="' + globalIdx + '">' +
                    imgTag +
                    '<div class="search-result__info">' +
                        '<span class="search-result__name">' + escHtml(item.name) + '</span>' +
                        '<span class="search-result__meta">' + escHtml(item.desc) + '</span>' +
                    '</div>' +
                    badgeHtml +
                '</a>';
                globalIdx++;
            });
            html += '</div>';
        });

        if (!hasAny) {
            searchResults.innerHTML = '<div class="search-overlay__empty">No results found</div>';
            return;
        }
        searchResults.innerHTML = html;

        searchResults.querySelectorAll('.search-result').forEach(function(a) {
            a.addEventListener('click', function() { saveRecent(currentQuery); }, { once: true });
        });
    }

    // ---- Keyboard navigation ----
    function handleSearchKey(e) {
        var items = searchResults.querySelectorAll('.search-result');
        if (!items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            highlightResult(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            highlightResult(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                saveRecent(currentQuery);
                window.location.href = items[selectedIndex].href;
            }
        }
    }

    function highlightResult(items) {
        for (var i = 0; i < items.length; i++) {
            items[i].classList.toggle('search-result--active', i === selectedIndex);
            if (i === selectedIndex) items[i].scrollIntoView({ block: 'nearest' });
        }
    }

    // ---- Avatar URL helper ----
    function normalizeAvatarUrl(avatarUrl, preferredSize) {
        var raw = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
        if (!raw || raw.indexOf('data:') === 0) return raw;
        if (!/googleusercontent\.com|ggpht\.com/i.test(raw)) return raw;
        var size = preferredSize || 1024;
        var upgraded = raw
            .replace(/[?&]sz=\d+/i, function(m) { return m.charAt(0) + 'sz=' + size; })
            .replace(/=s\d{2,4}(-c)?(?=&|$)/i, '=s' + size + '-c')
            .replace(/\/s\d{2,4}(-c)?(?=\/)/i, '/s' + size + '-c');
        if (upgraded === raw && !/[?&]sz=\d+/i.test(raw)) {
            upgraded += (raw.indexOf('?') !== -1 ? '&' : '?') + 'sz=' + size;
        }
        return upgraded;
    }

    // ---- Profile Dropdown ----
    var profileDropdown, profileBtn, profileOpen = false;

    function createProfileDropdown() {
        profileBtn = document.querySelector('.navbar-profile-btn');
        if (!profileBtn) return;
        if (profileBtn.parentElement.querySelector('.profile-dropdown')) return;

        var user = AuthHelper.getCurrentUser() || {};
        var name = escHtml(user.username || 'User');
        var email = escHtml(user.email || 'No email');
        var avatarRaw = normalizeAvatarUrl(user.avatar || '');
        var avatar = avatarRaw ? escHtml(avatarRaw) : '';
        var profilePath = resolvePagePath('profil.html');
        var avatarMarkup = avatar
            ? '<img src="' + avatar + '" alt="User avatar" class="profile-dropdown__avatar-img">'
            : '<span class="profile-dropdown__avatar-fallback" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>';

        var dd = document.createElement('div');
        dd.className = 'profile-dropdown';
        dd.innerHTML =
            '<a href="' + profilePath + '" class="profile-dropdown__profile">' +
                '<span class="profile-dropdown__avatar">' + avatarMarkup + '</span>' +
                '<span class="profile-dropdown__meta">' +
                    '<span class="profile-dropdown__name">' + name + '</span>' +
                    '<span class="profile-dropdown__email">' + email + '</span>' +
                '</span>' +
            '</a>' +
            '<div class="profile-dropdown__divider profile-dropdown__divider--profile"></div>' +
            '<a href="' + resolvePagePath('community.html') + '#dm" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span data-i18n="profile_dm">Direct Messages</span></a>' +
            '<a href="' + resolvePagePath('community.html') + '" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> <span data-i18n="profile_notifications">Notifications</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#cereri" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> <span data-i18n="profile_requests">Requests</span></a>' +
            '<div class="profile-dropdown__divider"></div>' +
            '<a href="' + resolvePagePath('profil.html') + '#cursuri" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> <span data-i18n="profile_courses">My Courses</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#realizari" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> <span data-i18n="profile_achievements">Achievements</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#anunturi" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> <span data-i18n="profile_announcements">My Listings</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#favorite" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> <span data-i18n="profile_favorites">Liked Listings</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#prieteni" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> <span data-i18n="profile_friends">Friends</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#setari" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span data-i18n="profile_settings">Settings</span></a>' +
            '<a href="' + resolvePagePath('statistici.html') + '" class="profile-dropdown__item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> <span data-i18n="profile_stats">Statistics</span></a>' +
            '<div class="profile-dropdown__divider"></div>' +
            '<button class="profile-dropdown__item profile-dropdown__logout"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> <span data-i18n="profile_logout">Log out</span></button>';

        profileBtn.parentElement.appendChild(dd);
        profileDropdown = dd;

        profileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!AuthHelper.isLoggedIn()) { window.location.href = resolvePagePath('login.html'); return; }
            profileOpen = !profileOpen;
            profileDropdown.classList.toggle('profile-dropdown--active', profileOpen);
        });

        document.addEventListener('click', function(e) {
            if (profileOpen && !profileDropdown.contains(e.target) && !profileBtn.contains(e.target)) {
                profileOpen = false;
                profileDropdown.classList.remove('profile-dropdown--active');
            }
        });

        var logoutBtn = dd.querySelector('.profile-dropdown__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                AuthHelper.logout();
                window.location.reload();
            });
        }
    }

    // ---- Init ----
    function initAll() {
        loadConsoles();
        createSearchOverlay();
        createProfileDropdown();

        var searchBtn = document.querySelector('.navbar-search-btn');
        if (searchBtn) searchBtn.addEventListener('click', function(e) { e.preventDefault(); openSearch(); });

        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
            if (e.key === 'Escape') {
                if (searchVisible) closeSearch();
                if (profileOpen) { profileOpen = false; profileDropdown.classList.remove('profile-dropdown--active'); }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
