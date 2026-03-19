/**
 * Search Module
 * Client-side console search with fuzzy matching
 */

export const SearchModule = {
    _overlay: null,
    _input: null,
    _results: null,
    _consoles: [],
    _selectedIndex: -1,
    _visible: false,

    init() {
        if (window.__SEARCH_PROFILE_INITIALIZED__) return;
        window.__SEARCH_PROFILE_INITIALIZED__ = true;
        this._loadConsoles();
        this._createOverlay();
        this._bindNavButton();
        this._bindKeys();
    },

    /** Load console data from the global or JSON */
    _loadConsoles() {
        if (window.CONSOLES_DATA) {
            this._consoles = window.CONSOLES_DATA;
            return;
        }
        // Try loading via script tag (fallback)
        const tryLoad = () => {
            if (window.CONSOLES_DATA) {
                this._consoles = window.CONSOLES_DATA;
            } else {
                setTimeout(tryLoad, 200);
            }
        };
        setTimeout(tryLoad, 300);
    },

    /** Resolve path to console images from current page depth */
    _resolveImagePath(imgRelativePath) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) {
            return '../../' + imgRelativePath;
        }
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) {
            return '../../' + imgRelativePath;
        }
        if (path.includes('/pages/') || path.includes('\\pages\\')) {
            return '../../' + imgRelativePath;
        }
        return '/' + String(imgRelativePath || '').replace(/^\/+/, '');
    },

    /** Resolve path to console detail page */
    _resolveConsolePath(consoleId) {
        const path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) {
            return consoleId + '.html';
        }
        if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) {
            return '../consoles/' + consoleId + '.html';
        }
        if (path.includes('/pages/') || path.includes('\\pages\\')) {
            return 'consoles/' + consoleId + '.html';
        }
        return '/html/pages/consoles/' + consoleId + '.html';
    },

    /** Create search overlay DOM */
    _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-overlay__backdrop"></div>
            <div class="search-overlay__container">
                <div class="search-overlay__input-wrap">
                    <svg class="search-overlay__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" class="search-overlay__input" placeholder="Search for a console..." autocomplete="off" spellcheck="false">
                    <kbd class="search-overlay__kbd">ESC</kbd>
                </div>
                <div class="search-overlay__results"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        this._overlay = overlay;
        this._input = overlay.querySelector('.search-overlay__input');
        this._results = overlay.querySelector('.search-overlay__results');

        // Backdrop click closes
        overlay.querySelector('.search-overlay__backdrop').addEventListener('click', () => this.close());

        // Live search
        this._input.addEventListener('input', () => {
            this._selectedIndex = -1;
            this._search(this._input.value);
        });

        // Keyboard nav inside input
        this._input.addEventListener('keydown', (e) => this._handleInputKey(e));
    },

    /** Bind the navbar search button */
    _bindNavButton() {
        const btn = document.querySelector('.navbar-search-btn');
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
    },

    /** Global keyboard shortcuts */
    _bindKeys() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.open();
            }
            if (e.key === 'Escape' && this._visible) {
                this.close();
            }
        });
    },

    open() {
        this._visible = true;
        this._overlay.classList.add('search-overlay--active');
        document.body.classList.add('search-open');
        this._input.value = '';
        this._results.innerHTML = '';
        this._selectedIndex = -1;
        setTimeout(() => this._input.focus(), 50);
    },

    close() {
        this._visible = false;
        this._overlay.classList.remove('search-overlay--active');
        document.body.classList.remove('search-open');
    },

    /** Normalize string for matching */
    _normalize(str) {
        return str.toLowerCase()
            .replace(/[ăâ]/g, 'a').replace(/[îí]/g, 'i')
            .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
            .replace(/[-_]/g, ' ');
    },

    /** Search consoles and display results */
    _search(query) {
        const q = this._normalize(query.trim());
        if (!q) { this._results.innerHTML = ''; return; }

        const matches = this._consoles.filter(c => {
            const name = this._normalize(c.name || '');
            const mfr = this._normalize(c.manufacturer || '');
            const year = String(c.release || '');
            const id = this._normalize(c.id || '');
            return name.includes(q) || mfr.includes(q) || year.includes(q) || id.includes(q);
        }).slice(0, 8);

        if (matches.length === 0) {
            this._results.innerHTML = '<div class="search-overlay__empty">No results found</div>';
            return;
        }

        this._results.innerHTML = matches.map((c, i) => {
            const imgSrc = this._resolveImagePath(c.image || '');
            const href = this._resolveConsolePath(c.id);
            return `<a href="${href}" class="search-result" data-index="${i}">
                <img class="search-result__img" src="${imgSrc}" alt="${c.name}" loading="lazy" onerror="this.style.display='none'">
                <div class="search-result__info">
                    <span class="search-result__name">${c.name}</span>
                    <span class="search-result__meta">${c.manufacturer} · ${c.release}</span>
                </div>
            </a>`;
        }).join('');
    },

    /** Handle arrow / enter keys */
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
