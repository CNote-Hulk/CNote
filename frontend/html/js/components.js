(function () {
    'use strict';

    // ── Path helpers ──────────────────────────────────────────────────────────

    function computeBase() {
        var path = window.location.pathname;
        if (path.includes('/pages/consoles/') || path.includes('/pages/help/') || path.includes('/pages/curs/')) {
            return '../../components/';
        }
        if (path.includes('/pages/')) {
            return '../components/';
        }
        return '/html/components/';
    }

    var base = computeBase();

    // ── Fetch + inject ────────────────────────────────────────────────────────

    function fetchHTML(url) {
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
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
