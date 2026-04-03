/**
 * Search & Profile Dropdown Fallback (non-module)
 * Works on file:// protocol without ES module support
 */

(function() {
    if (window.__SEARCH_PROFILE_INITIALIZED__) return;
    window.__SEARCH_PROFILE_INITIALIZED__ = true;

    // ---- Minimal Auth helper (reads localStorage only) ----
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

    // ---- Path helpers ----
    /** Resolve relative image path based on current page depth */
    function resolveImagePath(imgRelativePath) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return '../../' + imgRelativePath;
        if (p.indexOf('/pages/curs/') !== -1 || p.indexOf('\\pages\\curs\\') !== -1) return '../../' + imgRelativePath;
        if (p.indexOf('/pages/') !== -1 || p.indexOf('\\pages\\') !== -1) return '../../' + imgRelativePath;
        return '/' + String(imgRelativePath || '').replace(/^\/+/, '');
    }

    function resolveConsolePath(consoleId) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return consoleId + '.html';
        if (p.indexOf('/pages/curs/') !== -1 || p.indexOf('\\pages\\curs\\') !== -1) return '../consoles/' + consoleId + '.html';
        if (p.indexOf('/pages/') !== -1 || p.indexOf('\\pages\\') !== -1) return 'consoles/' + consoleId + '.html';
        return '/html/pages/consoles/' + consoleId + '.html';
    }

    function resolvePagePath(page) {
        var p = window.location.pathname;
        if (p.indexOf('/pages/consoles/') !== -1 || p.indexOf('\\pages\\consoles\\') !== -1) return '../' + page;
        if (p.indexOf('/pages/curs/') !== -1 || p.indexOf('\\pages\\curs\\') !== -1) return '../' + page;
        if (p.indexOf('/pages/') !== -1 || p.indexOf('\\pages\\') !== -1) return page;
        return '/html/pages/' + page;
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Normalize string: strip diacritics and lowercase for fuzzy matching */
    function normalize(str) {
        return str.toLowerCase()
            .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
            .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
            .replace(/[-_]/g, ' ');
    }

    // ---- Search ----
    var searchOverlay, searchInput, searchResults, selectedIndex = -1, searchVisible = false;
    var consoles = [];

    /** Load console list from JSON for search index */
    function loadConsoles() {
        if (window.CONSOLES_DATA) { consoles = window.CONSOLES_DATA; return; }
        var tryLoad = function() {
            if (window.CONSOLES_DATA) consoles = window.CONSOLES_DATA;
            else setTimeout(tryLoad, 200);
        };
        setTimeout(tryLoad, 300);
    }

    /** Build search overlay DOM: input, results list, close button */
    function createSearchOverlay() {
        var ov = document.createElement('div');
        ov.className = 'search-overlay';
        ov.innerHTML =
            '<div class="search-overlay__backdrop"></div>' +
            '<div class="search-overlay__container">' +
                '<div class="search-overlay__input-wrap">' +
                    '<svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
                    '<input type="text" class="search-overlay__input" placeholder="Search for a console..." autocomplete="off" spellcheck="false">' +
                    '<kbd class="search-overlay__kbd">ESC</kbd>' +
                '</div>' +
                '<div class="search-overlay__results"></div>' +
            '</div>';
        document.body.appendChild(ov);

        searchOverlay = ov;
        searchInput = ov.querySelector('.search-overlay__input');
        searchResults = ov.querySelector('.search-overlay__results');

        ov.querySelector('.search-overlay__backdrop').addEventListener('click', closeSearch);
        searchInput.addEventListener('input', function() {
            selectedIndex = -1;
            doSearch(searchInput.value);
        });
        searchInput.addEventListener('keydown', handleSearchKey);
    }

    function openSearch() {
        searchVisible = true;
        searchOverlay.classList.add('search-overlay--active');
        document.body.classList.add('search-open');
        searchInput.value = '';
        searchResults.innerHTML = '';
        selectedIndex = -1;
        setTimeout(function() { searchInput.focus(); }, 50);
    }

    function closeSearch() {
        searchVisible = false;
        searchOverlay.classList.remove('search-overlay--active');
        document.body.classList.remove('search-open');
    }

    /** Filter consoles by normalized query and render results */
    function doSearch(query) {
        var q = normalize(query.trim());
        if (!q) { searchResults.innerHTML = ''; return; }

        var matches = consoles.filter(function(c) {
            return normalize(c.name || '').indexOf(q) !== -1 ||
                   normalize(c.manufacturer || '').indexOf(q) !== -1 ||
                   String(c.release || '').indexOf(q) !== -1 ||
                   normalize(c.id || '').indexOf(q) !== -1;
        }).slice(0, 8);

        if (matches.length === 0) {
            searchResults.innerHTML = '<div class="search-overlay__empty">No results found</div>';
            return;
        }

        searchResults.innerHTML = matches.map(function(c, i) {
            var imgSrc = resolveImagePath(c.image || '');
            var href = resolveConsolePath(c.id);
            return '<a href="' + href + '" class="search-result" data-index="' + i + '">' +
                '<img class="search-result__img" src="' + imgSrc + '" alt="' + c.name + '" loading="lazy" onerror="this.style.display=\'none\'">' +
                '<div class="search-result__info">' +
                    '<span class="search-result__name">' + c.name + '</span>' +
                    '<span class="search-result__meta">' + c.manufacturer + ' · ' + c.release + '</span>' +
                '</div></a>';
        }).join('');
    }

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
            if (selectedIndex >= 0 && items[selectedIndex]) window.location.href = items[selectedIndex].href;
        }
    }

    function highlightResult(items) {
        for (var i = 0; i < items.length; i++) {
            if (i === selectedIndex) { items[i].classList.add('search-result--active'); items[i].scrollIntoView({ block: 'nearest' }); }
            else items[i].classList.remove('search-result--active');
        }
    }

    function normalizeAvatarUrl(avatarUrl, preferredSize) {
        var raw = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
        if (!raw || raw.indexOf('data:') === 0) return raw;
        if (!/googleusercontent\.com|ggpht\.com/i.test(raw)) return raw;

        var size = preferredSize || 1024;
        var upgraded = raw
            .replace(/[?&]sz=\d+/i, function (m) { return m.charAt(0) + 'sz=' + size; })
            .replace(/=s\d{2,4}(-c)?(?=&|$)/i, '=s' + size + '-c')
            .replace(/\/s\d{2,4}(-c)?(?=\/)/i, '/s' + size + '-c');

        if (upgraded === raw && !/[?&]sz=\d+/i.test(raw)) {
            upgraded += (raw.indexOf('?') !== -1 ? '&' : '?') + 'sz=' + size;
        }
        return upgraded;
    }

    // ---- Profile Dropdown ----
    var profileDropdown, profileBtn, profileOpen = false;

    /** Build profile dropdown DOM: avatar, links, logout button */
    function createProfileDropdown() {
        profileBtn = document.querySelector('.navbar-profile-btn');
        if (!profileBtn) return;

        // Skip if a module-based dropdown already exists
        if (profileBtn.parentElement.querySelector('.profile-dropdown')) return;

        var user = AuthHelper.getCurrentUser() || {};
        var name = escapeHtml(user.username || 'User');
        var email = escapeHtml(user.email || 'No email');
        var avatarRaw = normalizeAvatarUrl((user.avatar || user.avatar_url || ''));
        var avatar = avatarRaw ? escapeHtml(avatarRaw) : '';
        var profilePath = resolvePagePath('profil.html');
        var avatarMarkup = avatar
            ? '<img src="' + avatar + '" alt="User avatar" class="profile-dropdown__avatar-img">'
            : '<span class="profile-dropdown__avatar-fallback" aria-hidden="true">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
                    '<circle cx="12" cy="7" r="4"/>' +
                '</svg>' +
              '</span>';

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
            '<a href="' + resolvePagePath('community.html') + '#dm" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> <span data-i18n="profile_dm">Direct Messages</span></a>' +
            '<a href="' + resolvePagePath('community.html') + '" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> <span data-i18n="profile_notifications">Notifications</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#cereri" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> <span data-i18n="profile_requests">Requests</span></a>' +
            '<div class="profile-dropdown__divider"></div>' +
            '<a href="' + resolvePagePath('profil.html') + '#cursuri" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> <span data-i18n="profile_courses">My Courses</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#realizari" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> <span data-i18n="profile_achievements">Achievements</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#anunturi" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> <span data-i18n="profile_announcements">My Listings</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#favorite" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> <span data-i18n="profile_favorites">Liked Listings</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#prieteni" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> <span data-i18n="profile_friends">Friends</span></a>' +
            '<a href="' + resolvePagePath('profil.html') + '#setari" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> <span data-i18n="profile_settings">Settings</span></a>' +
            '<a href="' + resolvePagePath('statistici.html') + '" class="profile-dropdown__item">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> <span data-i18n="profile_stats">Statistics</span></a>' +
            '<div class="profile-dropdown__divider"></div>' +
            '<button class="profile-dropdown__item profile-dropdown__logout">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> <span data-i18n="profile_logout">Log out</span></button>';
        profileBtn.parentElement.appendChild(dd);
        profileDropdown = dd;

        profileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!AuthHelper.isLoggedIn()) {
                window.location.href = resolvePagePath('login.html');
                return;
            }
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
    /** Boot all components: search overlay, profile dropdown, event listeners */
    function initAll() {
        loadConsoles();
        createSearchOverlay();
        createProfileDropdown();

        // Bind search button
        var searchBtn = document.querySelector('.navbar-search-btn');
        if (searchBtn) searchBtn.addEventListener('click', function(e) { e.preventDefault(); openSearch(); });

        // Global keys
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
            if (e.key === 'Escape') {
                if (searchVisible) closeSearch();
                if (profileOpen) { profileOpen = false; profileDropdown.classList.remove('profile-dropdown--active'); }
            }
        });

        console.log('✓ Search & Profile fallback initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
