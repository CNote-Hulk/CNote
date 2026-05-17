(function () {
    'use strict';

    // ── Sentry ────────────────────────────────────────────────────────────────
    // Loaded dynamically so every page gets error tracking without touching
    // each HTML file individually.
    // DSN is injected server-side as window.SENTRY_DSN_FRONTEND per request.

    var SENTRY_CDN_SRC = 'https://browser.sentry-cdn.com/latest/bundle.min.js';
    var SENTRY_INIT_SRC = '/js/modules/sentry-init.js';

    function loadSentry() {
        // Skip if DSN is absent (e.g. local dev without env var set)
        if (!window.SENTRY_DSN_FRONTEND) return;
        // Skip if already loaded
        if (window.Sentry) {
            loadSentryInit();
            return;
        }
        var s = document.createElement('script');
        s.src = SENTRY_CDN_SRC;
        s.crossOrigin = 'anonymous';
        s.onload = function () { loadSentryInit(); };
        s.onerror = function () { console.warn('[components] Sentry CDN failed to load.'); };
        document.head.appendChild(s);
    }

    function loadSentryInit() {
        var s = document.createElement('script');
        s.src = SENTRY_INIT_SRC;
        document.head.appendChild(s);
    }

    // ── DOMPurify ─────────────────────────────────────────────────────────────
    // Loaded dynamically so every page benefits without touching 84 HTML files.
    // If the CDN load fails, injection is intentionally aborted (fail-safe).

    var DOMPURIFY_SRC = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/dist/purify.min.js';
    var DOMPURIFY_INTEGRITY = 'sha384-eEu5CTj3qGvu9PdJuS+YlkNi7d2XxQROAFYOr59zgObtlcux1ae1Il3u7jvdCSWu';

    // Allowlist covers every tag / attribute used by navbar.html and footer.html,
    // plus common structural HTML and the SVG subset used for inline icons.
    // event handlers (on*) are absent from ALLOWED_ATTR and therefore stripped.
    var PURIFY_CONFIG = {
        ALLOWED_TAGS: [
            // Structural / semantic HTML
            'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br',
            'button', 'caption', 'cite', 'code', 'col', 'colgroup', 'data',
            'dd', 'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption',
            'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
            'hr', 'i', 'img', 'kbd', 'label', 'legend', 'li', 'main', 'mark',
            'menu', 'nav', 'ol', 'p', 'picture', 'pre', 'q', 's', 'section',
            'small', 'source', 'span', 'strong', 'sub', 'summary', 'sup',
            'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr',
            'u', 'ul', 'var', 'wbr',
            // SVG (used by navbar icons)
            'svg', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'feblend',
            'fecolormatrix', 'fecomponenttransfer', 'fecomposite', 'feconvolvematrix',
            'fediffuselighting', 'fedisplacementmap', 'fedistantlight', 'feflood',
            'fefunca', 'fefuncb', 'fefuncg', 'fefuncr', 'fegaussianblur', 'feimage',
            'femerge', 'femergenode', 'femorphology', 'feoffset', 'fepointlight',
            'fespecularlighting', 'fespotlight', 'fetile', 'feturbulence', 'filter',
            'g', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata',
            'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect',
            'stop', 'switch', 'symbol', 'text', 'textpath', 'title', 'tspan',
            'use', 'view',
        ],
        ALLOWED_ATTR: [
            // Global
            'class', 'id', 'title', 'lang', 'dir', 'tabindex', 'hidden', 'style',
            // Links / media
            'href', 'src', 'srcset', 'alt', 'loading', 'decoding',
            'width', 'height', 'sizes', 'target', 'rel', 'download',
            // Buttons / inputs
            'type', 'name', 'value', 'placeholder', 'disabled', 'for',
            // SVG presentation
            'viewbox', 'xmlns', 'fill', 'stroke', 'stroke-width',
            'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
            'stroke-dashoffset', 'opacity', 'transform', 'cx', 'cy',
            'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
            'd', 'points', 'preserveaspectratio',
        ],
        ALLOW_DATA_ATTR: true,  // preserves data-i18n, data-i18n-attr, etc.
        ALLOW_ARIA_ATTR: true,  // preserves aria-label, aria-hidden, etc.
        // Belt-and-suspenders: explicitly forbid tags and inline handlers
        // (DOMPurify already strips on* by default; this makes intent explicit).
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'base', 'meta', 'link', 'noscript'],
        FORBID_ATTR: [
            'onerror', 'onload', 'onclick', 'ondblclick',
            'onmousedown', 'onmouseup', 'onmouseover', 'onmousemove',
            'onmouseout', 'onmouseenter', 'onmouseleave',
            'onkeydown', 'onkeypress', 'onkeyup',
            'onsubmit', 'onreset', 'onfocus', 'onblur', 'onchange',
            'oninput', 'onselect', 'onabort', 'onscroll', 'onresize',
            'onunload', 'onbeforeunload', 'oncopy', 'oncut', 'onpaste',
            'oncontextmenu', 'ondrag', 'ondrop',
            'onanimationstart', 'onanimationend', 'ontransitionend',
            'onpointerdown', 'onpointerup', 'onpointermove',
        ],
    };

    // ── DOMPurify loader ──────────────────────────────────────────────────────
    // Injects the DOMPurify script tag into <head> and calls `callback` once
    // loaded. If loading fails the callback is NOT called, so navbar/footer are
    // never injected from unsanitised HTML (fail-safe).

    function loadDOMPurify(callback) {
        if (window.DOMPurify) {
            callback();
            return;
        }
        var s = document.createElement('script');
        s.src = DOMPURIFY_SRC;
        s.integrity = DOMPURIFY_INTEGRITY;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = function () {
            if (window.DOMPurify) {
                callback();
            } else {
                console.error('[components] DOMPurify unavailable after load; navbar/footer injection aborted.');
            }
        };
        s.onerror = function () {
            console.error('[components] Failed to load DOMPurify from CDN; navbar/footer injection aborted for security.');
        };
        document.head.appendChild(s);
    }

    // ── Path helpers ──────────────────────────────────────────────────────────

    function computeBase() {
        var path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('/pages/help/') || path.includes('/pages/curs/')) {
            return '../../components/';
        }
        if (path.includes('/pages/legal files/') || path.includes('/pages/legal%20files/')) {
            return '../../components/';
        }
        if (path.includes('/pages/')) {
            return '../components/';
        }
        return '/html/components/';
    }

    var base = computeBase();

    // ── Same-origin guard ─────────────────────────────────────────────────────
    // Only relative paths are allowed. Rejects anything with a scheme (http://,
    // https://, //) or a dangerous protocol (data:, javascript:). This prevents
    // an attacker from pointing the fetch at a cross-origin server.

    function isSameOriginRelative(url) {
        return !(/^([a-z][a-z0-9+\-.]*:)?\/\//i.test(url)) &&
               !(/^(data:|javascript:|vbscript:)/i.test(url));
    }

    // ── Fetch + inject ────────────────────────────────────────────────────────

    function fetchHTML(url) {
        if (!isSameOriginRelative(url)) {
            console.error('[components] Blocked non-relative URL:', url);
            return Promise.resolve('');
        }
        return new Promise(function (resolve) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function () { resolve(xhr.status === 200 ? xhr.responseText : ''); };
            xhr.onerror = function () { resolve(''); };
            xhr.send();
        });
    }

    function injectHTML(placeholderId, html) {
        if (!html) return;
        var el = document.getElementById(placeholderId);
        if (!el) return;

        // Sanitize fetched HTML before touching the DOM.
        // DOMPurify is guaranteed loaded before this runs (see loadDOMPurify → init chain).
        var clean = window.DOMPurify.sanitize(html, PURIFY_CONFIG);

        var tmp = document.createElement('div');
        tmp.innerHTML = clean;
        var nodes = Array.from(tmp.childNodes);
        el.replaceWith.apply(el, nodes);
    }

    // ── Active nav link ───────────────────────────────────────────────────────

    function setActiveLink() {
        var pathname = window.location.pathname;
        var page = pathname.split('/').pop() || '';

        // Special section-based active mapping
        var sectionActive = null;
        if (pathname.includes('/consoles/')) sectionActive = 'evolutie.html';
        if (pathname.includes('/help/')) sectionActive = 'help.html';

        document.querySelectorAll('.nav-links a').forEach(function (a) {
            a.classList.remove('active');
            var href = a.getAttribute('href') || '';
            var linkPage = href.split('/').pop().split('#')[0];

            if (sectionActive) {
                if (linkPage === sectionActive) a.classList.add('active');
                return;
            }
            if (linkPage && linkPage === page) a.classList.add('active');
        });

        // Mark logo active on index
        var logo = document.querySelector('.logo');
        if (logo && (page === 'index.html' || page === '' || page === 'home.html')) {
            logo.classList.add('active');
        }
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    function handleNotifications() {
        var token = localStorage.getItem('cn_token');
        if (!token) return;

        var btn = document.getElementById('navbar-notifications-btn');
        if (btn) btn.style.display = '';

        var API = (window.CN_API_BASE_URL || '/api').replace(/\/$/, '');
        fetch(API + '/notifications', {
            headers: { 'Authorization': 'Bearer ' + token },
            credentials: 'include'
        })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            if (!data) return;
            var items = data.notifications || data || [];
            var unread = Array.isArray(items)
                ? items.filter(function (n) { return !n.read && !n.read_at; }).length
                : (data.unread || data.count || 0);
            if (unread <= 0) return;
            var badge = document.getElementById('navbar-notif-badge');
            if (badge) {
                badge.textContent = unread > 99 ? '99+' : String(unread);
                badge.style.display = '';
            }
        })
        .catch(function () {});
    }

    // ── Re-init navbar modules ────────────────────────────────────────────────

    function scheduleReinit() {
        function doReinit() {
            if (typeof window.__cn_reinit_navbar === 'function') {
                window.__cn_reinit_navbar();
            }
        }
        if (typeof window.__cn_reinit_navbar === 'function') {
            doReinit();
        } else {
            // Modules not ready yet — wait for them
            window.__cn_navbar_ready = true;
            var timer = setInterval(function () {
                if (typeof window.__cn_reinit_navbar === 'function') {
                    clearInterval(timer);
                    doReinit();
                }
            }, 20);
            // Give up after 2s
            setTimeout(function () { clearInterval(timer); }, 2000);
        }
    }

    // ── Main ──────────────────────────────────────────────────────────────────

    function init() {
        var navbarUrl = base + 'navbar.html';
        var footerUrl = base + 'footer.html';

        Promise.all([
            fetchHTML(navbarUrl),
            fetchHTML(footerUrl)
        ]).then(function (results) {
            injectHTML('navbar-placeholder', results[0]);
            injectHTML('footer-placeholder', results[1]);
            setActiveLink();
            handleNotifications();
            scheduleReinit();
        });
    }

    // Load DOMPurify first, then run init. The DOMContentLoaded check is kept
    // inside loadDOMPurify's callback so the timing contract is preserved.
    function bootstrap() {
        loadSentry();
        loadDOMPurify(function () {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        });
    }

    bootstrap();

})();
