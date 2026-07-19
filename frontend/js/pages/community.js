/**
 * ConsoleHub Community Module
 * Sidebar navigation, forum, marketplace, repair wizard, direct messages.
 * Vanilla ES module — no frameworks.
 */
import { AuthModule } from '../modules/auth.js';
import { I18nModule } from '../modules/i18n.js';
import { API_BASE_URL } from '../config.js';
import { confirmModal } from '../utils/confirm-modal.js';
import { shareOrCopy } from '../utils/share.js';

/** Shorthand for I18nModule.t() */
const t = (key) => I18nModule.t(key);

// ── Constants ──────────────────────────────────────────────

const CONSOLES = [
    { id: 'general',  name: 'General',     color: '#D4A24E' },
    { id: 'ps',       name: 'PlayStation', color: '#0070D1' },
    { id: 'xbox',     name: 'Xbox',        color: '#107C10' },
    { id: 'nintendo', name: 'Nintendo',    color: '#E60012' },
    { id: 'pc',       name: 'PC Gaming',   color: '#9B59B6' },
    { id: 'other',    name: 'Other Consoles', color: '#E67E22' },
];

const TAGS = ['All', 'General', 'Help', 'Discussion', 'News', 'Bug', 'Guide', 'Modding'];

const CONDITIONS = { new: 'New', like_new: 'Like new', good: 'Good', fair: 'Fair', parts: 'Parts' };
const CATEGORIES  = { consoles: 'Consoles', games: 'Games', accessories: 'Accessories', parts: 'Parts / Repairs' };

const SYMPTOMS_BY_CONSOLE = {
    xbox: [
        'No power', 'Overheating', 'Disc read error', 'No video output',
        'Controller drift', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Eject problems', "Won't update",
        'HDMI port damaged', 'Power supply failure', 'Cosmetic restoration / upgrade'
    ],
    ps: [
        'No power', 'Overheating', 'Disc read error', 'No video output',
        'Controller drift', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Eject problems', "Won't update",
        'HDMI port damaged', 'Rest mode freeze', 'Cosmetic restoration / upgrade'
    ],
    nintendo: [
        'No power', 'Overheating', 'Joy-Con drift', 'No video output',
        'Screen issues', 'Blue screen / crash', 'Slow performance',
        'Network issues', 'Strange noises', 'Charging problems',
        "Won't update", 'Battery drain', 'Cosmetic restoration / upgrade'
    ],
    pc: [
        'No power', 'Overheating', 'Blue screen / crash', 'No video output',
        'Slow performance', 'Network issues', 'Strange noises',
        'Boot loop', 'GPU artifacts', 'RAM errors',
        'Driver issues', 'Storage failure', 'Cosmetic restoration / upgrade'
    ],
    other: [
        'No power', 'Overheating', 'No video output', 'Strange noises',
        "Won't turn on", 'Disc read error', 'Controller issues',
        'Slow performance', 'Network issues', 'Cosmetic restoration / upgrade'
    ]
};

const MODELS_BY_CONSOLE = {
    ps: [
        'PlayStation 1 (PS1)', 'PS One (Slim)',
        'PlayStation 2 (PS2)', 'PS2 Slim',
        'PlayStation 3 (PS3)', 'PS3 Slim', 'PS3 Super Slim',
        'PlayStation 4 (PS4)', 'PS4 Slim', 'PS4 Pro',
        'PlayStation 5 (PS5)', 'PS5 Digital Edition', 'PS5 Slim', 'PS5 Slim Digital',
        'PSP (1000/2000/3000)', 'PSP Go', 'PSP Street (E1000)',
        'PS Vita (OLED)', 'PS Vita Slim (LCD)', 'PS Vita TV'
    ],
    xbox: [
        'Xbox (Original)',
        'Xbox 360', 'Xbox 360 S (Slim)', 'Xbox 360 E',
        'Xbox One', 'Xbox One S', 'Xbox One S All-Digital', 'Xbox One X',
        'Xbox Series S', 'Xbox Series X'
    ],
    nintendo: [
        'NES (Nintendo Entertainment System)', 'SNES (Super Nintendo)',
        'Nintendo 64 (N64)', 'GameCube',
        'Wii', 'Wii Mini', 'Wii U',
        'Nintendo Switch', 'Nintendo Switch Lite', 'Nintendo Switch OLED', 'Nintendo Switch 2',
        'Game Boy', 'Game Boy Color', 'Game Boy Advance', 'Game Boy Advance SP',
        'Nintendo DS', 'Nintendo DS Lite', 'Nintendo DSi',
        'Nintendo 3DS', 'Nintendo 3DS XL', 'Nintendo 2DS', 'New Nintendo 3DS', 'New Nintendo 3DS XL', 'New Nintendo 2DS XL'
    ],
    pc: [
        'Custom Build (Desktop)', 'Pre-built Desktop', 'Gaming Laptop',
        'Mini PC / SFF', 'Steam Deck', 'ROG Ally', 'Legion Go'
    ],
    other: []
};

// ── State ──────────────────────────────────────────────────

const S = {
    view: 'chat',
    console: null,
    category: '',
    threadId: null,
    listingId: null,
    dmPartner: null,
    forumTag: 'All',
    marketSearch: '',
    marketSort: 'newest',
    marketCondition: '',
    marketConsole: '',
    marketCountry: '',
    marketCity: '',
    marketPage: 1,
    repairStep: 0,
    repairModel: '',
    repairSymptoms: [],
    repairDesc: '',
    repairResult: null,
    repairCustomProblem: '',
    favoriteIds: new Set(),
};

// ── DOM refs ───────────────────────────────────────────────

const sidebar = document.getElementById('hub-sidebar');
const content = document.getElementById('hub-content');

// ── Helpers ────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS */
function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Format a date as a relative time string (Romanian locale) */
function timeAgo(d) {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000)    return 'now';
    if (diff < 3600000)  return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/** Get 2-letter initials from a username */
function ini(n) { return n ? n.slice(0, 2).toUpperCase() : '?'; }

/** Show a non-blocking toast notification */
function showToast(msg, type) {
    const el = document.createElement('div');
    el.className = 'hub-toast' + (type === 'error' ? ' hub-toast--error' : type === 'success' ? ' hub-toast--success' : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('hub-toast--visible'));
    setTimeout(() => {
        el.classList.remove('hub-toast--visible');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, 3000);
}

// ── Custom Select Component ────────────────────────────────

/**
 * Wraps a native <select> with a fully custom dropdown UI.
 * The native select remains hidden in the DOM so form .value reads still work.
 * Dropdown is appended to document.body (position:fixed) to escape overflow:hidden parents.
 */
function createCustomSelect(sel) {
    if (sel._hubCsel) return; // already initialized

    const wrapper = document.createElement('div');
    wrapper.className = 'hub-csel';
    if (sel.classList.contains('hub-market-select')) wrapper.classList.add('hub-csel--inline');
    if (sel.disabled) wrapper.classList.add('hub-csel--disabled');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'hub-csel__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueSpan = document.createElement('span');
    valueSpan.className = 'hub-csel__value';

    const arrowSpan = document.createElement('span');
    arrowSpan.className = 'hub-csel__arrow';
    arrowSpan.innerHTML = `<svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    trigger.appendChild(valueSpan);
    trigger.appendChild(arrowSpan);
    wrapper.appendChild(trigger);

    // Dropdown appended to body — escapes overflow:hidden / CSS transform parents
    const dropdown = document.createElement('div');
    dropdown.className = 'hub-csel__dropdown';
    dropdown.setAttribute('role', 'listbox');
    document.body.appendChild(dropdown);

    let isOpen = false;

    function getSelectedLabel() {
        const opt = sel.options[sel.selectedIndex];
        return opt ? opt.textContent.trim() : '';
    }

    function buildOptions() {
        dropdown.innerHTML = '';
        Array.from(sel.options).forEach((opt, i) => {
            const item = document.createElement('div');
            item.className = 'hub-csel__option';
            item.setAttribute('role', 'option');
            if (opt.disabled) item.classList.add('hub-csel__option--disabled');
            if (i === sel.selectedIndex) {
                item.classList.add('hub-csel__option--selected');
                item.setAttribute('aria-selected', 'true');
            }
            item.textContent = opt.textContent.trim();
            item.dataset.index = i;
            item.addEventListener('mousedown', e => {
                e.preventDefault(); // prevent trigger blur before selection
                if (opt.disabled) return;
                sel.selectedIndex = i;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                valueSpan.textContent = getSelectedLabel();
                close();
            });
            dropdown.appendChild(item);
        });
        valueSpan.textContent = getSelectedLabel();
    }

    function positionDropdown() {
        const rect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropH = Math.min(dropdown.scrollHeight || 240, 280);
        const goUp = spaceBelow < dropH + 8 && rect.top > dropH + 8;

        dropdown.style.width = rect.width + 'px';
        dropdown.style.left  = rect.left + 'px';

        if (goUp) {
            dropdown.classList.add('hub-csel__dropdown--up');
            dropdown.style.top    = 'auto';
            dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
        } else {
            dropdown.classList.remove('hub-csel__dropdown--up');
            dropdown.style.bottom = 'auto';
            dropdown.style.top    = (rect.bottom + 4) + 'px';
        }
    }

    function open() {
        if (wrapper.classList.contains('hub-csel--disabled')) return;
        // Close all other open selects first
        document.querySelectorAll('.hub-csel--open').forEach(w => {
            if (w !== wrapper && w._hubCselClose) w._hubCselClose();
        });
        buildOptions();
        isOpen = true;
        wrapper.classList.add('hub-csel--open');
        trigger.setAttribute('aria-expanded', 'true');
        positionDropdown();
        dropdown.classList.add('hub-csel__dropdown--visible');
    }

    function close() {
        isOpen = false;
        wrapper.classList.remove('hub-csel--open');
        trigger.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('hub-csel__dropdown--visible');
    }

    trigger.addEventListener('click', e => {
        e.stopPropagation();
        isOpen ? close() : open();
    });

    // Close when clicking outside
    function outsideClick(e) {
        if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) close();
    }
    document.addEventListener('click', outsideClick);

    // Keyboard navigation
    trigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isOpen ? close() : open();
        } else if (e.key === 'Escape') {
            close();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) open();
            const items = [...dropdown.querySelectorAll('.hub-csel__option:not(.hub-csel__option--disabled)')];
            const cur = dropdown.querySelector('.hub-csel__option--selected');
            const idx = items.indexOf(cur);
            let next;
            if (e.key === 'ArrowDown') next = idx < items.length - 1 ? items[idx + 1] : items[0];
            else next = idx > 0 ? items[idx - 1] : items[items.length - 1];
            if (next) {
                cur?.classList.remove('hub-csel__option--selected');
                next.classList.add('hub-csel__option--selected');
                next.scrollIntoView({ block: 'nearest' });
                // Trigger selection immediately on arrow key
                const i = +next.dataset.index;
                sel.selectedIndex = i;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                valueSpan.textContent = getSelectedLabel();
            }
        }
    });

    // Watch for dynamic option rebuilds (e.g. city list updated after country change)
    const mutObs = new MutationObserver(() => {
        buildOptions();
        if (isOpen) positionDropdown();
    });
    mutObs.observe(sel, { childList: true });

    // Watch for disabled attribute changes (e.g. city disabled until country selected)
    const disabledObs = new MutationObserver(() => {
        const d = sel.disabled;
        wrapper.classList.toggle('hub-csel--disabled', d);
        if (d) close();
    });
    disabledObs.observe(sel, { attributes: true, attributeFilter: ['disabled'] });

    // Sync label when native select value changes programmatically
    sel.addEventListener('change', () => { valueSpan.textContent = getSelectedLabel(); });

    // Insert wrapper before select; move select inside (hidden)
    sel.parentNode.insertBefore(wrapper, sel);
    wrapper.appendChild(sel);
    sel.style.cssText += ';display:none!important';

    buildOptions();

    // Cleanup — restores native select and removes body dropdown
    function destroy() {
        close();
        document.removeEventListener('click', outsideClick);
        mutObs.disconnect();
        disabledObs.disconnect();
        dropdown.remove();
        if (wrapper.parentNode) {
            wrapper.parentNode.insertBefore(sel, wrapper);
            sel.style.cssText = sel.style.cssText.replace(/;?display:none!important/g, '');
            wrapper.remove();
        }
        sel._hubCsel = null;
    }

    sel._hubCsel = { destroy, dropdown };
    wrapper._hubCselClose = close;
}

/** Initialize custom selects for all hub-form-select / hub-market-select in a container */
function initHubSelects(container) {
    container.querySelectorAll('.hub-form-select, .hub-market-select').forEach(sel => {
        createCustomSelect(sel);
    });
}

/** Destroy all custom selects in a container (call before innerHTML wipe or element removal) */
function cleanupHubSelects(container) {
    container.querySelectorAll('.hub-form-select, .hub-market-select').forEach(sel => {
        if (sel._hubCsel) sel._hubCsel.destroy();
    });
}

/** Render avatar: show image if available, fallback to initials with onerror */
function avatarHtml(name, avatarUrl, size, extraStyle) {
    const sz = size || 36;
    const s = extraStyle || '';
    if (avatarUrl) {
        return `<img src="${esc(avatarUrl)}" alt="" style="width:${sz}px;height:${sz}px;border-radius:50%;object-fit:cover;${s}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span style="display:none;width:${sz}px;height:${sz}px;border-radius:50%;align-items:center;justify-content:center;font-size:${sz * 0.022}rem;font-weight:700;text-transform:uppercase;${s}">${ini(name)}</span>`;
    }
    return ini(name);
}

/** Authenticated API call helper — attaches JWT and returns parsed JSON */
async function api(method, path, body) {
    const token = localStorage.getItem('cn_token');
    const opts = { method, credentials: 'include', headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(API_BASE_URL + path, opts);
    return res.json();
}

function user() { return AuthModule.getCurrentUser(); }

// ── View switching ─────────────────────────────────────────

/** Switch the active hub view panel with re-trigger animation */
function showView(id) {
    // Close any open custom dropdowns before switching views
    document.querySelectorAll('.hub-csel--open').forEach(w => {
        if (w._hubCselClose) w._hubCselClose();
    });
    content.querySelectorAll('.hub-view').forEach(v => v.classList.remove('hub-view--active'));
    const el = document.getElementById('view-' + id);
    if (el) el.classList.add('hub-view--active');
    S.view = id;
}

// ── Sidebar ────────────────────────────────────────────────

/** Build sidebar: console filter links + category navigation */
function initSidebar() {
    if (!sidebar) return;

    sidebar.addEventListener('click', e => {
        const item = e.target.closest('.hub-sidebar__item');
        if (!item || item.classList.contains('hub-sidebar__item--locked')) return;

        sidebar.querySelectorAll('.hub-sidebar__item').forEach(b => b.classList.remove('hub-sidebar__item--active'));
        item.classList.add('hub-sidebar__item--active');

        // Close mobile sidebar after navigation
        closeMobileSidebar();

        navigate(item.dataset.view, item.dataset.console || null, item.dataset.category ?? '');
    });

    // Mobile sidebar controls are initialized globally at boot.

    // Legacy toggle (for non-mobile fallback)
    const toggle = document.getElementById('hub-sidebar-toggle');
    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('hub-sidebar--open'));
}

function initMobileSidebarControls() {
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    const closeBtn = document.getElementById('hub-sidebar-close');

    applyMobileMenuLayering();

    if (hamburger && !hamburger.dataset.hubMenuBound) {
        hamburger.addEventListener('click', toggleMobileSidebar);
        hamburger.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleMobileSidebar();
        }, { passive: false });
        hamburger.dataset.hubMenuBound = '1';
    }

    if (overlay && !overlay.dataset.hubMenuBound) {
        overlay.addEventListener('click', closeMobileSidebar);
        overlay.dataset.hubMenuBound = '1';
    }

    if (closeBtn && !closeBtn.dataset.hubMenuBound) {
        closeBtn.addEventListener('click', closeMobileSidebar);
        closeBtn.dataset.hubMenuBound = '1';
    }
}

function applyMobileMenuLayering() {
    if (!sidebar) return;
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');

    sidebar.style.zIndex = '5001';
    sidebar.style.opacity = '1';
    sidebar.style.backdropFilter = 'none';
    sidebar.style.webkitBackdropFilter = 'none';

    if (overlay) {
        overlay.style.zIndex = '5000';
        overlay.style.background = 'rgba(0, 0, 0, 0.65)';
    }

    if (hamburger) {
        hamburger.style.zIndex = '5002';
    }
}

function syncOverlayOutsideSidebar() {
    if (!sidebar) return;
    const overlay = document.getElementById('hub-mobile-overlay');
    if (!overlay) return;

    const isOpen = sidebar.classList.contains('hub-sidebar--open');
    if (!isOpen) {
        overlay.style.left = '0';
        overlay.style.right = '0';
        return;
    }

    // Restore calculated value minus 1px (clickas request)
    const sidebarWidth = Math.max(0, Math.ceil(sidebar.getBoundingClientRect().width || 0) - 2);
    overlay.style.left = sidebarWidth + 'px';
    overlay.style.right = '0';
}

function toggleMobileSidebar() {
    if (!sidebar) return;
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    const landing = document.getElementById('community-landing');
    const isOpen = sidebar.classList.contains('hub-sidebar--open');
    if (isOpen) closeMobileSidebar();
    else {
        applyMobileMenuLayering();
        sidebar.classList.add('hub-sidebar--open');
        if (hamburger) hamburger.classList.add('active');
        if (overlay) overlay.classList.add('active');
        if (landing) {
            landing.style.pointerEvents = 'none';
            landing.style.zIndex = '1';
        }
        syncOverlayOutsideSidebar();
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    if (!sidebar) return;
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    const landing = document.getElementById('community-landing');
    sidebar.classList.remove('hub-sidebar--open');
    if (hamburger) hamburger.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (landing) {
        landing.style.pointerEvents = '';
        landing.style.zIndex = '50';
    }
    syncOverlayOutsideSidebar();
    document.body.style.overflow = '';
}

/** Navigate to a view, optionally filtering by console and category */
function navigate(view, con, cat) {
    const hashParts = [view];
    if (con) hashParts.push(con);
    if (cat) hashParts.push(cat);
    const newHash = '#' + hashParts.join('/');
    if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
    }
    
    switch (view) {
        case 'chat':
            showView('chat');
            break;
        case 'forum':
            S.console = con;
            S.forumTag = 'All';
            showView('forum');
            renderForum();
            loadThreads();
            break;
        case 'repair':
            S.console = con;
            Object.assign(S, { repairStep: 0, repairModel: '', repairSymptoms: [], repairDesc: '', repairResult: null, repairCustomProblem: '' });
            showView('repair');
            renderRepair();
            break;
        case 'repair-requests':
            showView('repair-requests');
            renderRepairRequests();
            break;
        case 'repair-admin':
            showView('repair-admin');
            renderRepairAdmin();
            break;
        case 'marketplace':
            S.category = cat || '';
            Object.assign(S, { marketSearch: '', marketSort: 'newest', marketCondition: '', marketConsole: '', marketPage: 1 });
            showView('marketplace');
            renderMarketplace();
            loadListings();
            break;
        case 'dm':
            showView('dm');
            renderDM();
            loadConversations();
            break;
        case 'photos':
            showView('photos');
            renderPhotos();
            loadPhotos();
            break;
    }
}

/* ================================================================
   FORUM
   ================================================================ */

/** Render the forum view: thread list, search bar, tag filters */
function renderForum() {
    const v = document.getElementById('view-forum');
    const cName = CONSOLES.find(c => c.id === S.console)?.name || S.console;
    const u = user();

    v.innerHTML = `
        <div class="hub-view-header">
            <div class="hub-view-header__title">💬 ${esc(cName)} — Community</div>
            ${u ? '<button class="hub-btn hub-btn--primary" id="forum-new-btn">+ New topic</button>' : ''}
        </div>
        <div class="hub-forum-filters" id="forum-filters">
            ${TAGS.map(t => `<button class="hub-filter-btn${S.forumTag === t ? ' hub-filter-btn--active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
        <div class="hub-thread-list" id="forum-threads"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>Loading…</div></div>`;

    v.querySelector('#forum-filters').addEventListener('click', e => {
        const b = e.target.closest('.hub-filter-btn');
        if (!b) return;
        S.forumTag = b.dataset.tag;
        v.querySelectorAll('.hub-filter-btn').forEach(x => x.classList.remove('hub-filter-btn--active'));
        b.classList.add('hub-filter-btn--active');
        loadThreads();
    });

    v.querySelector('#forum-new-btn')?.addEventListener('click', openNewThreadModal);
}

/** Fetch and display forum threads for current console + tag filter */
async function loadThreads() {
    const list = document.getElementById('forum-threads');
    try {
        const data = await api('GET', `/forum/${S.console}/threads`);
        if (!data.success) throw 0;
        let threads = data.threads || [];
        if (S.forumTag !== 'All') threads = threads.filter(t => t.tag === S.forumTag);

        if (!threads.length) {
            list.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">💬</div>No topics yet. Be the first!</div>';
            return;
        }
        list.innerHTML = threads.map(t => `
            <div class="hub-thread-item-wrap">
                <button class="hub-thread-item" data-id="${t.id}">
                    <div class="hub-thread-avatar">${avatarHtml(t.username, t.avatar, 36)}</div>
                    <div class="hub-thread-body">
                        <div class="hub-thread-title">
                            ${esc(t.title)}
                            <span class="hub-tag hub-tag--${(t.tag || 'general').toLowerCase()}">${esc(t.tag || 'General')}</span>
                            ${t.solved_reply_id ? `<span class="hub-solved-badge">${I18nModule.t('forum_solved_badge')}</span>` : ''}
                        </div>
                        <div class="hub-thread-meta">
                            <span>${esc(t.username)}</span>
                            <span>${timeAgo(t.created_at)}</span>
                            <span>↑ ${t.upvotes || 0}</span>
                            <span>💬 ${t.reply_count || 0}</span>
                        </div>
                    </div>
                </button>
                ${(user() && user().id !== t.user_id) ? `<button class="report-trigger-btn" data-report-type="forum_thread" data-report-id="${t.id}" data-report-preview="${esc(t.title)}" title="${I18nModule.t('report_btn_trigger')}">⚑ ${I18nModule.t('report_btn_trigger')}</button>` : ''}
            </div>`).join('');

        list.addEventListener('click', e => {
            const reportBtn = e.target.closest('.report-trigger-btn');
            if (reportBtn) {
                e.stopPropagation();
                if (typeof window.openReportModal === 'function') {
                    window.openReportModal({
                        contentType: reportBtn.dataset.reportType,
                        contentId:   reportBtn.dataset.reportId,
                        contentPreview: reportBtn.dataset.reportPreview,
                    });
                }
                return;
            }
            const item = e.target.closest('.hub-thread-item');
            if (item) openThread(+item.dataset.id);
        });
    } catch { list.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Failed to load.</div>'; }
}

/** Open a single thread with its replies and reply form */
async function openThread(id) {
    S.threadId = id;
    showView('thread');
    const v = document.getElementById('view-thread');
    v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">⏳</div>Loading…</div>';

    let replyTo = null; // { id, username, snippet } — cleared on every (re)render

    try {
        const data = await api('GET', `/forum/${S.console}/threads/${id}`);
        if (!data.success) throw 0;
        const t = data.thread, replies = t.replies || [], u = user();
        const isOwner = u && u.id === t.user_id;

        v.innerHTML = `
            <div class="hub-view-header">
                <button class="hub-view-header__back" id="thread-back">← Back</button>
                <div class="hub-view-header__title">${esc(t.title)}${t.solved_reply_id ? ` <span class="hub-solved-badge">${I18nModule.t('forum_solved_badge')}</span>` : ''}</div>
            </div>
            <div class="hub-thread-detail" id="thread-detail">
                <div class="hub-thread-original">
                    <div class="hub-reply-header">
                        <div class="hub-reply-avatar">${avatarHtml(t.username, t.avatar, 24)}</div>
                        <span class="hub-reply-user">${esc(t.username)}</span>
                        <span class="hub-reply-time">${timeAgo(t.created_at)}</span>
                        <span class="hub-tag hub-tag--${(t.tag || 'general').toLowerCase()}">${esc(t.tag || 'General')}</span>
                    </div>
                    <div class="hub-thread-original__text" style="margin-top:8px">${esc(t.body)}</div>
                    <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                        <button class="hub-btn hub-btn--secondary hub-btn--sm" data-upvote="thread" data-id="${t.id}">↑ ${t.upvotes || 0}</button>
                        ${(u && u.id !== t.user_id) ? `<button class="report-trigger-btn" data-report-type="forum_thread" data-report-id="${t.id}" data-report-preview="${esc(t.title)}">⚑ ${I18nModule.t('report_btn_trigger')}</button>` : ''}
                    </div>
                </div>
                <div class="hub-replies-heading">Replies (${replies.length})</div>
                ${replies.map(r => `
                    <div class="hub-reply-card${t.solved_reply_id === r.id ? ' hub-reply-card--solved' : ''}" data-reply-id="${r.id}">
                        <div class="hub-reply-header">
                            <div class="hub-reply-avatar">${avatarHtml(r.username, r.avatar, 24)}</div>
                            <span class="hub-reply-user">${esc(r.username)}</span>
                            <span class="hub-reply-time">${timeAgo(r.created_at)}</span>
                            ${t.solved_reply_id === r.id ? `<span class="hub-solved-badge">${I18nModule.t('forum_solved_badge')}</span>` : ''}
                        </div>
                        ${r.reply_to_id ? `<div class="hub-reply-quote">${I18nModule.t('forum_replying_to')} <b>${esc(r.reply_to_username || '')}</b>: “${esc(r.reply_to_snippet || '')}”</div>` : ''}
                        <div class="hub-reply-text">${esc(r.body)}</div>
                        <div style="padding-left:32px;margin-top:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                            <button class="hub-btn hub-btn--secondary hub-btn--sm" data-upvote="reply" data-id="${r.id}">↑ ${r.upvotes || 0}</button>
                            ${u ? `<button class="hub-btn hub-btn--secondary hub-btn--sm" data-reply-to="${r.id}" data-reply-to-user="${esc(r.username)}">${I18nModule.t('forum_reply_to_action')}</button>` : ''}
                            ${isOwner ? `<button class="hub-btn hub-btn--secondary hub-btn--sm" data-solve="${r.id}">${t.solved_reply_id === r.id ? I18nModule.t('forum_unmark_solved') : I18nModule.t('forum_mark_solved')}</button>` : ''}
                            ${(u && u.id !== r.user_id) ? `<button class="report-trigger-btn" data-report-type="forum_reply" data-report-id="${r.id}" data-report-preview="${esc((r.body || '').substring(0, 60))}">⚑ ${I18nModule.t('report_btn_trigger')}</button>` : ''}
                        </div>
                    </div>`).join('')}
            </div>
            ${u ? `<div class="hub-reply-context" id="thread-reply-context" hidden></div>
            <form class="hub-reply-form" id="thread-reply-form">
                <input type="text" placeholder="Write a reply…" maxlength="2000" required>
                <button class="hub-btn hub-btn--primary" type="submit">Send</button>
            </form>` : ''}`;

        v.querySelector('#thread-back').addEventListener('click', () => {
            showView('forum'); renderForum(); loadThreads();
        });

        const replyInput = v.querySelector('#thread-reply-form input');
        const replyContext = v.querySelector('#thread-reply-context');

        function setReplyTo(replyId, username, snippet) {
            replyTo = replyId ? { id: replyId, username, snippet } : null;
            if (!replyContext) return;
            if (replyTo) {
                replyContext.hidden = false;
                replyContext.innerHTML = `${I18nModule.t('forum_replying_to')} <b>${esc(username)}</b>: “${esc((snippet || '').slice(0, 80))}” <button type="button" id="thread-reply-cancel">${I18nModule.t('forum_cancel_reply')}</button>`;
                replyContext.querySelector('#thread-reply-cancel').addEventListener('click', () => setReplyTo(null));
                replyInput?.focus();
            } else {
                replyContext.hidden = true;
                replyContext.innerHTML = '';
            }
        }

        v.querySelector('#thread-detail').addEventListener('click', async e => {
            const reportBtn = e.target.closest('.report-trigger-btn');
            if (reportBtn) {
                if (typeof window.openReportModal === 'function') {
                    window.openReportModal({
                        contentType: reportBtn.dataset.reportType,
                        contentId:   reportBtn.dataset.reportId,
                        contentPreview: reportBtn.dataset.reportPreview,
                    });
                }
                return;
            }

            const replyToBtn = e.target.closest('[data-reply-to]');
            if (replyToBtn) {
                const card = replyToBtn.closest('.hub-reply-card');
                const snippet = card?.querySelector('.hub-reply-text')?.textContent || '';
                setReplyTo(+replyToBtn.dataset.replyTo, replyToBtn.dataset.replyToUser, snippet);
                return;
            }

            const solveBtn = e.target.closest('[data-solve]');
            if (solveBtn) {
                const replyId = +solveBtn.dataset.solve;
                const alreadySolved = t.solved_reply_id === replyId;
                const res = await api('POST', `/forum/${S.console}/threads/${id}/solve`, {
                    reply_id: alreadySolved ? null : replyId,
                });
                if (res.success) openThread(id);
                return;
            }

            const btn = e.target.closest('[data-upvote]');
            if (!btn || !u) return;
            const type = btn.dataset.upvote;
            const tid  = +btn.dataset.id;
            const path = type === 'thread'
                ? `/forum/${S.console}/threads/${tid}/upvote`
                : `/forum/${S.console}/replies/${tid}/upvote`;
            const res = await api('POST', path);
            if (res.success) btn.textContent = '↑ ' + res.upvotes;
        });

        v.querySelector('#thread-reply-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            const input = e.target.querySelector('input');
            const body = input.value.trim();
            if (!body) return;
            const res = await api('POST', `/forum/${S.console}/threads/${id}/reply`, {
                body,
                reply_to_id: replyTo ? replyTo.id : undefined,
            });
            if (res.success) {
                window.dispatchEvent(new CustomEvent('cn:message-sent'));
                openThread(id);
            }
        });
    } catch { v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Failed to load.</div>'; }
}

/** Open modal dialog to create a new forum thread */
function openNewThreadModal() {
    const _prev = document.querySelector('.hub-modal-overlay');
    if (_prev) { cleanupHubSelects(_prev); _prev.remove(); }

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">New Topic</span>
                <button class="hub-modal__close">&times;</button>
            </div>
            <form class="hub-modal__body" id="new-thread-form">
                <div class="hub-form-group">
                    <label class="hub-form-label">Title</label>
                    <input class="hub-form-input" name="title" maxlength="200" required placeholder="Topic title…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Tag</label>
                    <select class="hub-form-select" name="tag">
                        ${TAGS.filter(t => t !== 'All').map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Message</label>
                    <textarea class="hub-form-textarea" name="body" maxlength="5000" required rows="5" placeholder="Write here…"></textarea>
                </div>
                <div class="hub-modal__footer" style="padding:0;border:none">
                    <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Cancel</button>
                    <button type="submit" class="hub-btn hub-btn--primary">Publish</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    initHubSelects(overlay);
    const close = () => { cleanupHubSelects(overlay); overlay.remove(); };
    overlay.querySelector('.hub-modal__close').addEventListener('click', close);
    overlay.querySelector('.hub-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#new-thread-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, btn = f.querySelector('[type="submit"]');
        btn.disabled = true;
        const res = await api('POST', `/forum/${S.console}/threads`, {
            title: f.title.value.trim(), body: f.body.value.trim(), tag: f.tag.value,
        });
        if (res.success) {
            close();
            window.dispatchEvent(new CustomEvent('cn:message-sent'));
            loadThreads();
        }
        else { btn.disabled = false; showToast(res.error || 'Error.', 'error'); }
    });
}

/* ================================================================
   MARKETPLACE
   ================================================================ */

/** Render the marketplace view: listing grid, filters, add button */
function renderMarketplace() {
    const v = document.getElementById('view-marketplace');
    cleanupHubSelects(v); // destroy existing custom selects before wiping innerHTML
    const u = user();

    // Count active filters (excluding sort and search)
    const activeFilters = [S.marketCondition, S.marketConsole, S.marketCountry, S.marketCity].filter(Boolean).length;

    v.innerHTML = `
        <div class="hub-view-header">
            <div class="hub-view-header__title">🛒 Marketplace</div>
            <div style="display:flex;gap:8px">
                ${u ? '<button class="hub-btn hub-btn--primary hub-market-add-btn" id="market-add-btn"><span class="hub-market-add-btn__text">+ New listing</span><span class="hub-market-add-btn__icon">+</span></button>' : ''}
                ${u ? '<button class="hub-btn hub-btn--secondary" id="market-dm-btn">💬 Messages</button>' : ''}
            </div>
        </div>

        <div class="hub-market-topbar">
            <input class="hub-market-search" id="market-search" placeholder="Search listings…" value="${esc(S.marketSearch)}">
            <button class="hub-btn hub-btn--secondary hub-filter-toggle-btn" id="market-filter-btn">
                ⚙️ Filters
                ${activeFilters > 0 ? `<span class="hub-filter-badge">${activeFilters}</span>` : ''}
            </button>
            <select class="hub-market-select" id="market-sort" style="min-width:130px">
                <option value="newest" ${S.marketSort==='newest'?'selected':''}>Newest</option>
                <option value="oldest" ${S.marketSort==='oldest'?'selected':''}>Oldest</option>
                <option value="price_asc" ${S.marketSort==='price_asc'?'selected':''}>Price ↑</option>
                <option value="price_desc" ${S.marketSort==='price_desc'?'selected':''}>Price ↓</option>
            </select>
        </div>

        <!-- Filter Drawer Overlay -->
        <div class="hub-filter-overlay" id="filter-overlay" hidden></div>

        <!-- Filter Drawer -->
        <div class="hub-filter-drawer" id="filter-drawer">
            <div class="hub-filter-drawer__header">
                <span class="hub-filter-drawer__title">⚙️ Filters</span>
                <button class="hub-filter-drawer__close" id="filter-close">&times;</button>
            </div>
            <div class="hub-filter-drawer__body">

                <div class="hub-filter-section">
                    <div class="hub-filter-section__label">Condition</div>
                    <select class="hub-form-select" id="market-condition">
                        <option value="">All</option>
                        ${Object.entries(CONDITIONS).map(([k, val]) => `<option value="${k}" ${S.marketCondition===k?'selected':''}>${val}</option>`).join('')}
                    </select>
                </div>

                <div class="hub-filter-section">
                    <div class="hub-filter-section__label">Console</div>
                    <select class="hub-form-select" id="market-console">
                        <option value="">All</option>
                        ${(window.CONSOLES_DATA || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${S.marketConsole===c.id?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                </div>

                <div class="hub-filter-section">
                    <div class="hub-filter-section__label">Country</div>
                    <select class="hub-form-select" id="market-country">
                        <option value="">All countries</option>
                        ${window.LOCATION_DATA.countries.map(c => `<option value="${c.code}" ${S.marketCountry===c.code?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                </div>

                <div class="hub-filter-section">
                    <div class="hub-filter-section__label">City</div>
                    <select class="hub-form-select" id="market-city" ${!S.marketCountry ? 'disabled' : ''}>
                        <option value="">All cities</option>
                        ${S.marketCountry
                            ? (window.LOCATION_DATA.countries.find(c => c.code === S.marketCountry)?.cities || [])
                            .map(city => `<option value="${city}" ${S.marketCity===city?'selected':''}>${city}</option>`).join('')
                            : ''}
                    </select>
                    ${!S.marketCountry ? '<div class="hub-filter-hint">Select a country first</div>' : ''}
                </div>

            </div>
            <div class="hub-filter-drawer__footer">
                <button class="hub-btn hub-btn--secondary" id="filter-reset">Reset</button>
                <button class="hub-btn hub-btn--primary" id="filter-apply">Apply filters</button>
            </div>
        </div>

        <div class="hub-market-grid" id="market-grid">
            <div class="hub-empty"><div class="hub-empty__icon">⏳</div>Loading…</div>
        </div>
        <div class="hub-market-pagination" id="market-pagination"></div>`;

    // ── Search ──
    let timer;
    v.querySelector('#market-search').addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => { S.marketSearch = e.target.value.trim(); S.marketPage = 1; loadListings(); }, 300);
    });

    // ── Sort ──
    v.querySelector('#market-sort').addEventListener('change', e => { S.marketSort = e.target.value; S.marketPage = 1; loadListings(); });

    // ── Filter drawer open/close ──
    const drawer = v.querySelector('#filter-drawer');
    const overlay = v.querySelector('#filter-overlay');

    const openDrawer = () => { drawer.classList.add('hub-filter-drawer--open'); overlay.hidden = false; };
    const closeDrawer = () => { drawer.classList.remove('hub-filter-drawer--open'); overlay.hidden = true; };

    v.querySelector('#market-filter-btn').addEventListener('click', openDrawer);
    v.querySelector('#filter-close').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    // ── Country → populate cities ──
    v.querySelector('#market-country').addEventListener('change', e => {
    const code = e.target.value;
    const citySelect = v.querySelector('#market-city');
    const hint = v.querySelector('.hub-filter-hint');
    const country = window.LOCATION_DATA.countries.find(c => c.code === code);
    citySelect.innerHTML = '<option value="">All cities</option>' +
        (country?.cities || []).map(city => `<option value="${city}">${city}</option>`).join('');
    citySelect.disabled = !code;
    if (hint) hint.style.display = code ? 'none' : 'block';
    });

    // ── Apply filters ──
    v.querySelector('#filter-apply').addEventListener('click', () => {
        S.marketCondition = v.querySelector('#market-condition').value;
        S.marketConsole   = v.querySelector('#market-console').value;
        S.marketCountry   = v.querySelector('#market-country').value;
        S.marketCity      = v.querySelector('#market-city').value;
        S.marketPage = 1;
        closeDrawer();
        renderMarketplace(); // re-render to update badge count
        loadListings();
    });

    // ── Reset filters ──
    v.querySelector('#filter-reset').addEventListener('click', () => {
        S.marketCondition = ''; S.marketConsole = ''; S.marketCountry = ''; S.marketCity = '';
        S.marketPage = 1;
        closeDrawer();
        renderMarketplace();
        loadListings();
    });

    v.querySelector('#market-add-btn')?.addEventListener('click', openAddListingModal);
    v.querySelector('#market-dm-btn')?.addEventListener('click', () => navigate('dm'));

    // ── Grid click handler — delegated once per render to avoid accumulation on loadListings re-calls ──
    const grid = v.querySelector('#market-grid');
    grid.addEventListener('click', async e => {
        const u = user();
        const favBtn = e.target.closest('.hub-listing-fav-btn');
        if (favBtn) {
            e.stopPropagation();
            if (!u) { showToast('Log in to save favorites'); return; }
            const lid = +favBtn.dataset.favId;
            favBtn.classList.add('hub-listing-fav-btn--pop');
            const res = await api('POST', `/marketplace/listings/${lid}/favorite`);
            if (res.success) {
                if (res.favorited) { S.favoriteIds.add(lid); favBtn.innerHTML = '❤️'; favBtn.classList.add('hub-listing-fav-btn--active'); }
                else { S.favoriteIds.delete(lid); favBtn.innerHTML = '🤍'; favBtn.classList.remove('hub-listing-fav-btn--active'); }
            } else {
                showToast(res.error || 'Could not update favorites.', 'error');
            }
            setTimeout(() => favBtn.classList.remove('hub-listing-fav-btn--pop'), 300);
            return;
        }
        const c = e.target.closest('.hub-listing-card');
        if (c) openListingDetail(+c.dataset.id);
    });

    // ── Pagination click handler — delegated once per render ──
    const pag = v.querySelector('#market-pagination');
    pag.addEventListener('click', e => {
        const b = e.target.closest('.hub-page-btn');
        if (b) { S.marketPage = +b.dataset.page; loadListings(); }
    });

    // ── Custom dropdowns ──
    initHubSelects(v);
}

/** Fetch and display marketplace listings with condition/category filters */
async function loadListings() {
    const grid = document.getElementById('market-grid');
    const pag  = document.getElementById('market-pagination');

    const u = user();
    const p = new URLSearchParams();
    if (S.category)        p.set('category',  S.category);
    if (S.marketCondition) p.set('condition',  S.marketCondition);
    if (S.marketConsole)   p.set('console_type', S.marketConsole);
    if (S.marketSearch)    p.set('search',     S.marketSearch);
    if (S.marketCountry)   p.set('country',    S.marketCountry);
    if (S.marketCity)      p.set('city',       S.marketCity);
    p.set('sort', S.marketSort);
    p.set('page', S.marketPage);

    // Fetch listings and favorite IDs in parallel
    try {
        const [data, favData] = await Promise.all([
            api('GET', '/marketplace/listings?' + p),
            u ? api('GET', '/marketplace/favorites/ids') : Promise.resolve(null),
        ]);
        if (favData && favData.success) S.favoriteIds = new Set(favData.ids);
        if (!data.success) throw 0;
        const listings = data.listings || [];

        if (!listings.length) {
            grid.innerHTML = `<div class="hub-empty" style="grid-column:1/-1"><div class="hub-empty__icon">🛒</div>No listings${S.marketSearch ? ' for “' + esc(S.marketSearch) + '"' : ''}.</div>`;
            pag.innerHTML = '';
            return;
        }

        grid.innerHTML = listings.map(l => {
            const imgs = Array.isArray(l.images) ? l.images : [];
            const isFav = S.favoriteIds.has(l.id);
            return `
                <button class="hub-listing-card" data-id="${l.id}">
                    <div class="hub-listing-img">
                        ${imgs[0] ? `<img src="${esc(imgs[0])}" alt="" loading="lazy">` : '<img src="/assets/images/graphics/no-image-placeholder.jpg" alt="" loading="lazy" class="hub-listing-img__placeholder-img">'}
                        ${l.sold ? '<div class="hub-listing-sold-overlay"><span class="hub-listing-sold-badge">SOLD</span></div>' : ''}
                        <span class="hub-listing-fav-btn${isFav ? ' hub-listing-fav-btn--active' : ''}" data-fav-id="${l.id}" title="${u ? (isFav ? 'Remove from favorites' : 'Add to favorites') : 'Log in for favorites'}">
                            ${isFav ? '❤️' : '🤍'}
                        </span>
                    </div>
                    <div class="hub-listing-info">
                        <div class="hub-listing-info__title">${esc(l.title)}</div>
                        <div class="hub-listing-info__price">${Number(l.price).toFixed(0)} RON</div>
                        ${l.description ? `<div class="hub-listing-info__desc">${esc(l.description.slice(0, 100))}${l.description.length > 100 ? '…' : ''}</div>` : ''}
                        <div class="hub-listing-info__meta">
                            <span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span>
                            <span class="hub-listing-info__seller">${esc(l.seller_name)}${l.location ? ' · ' + esc(l.location) : ''}</span>
                            ${l.seller_is_official ? `<span class="hub-official-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${I18nModule.t('marketplace_official_badge')}</span>` : ''}
                        </div>
                    </div>
                </button>`;
        }).join('');

        const total = data.totalPages || 1;
        pag.innerHTML = total > 1
            ? Array.from({ length: total }, (_, i) => i + 1).map(pg =>
                `<button class="hub-page-btn${pg === S.marketPage ? ' hub-page-btn--active' : ''}" data-page="${pg}">${pg}</button>`).join('')
            : '';
    } catch { grid.innerHTML = '<div class="hub-empty" style="grid-column:1/-1"><div class="hub-empty__icon">❌</div>Failed to load.</div>'; }
}

/** Open listing detail view with contact/DM options */
function renderStars(rating) {
    const full = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) => i < full ? '★' : '☆').join('');
}

/** Loads + renders the seller's review summary/list/form inside a listing's detail view */
async function loadSellerReviews(sellerId, viewEl) {
    const card = viewEl.querySelector('#seller-reviews-card');
    const summaryEl = viewEl.querySelector('#seller-rating-summary');
    if (!card) return;

    try {
        const data = await api('GET', `/marketplace/sellers/${sellerId}/reviews`);
        if (!data.success) throw 0;

        if (summaryEl) summaryEl.textContent = data.count ? `⭐ ${data.average} (${data.count})` : 'Seller';

        const u = user();
        const canReview = u && u.id !== sellerId;

        const reviewsHtml = data.reviews.length
            ? data.reviews.map(r => `
                <div class="hub-seller-review">
                    <div class="hub-seller-review__head">
                        <strong>${esc(r.reviewer_username)}</strong>
                        <span>${renderStars(r.rating)}</span>
                    </div>
                    ${r.comment ? `<p class="hub-seller-review__comment">${esc(r.comment)}</p>` : ''}
                </div>`).join('')
            : `<p class="hub-seller-reviews__empty">${I18nModule.t('reviews_empty')}</p>`;

        card.innerHTML = `
            <h3 class="hub-seller-reviews__title">${I18nModule.t('reviews_title')}${data.count ? ` · ⭐ ${data.average} (${data.count})` : ''}</h3>
            ${canReview ? `
                <div class="hub-seller-review-form">
                    <div class="rating-interactive" id="seller-review-stars">
                        ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="star-btn${data.userRating && i <= data.userRating.rating ? ' active' : ''}" data-value="${i}">★</button>`).join('')}
                    </div>
                    <textarea id="seller-review-comment" placeholder="${I18nModule.t('reviews_comment_placeholder')}" maxlength="1000">${data.userRating ? esc(data.userRating.comment) : ''}</textarea>
                    <button class="hub-btn hub-btn--primary" id="seller-review-submit">${I18nModule.t('reviews_submit')}</button>
                </div>` : ''}
            <div class="hub-seller-reviews__list">${reviewsHtml}</div>
        `;

        if (canReview) {
            let selectedRating = data.userRating ? data.userRating.rating : 0;
            const stars = card.querySelectorAll('#seller-review-stars .star-btn');
            stars.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    const val = parseInt(btn.dataset.value);
                    stars.forEach(b => b.classList.toggle('hover', parseInt(b.dataset.value) <= val));
                });
                btn.addEventListener('mouseleave', () => stars.forEach(b => b.classList.remove('hover')));
                btn.addEventListener('click', () => {
                    selectedRating = parseInt(btn.dataset.value);
                    stars.forEach(b => b.classList.toggle('active', parseInt(b.dataset.value) <= selectedRating));
                });
            });
            card.querySelector('#seller-review-submit').addEventListener('click', async () => {
                if (!selectedRating) { showToast(I18nModule.t('reviews_select_rating'), 'error'); return; }
                const comment = card.querySelector('#seller-review-comment').value.trim();
                const res = await api('POST', `/marketplace/sellers/${sellerId}/review`, { rating: selectedRating, comment, listingId: S.listingId });
                if (res.success) {
                    showToast(I18nModule.t('reviews_thanks'));
                    loadSellerReviews(sellerId, viewEl);
                } else {
                    showToast(res.error || 'Error', 'error');
                }
            });
        }
    } catch {
        card.innerHTML = '';
    }
}

async function openListingDetail(id) {
    S.listingId = id;
    showView('listing');
    const v = document.getElementById('view-listing');
    v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">⏳</div>Loading…</div>';

    try {
        const data = await api('GET', `/marketplace/listings/${id}`);
        if (!data.success) throw 0;
        const l = data.listing, u = user(), own = u && u.id === l.seller_id;
        const imgs = Array.isArray(l.images) ? l.images : [];
        const isFavDetail = S.favoriteIds.has(l.id);
        console.log('[Marketplace] Listing detail:', l);

        // Increment view count (non-owners only, fire-and-forget)
        if (!own) api('PATCH', `/marketplace/listings/${id}/view`).catch(() => {});

        v.innerHTML = `
            <div class="hub-view-header">
                <button class="hub-view-header__back" id="listing-back">← Marketplace</button>
            </div>
            <div class="hub-detail-scroll">
                <div class="hub-detail-inner">
                    ${imgs.length ? `
                        <div class="hub-detail-gallery" id="listing-gallery">
                            <div class="hub-detail-main-img" id="listing-main-img">
                                <img src="${esc(imgs[0])}" alt="">
                                ${imgs.length > 1 ? `
                                    <button class="hub-gallery-arrow hub-gallery-arrow--left" id="gallery-prev" aria-label="Previous image">‹</button>
                                    <button class="hub-gallery-arrow hub-gallery-arrow--right" id="gallery-next" aria-label="Next image">›</button>
                                    <span class="hub-gallery-counter" id="gallery-counter">1 / ${imgs.length}</span>` : ''}
                            </div>
                            ${imgs.length > 1 ? `<div class="hub-detail-thumbs">${imgs.map((im, i) =>
                                `<button class="hub-detail-thumb${i === 0 ? ' hub-detail-thumb--active' : ''}" data-idx="${i}"><img src="${esc(im)}" alt=""></button>`).join('')}</div>` : ''}
                        </div>` : `
                        <div class="hub-detail-gallery">
                            <div class="hub-detail-main-img hub-detail-main-img--placeholder">
                                <span class="hub-placeholder-icon">🖼️</span>
                                <span class="hub-placeholder-text">No photos</span>
                            </div>
                        </div>`}
                    <div class="hub-detail-card hub-detail-card--main">
                        <div class="hub-detail-body">
                            <div class="hub-detail-top">
                                <div style="flex:1;min-width:0">
                                    <h2 class="hub-detail-title">${esc(l.title)}</h2>
                                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px">
                                        <span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span>
                                        ${CATEGORIES[l.category] ? `<span style="color:var(--text-gray);font-size:.78rem">${CATEGORIES[l.category]}</span>` : ''}
                                    </div>
                                </div>
                                <div class="hub-detail-price">${Number(l.price).toFixed(0)} RON</div>
                            </div>
                            <div style="display:flex;justify-content:flex-end;margin-top:8px">
                                <button class="hub-detail-fav-btn${isFavDetail ? ' hub-detail-fav-btn--active' : ''}" id="detail-fav-btn" title="${u ? (isFavDetail ? 'Remove from favorites' : 'Add to favorites') : 'Log in for favorites'}">
                                    ${isFavDetail ? '❤️' : '🤍'}
                                </button>
                            </div>
                            <div class="hub-detail-desc" style="margin-top:16px">${esc(l.description)}</div>
                            ${l.location ? `<div class="hub-detail-location" style="margin-top:10px">📍 ${esc(l.location)}</div>` : ''}
                            <div class="hub-detail-date" style="margin-top:6px">Publicat ${timeAgo(l.created_at)}</div>
                        </div>
                    </div>
                    <div class="hub-detail-card hub-detail-card--seller">
                        <div class="hub-detail-seller-info">
                            <div class="hub-detail-seller-avatar">${l.seller_avatar ? `<img src="${esc(l.seller_avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ini(l.seller_name)}</div>
                            <div class="hub-detail-seller-meta">
                                <div class="hub-detail-seller-name">${esc(l.seller_name)}${l.seller_is_official ? `<span class="hub-official-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${I18nModule.t('marketplace_official_badge')}</span>` : ''}</div>
                                <div class="hub-detail-seller-sub" id="seller-rating-summary">Seller</div>
                            </div>
                        </div>
                        <div class="hub-detail-seller-actions">
                            ${u && !own ? '<button class="hub-btn hub-btn--primary" id="listing-dm-btn">💬 Contact</button>' : ''}
                            ${u ? '<button class="hub-btn hub-btn--secondary" id="listing-share-btn">🔗 Share</button>' : ''}
                            ${u && !own ? `<button class="report-trigger-btn" id="listing-report-btn" data-report-type="listing" data-report-id="${l.id}" data-report-preview="${esc(l.title)}">⚑ ${I18nModule.t('report_btn_trigger_listing')}</button>` : ''}
                        </div>
                    </div>
                    <div class="hub-detail-card hub-detail-card--reviews" id="seller-reviews-card">
                        <div class="hub-seller-reviews__loading">⏳</div>
                    </div>
                    <div class="hub-detail-actions">
                        ${l.phone   ? `<a href="tel:${esc(l.phone)}" class="hub-btn hub-btn--secondary">📞 ${esc(l.phone)}</a>` : ''}
                        ${l.olx_url ? `<a href="${esc(l.olx_url)}" target="_blank" rel="noopener noreferrer" class="hub-btn hub-btn--secondary">🔗 OLX</a>` : ''}
                        ${l.ebay_url ? `<a href="${esc(l.ebay_url)}" target="_blank" rel="noopener noreferrer" class="hub-btn hub-btn--secondary">🔗 eBay</a>` : ''}
                        ${own && !l.sold ? '<button class="hub-btn hub-btn--primary" id="listing-sold-btn">✓ Mark as sold</button>' : ''}
                        ${own ? '<button class="hub-btn hub-btn--secondary" id="listing-edit-btn">✏️ Edit</button>' : ''}
                        ${own ? '<button class="hub-btn hub-btn--danger" id="listing-del-btn">Delete</button>' : ''}
                    </div>
                    <div class="hub-similar-section" id="similar-section">
                        <h3 class="hub-similar-section__title">📋 Similar listings</h3>
                        <div class="hub-similar-grid" id="similar-grid">
                            ${Array.from({length:4}, () => '<div class="hub-listing-card hub-listing-card--skeleton"><div class="hub-listing-img"></div><div class="hub-listing-info"><div class="hub-skeleton-line" style="width:60%"></div><div class="hub-skeleton-line" style="width:80%"></div><div class="hub-skeleton-line" style="width:40%"></div></div></div>').join('')}
                        </div>
                    </div>
                </div>
            </div>`;

        v.querySelector('#listing-back').addEventListener('click', () => { showView('marketplace'); renderMarketplace(); loadListings(); });

        // Gallery navigation state
        let currentImgIdx = 0;
        const updateGalleryImg = (idx) => {
            if (!imgs.length) return;
            currentImgIdx = ((idx % imgs.length) + imgs.length) % imgs.length;
            v.querySelector('#listing-main-img img').src = imgs[currentImgIdx];
            v.querySelectorAll('.hub-detail-thumb').forEach((t, i) => {
                t.classList.toggle('hub-detail-thumb--active', i === currentImgIdx);
            });
            const counter = v.querySelector('#gallery-counter');
            if (counter) counter.textContent = `${currentImgIdx + 1} / ${imgs.length}`;
        };

        v.querySelector('#gallery-prev')?.addEventListener('click', (e) => { e.stopPropagation(); updateGalleryImg(currentImgIdx - 1); });
        v.querySelector('#gallery-next')?.addEventListener('click', (e) => { e.stopPropagation(); updateGalleryImg(currentImgIdx + 1); });

        v.querySelectorAll('.hub-detail-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => updateGalleryImg(+thumb.dataset.idx));
        });

        // ── Fullscreen lightbox (OLX-style) ──
        if (imgs.length) {
            const mainImg = v.querySelector('#listing-main-img');
            mainImg.style.cursor = 'zoom-in';
            mainImg.addEventListener('click', (e) => {
                if (e.target.closest('.hub-gallery-arrow') || e.target.closest('.hub-gallery-counter')) return;
                openLightbox(imgs, currentImgIdx);
            });
        }

        function openLightbox(images, startIdx) {
            let lbIdx = startIdx;
            const lb = document.createElement('div');
            lb.className = 'hub-lightbox';
            lb.innerHTML = `
                <div class="hub-lightbox__backdrop"></div>
                <button class="hub-lightbox__close" aria-label="Close">✕</button>
                <span class="hub-lightbox__counter">${lbIdx + 1} / ${images.length}</span>
                <img class="hub-lightbox__img" src="${images[lbIdx]}" alt="">
                ${images.length > 1 ? `
                    <button class="hub-lightbox__arrow hub-lightbox__arrow--left" aria-label="Previous">‹</button>
                    <button class="hub-lightbox__arrow hub-lightbox__arrow--right" aria-label="Next">›</button>` : ''}`;
            document.body.appendChild(lb);
            document.body.classList.add('modal-open');
            requestAnimationFrame(() => lb.classList.add('hub-lightbox--visible'));

            const lbImg = lb.querySelector('.hub-lightbox__img');
            const lbCounter = lb.querySelector('.hub-lightbox__counter');

            const goTo = (idx) => {
                lbIdx = ((idx % images.length) + images.length) % images.length;
                lbImg.src = images[lbIdx];
                lbCounter.textContent = `${lbIdx + 1} / ${images.length}`;
                updateGalleryImg(lbIdx);
            };

            const close = () => {
                lb.classList.remove('hub-lightbox--visible');
                setTimeout(() => { lb.remove(); document.body.classList.remove('modal-open'); }, 250);
            };

            lb.querySelector('.hub-lightbox__close').addEventListener('click', close);
            lb.querySelector('.hub-lightbox__backdrop').addEventListener('click', close);
            lb.querySelector('.hub-lightbox__arrow--left')?.addEventListener('click', () => goTo(lbIdx - 1));
            lb.querySelector('.hub-lightbox__arrow--right')?.addEventListener('click', () => goTo(lbIdx + 1));

            const onKey = (e) => {
                if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
                else if (e.key === 'ArrowLeft') goTo(lbIdx - 1);
                else if (e.key === 'ArrowRight') goTo(lbIdx + 1);
            };
            document.addEventListener('keydown', onKey);
            lb.addEventListener('transitionend', () => { if (!lb.classList.contains('hub-lightbox--visible')) document.removeEventListener('keydown', onKey); });

            // Swipe support
            let touchStartX = 0;
            lb.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
            lb.addEventListener('touchend', (e) => {
                const dx = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(dx) > 50) { dx > 0 ? goTo(lbIdx - 1) : goTo(lbIdx + 1); }
            });
        }

        v.querySelector('#listing-report-btn')?.addEventListener('click', () => {
            if (typeof window.openReportModal === 'function') {
                window.openReportModal({
                    contentType: 'listing',
                    contentId:   String(l.id),
                    contentPreview: l.title,
                });
            }
        });

        v.querySelector('#listing-dm-btn')?.addEventListener('click', () => {
            S.dmPartner = l.seller_id;
            navigate('dm');
            setTimeout(() => openConversation(l.seller_id, l.seller_name), 250);
        });

        v.querySelector('#listing-share-btn')?.addEventListener('click', async () => {
            const shareUrl = `${location.origin}/html/pages/community.html#listing-${id}`;
            const result = await shareOrCopy({ title: l.title, text: l.title, url: shareUrl });
            if (result === 'copied') showToast(I18nModule.t('share_link_copied'));
        });

        loadSellerReviews(l.seller_id, v);

        v.querySelector('#listing-sold-btn')?.addEventListener('click', async () => {
            if ((await api('PATCH', `/marketplace/listings/${id}/sold`)).success) openListingDetail(id);
        });

        v.querySelector('#listing-del-btn')?.addEventListener('click', async () => {
            if (!(await confirmModal('Are you sure you want to delete this listing?'))) return;
            if ((await api('DELETE', `/marketplace/listings/${id}`)).success) { showView('marketplace'); renderMarketplace(); loadListings(); }
        });

        v.querySelector('#listing-edit-btn')?.addEventListener('click', () => {
            openEditListingFromDetail(id, l);
        });

        // Favorite toggle on detail page
        v.querySelector('#detail-fav-btn')?.addEventListener('click', async () => {
            if (!u) { showToast('Log in to save favorites'); return; }
            const btn = v.querySelector('#detail-fav-btn');
            btn.classList.add('hub-detail-fav-btn--pop');
            const res = await api('POST', `/marketplace/listings/${id}/favorite`);
            if (res.success) {
                if (res.favorited) { S.favoriteIds.add(id); btn.innerHTML = '❤️'; btn.classList.add('hub-detail-fav-btn--active'); }
                else { S.favoriteIds.delete(id); btn.innerHTML = '🤍'; btn.classList.remove('hub-detail-fav-btn--active'); }
            } else {
                showToast(res.error || 'Could not update favorites.', 'error');
            }
            setTimeout(() => btn.classList.remove('hub-detail-fav-btn--pop'), 300);
        });

        // Load similar listings
        loadSimilarListings(id, v);

    } catch { v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Failed to load.</div>'; }
}

/** Fetch and render similar listings below the detail view */
async function loadSimilarListings(listingId, container) {
    const section = container.querySelector('#similar-section');
    const grid = container.querySelector('#similar-grid');
    try {
        const data = await api('GET', `/marketplace/listings/${listingId}/similar`);
        if (!data.success || !data.listings || data.listings.length === 0) {
            section.hidden = true;
            return;
        }
        const u = user();
        grid.innerHTML = data.listings.map(l => {
            const simImgs = Array.isArray(l.images) ? l.images : [];
            const isFav = S.favoriteIds.has(l.id);
            return `
                <button class="hub-listing-card" data-id="${l.id}">
                    <div class="hub-listing-img">
                        ${simImgs[0] ? `<img src="${esc(simImgs[0])}" alt="" loading="lazy">` : '<img src="/assets/images/graphics/no-image-placeholder.jpg" alt="" loading="lazy" class="hub-listing-img__placeholder-img">'}
                        <span class="hub-listing-fav-btn${isFav ? ' hub-listing-fav-btn--active' : ''}" data-fav-id="${l.id}" title="${u ? (isFav ? 'Remove from favorites' : 'Add to favorites') : 'Log in for favorites'}">
                            ${isFav ? '❤️' : '🤍'}
                        </span>
                    </div>
                    <div class="hub-listing-info">
                        <div class="hub-listing-info__title">${esc(l.title)}</div>
                        <div class="hub-listing-info__price">${Number(l.price).toFixed(0)} RON</div>
                        <div class="hub-listing-info__meta">
                            <span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span>
                            <span class="hub-listing-info__seller">${esc(l.seller_name)}${l.location ? ' · ' + esc(l.location) : ''}</span>
                            ${l.seller_is_official ? `<span class="hub-official-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${I18nModule.t('marketplace_official_badge')}</span>` : ''}
                        </div>
                    </div>
                </button>`;
        }).join('');

        // Click handlers for similar listing cards
        grid.addEventListener('click', async e => {
            const favBtn = e.target.closest('.hub-listing-fav-btn');
            if (favBtn) {
                e.stopPropagation();
                if (!u) { showToast('Log in to save favorites'); return; }
                const lid = +favBtn.dataset.favId;
                favBtn.classList.add('hub-listing-fav-btn--pop');
                const res = await api('POST', `/marketplace/listings/${lid}/favorite`);
                if (res.success) {
                    if (res.favorited) { S.favoriteIds.add(lid); favBtn.innerHTML = '❤️'; favBtn.classList.add('hub-listing-fav-btn--active'); }
                    else { S.favoriteIds.delete(lid); favBtn.innerHTML = '🤍'; favBtn.classList.remove('hub-listing-fav-btn--active'); }
                } else {
                    showToast(res.error || 'Could not update favorites.', 'error');
                }
                setTimeout(() => favBtn.classList.remove('hub-listing-fav-btn--pop'), 300);
                return;
            }
            const c = e.target.closest('.hub-listing-card');
            if (c) openListingDetail(+c.dataset.id);
        });
    } catch {
        section.hidden = true;
    }
}

/** Open modal dialog to create a new marketplace listing */
function openAddListingModal() {
    const _prev = document.querySelector('.hub-modal-overlay');
    if (_prev) { cleanupHubSelects(_prev); _prev.remove(); }

    const MAX_IMAGES = 8;
    let selectedFiles = [];

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">New listing</span>
                <button class="hub-modal__close">&times;</button>
            </div>
            <form class="hub-modal__body" id="new-listing-form">
                <div class="hub-form-group">
                    <label class="hub-form-label">Title</label>
                    <input class="hub-form-input" name="title" maxlength="200" required placeholder="Ce vinzi?">
                </div>
                <div class="hub-form-row">
                    <div class="hub-form-group">
                        <label class="hub-form-label">Price (RON)</label>
                        <input class="hub-form-input" name="price" type="number" min="0" step="1" required placeholder="0">
                    </div>
                    <div class="hub-form-group">
                        <label class="hub-form-label">Condition</label>
                        <select class="hub-form-select" name="condition">
                            ${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}"${k === 'good' ? ' selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Category</label>
                    <select class="hub-form-select" name="category">
                        ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Console</label>
                    <select class="hub-form-select" name="console_type">
                        <option value="">— Alege consola —</option>
                        ${(window.CONSOLES_DATA || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Description</label>
                    <textarea class="hub-form-textarea" name="description" maxlength="3000" required rows="4" placeholder="Describe the product…"></textarea>
                </div>
                <div class="hub-form-row">
                    <div class="hub-form-group">
                        <label class="hub-form-label">Country</label>
                        <select class="hub-form-select" name="country" required>
                            <option value="">— Select a country —</option>
                            ${window.LOCATION_DATA.countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="hub-form-group">
                        <label class="hub-form-label">City</label>
                        <select class="hub-form-select" name="location" required disabled>
                            <option value="">— Select a country first —</option>
                        </select>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Telefon</label>
                    <input class="hub-form-input" name="phone" maxlength="20" required placeholder="+40…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">OLX Link (optional)</label>
                    <input class="hub-form-input" name="olx_url" type="url" placeholder="https://www.olx.ro/…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">eBay Link (optional)</label>
                    <input class="hub-form-input" name="ebay_url" type="url" placeholder="https://www.ebay.com/…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Images (max ${MAX_IMAGES} photos)</label>
                    <div class="hub-upload-zone" id="upload-zone">
                        <input type="file" id="upload-input" accept="image/jpeg,image/png,image/webp" multiple hidden>
                        <span class="hub-upload-zone__icon">📁</span>
                        <span class="hub-upload-zone__text">Drag photos here or click to choose</span>
                    </div>
                    <div class="hub-upload-counter" id="upload-counter">0 / ${MAX_IMAGES} imagini selectate</div>
                    <div class="hub-upload-grid" id="upload-grid"></div>
                </div>
                <div class="hub-modal__footer" style="padding:0;border:none">
                    <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Cancel</button>
                    <button type="submit" class="hub-btn hub-btn--primary">Publish</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    initHubSelects(overlay);
    const close = () => { cleanupHubSelects(overlay); overlay.remove(); };
    overlay.querySelector('.hub-modal__close').addEventListener('click', close);
    overlay.querySelector('.hub-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('[name="country"]').addEventListener('change', e => {
        const citySelect = overlay.querySelector('[name="location"]');
        const country = window.LOCATION_DATA.countries.find(c => c.code === e.target.value);
        citySelect.innerHTML = '<option value="">— Select a city —</option>' +
            (country?.cities || []).map(c => `<option value="${c}">${c}</option>`).join('');
        citySelect.disabled = !e.target.value;
    });

    const uploadZone = overlay.querySelector('#upload-zone');
    const uploadInput = overlay.querySelector('#upload-input');
    const uploadGrid = overlay.querySelector('#upload-grid');
    const uploadCounter = overlay.querySelector('#upload-counter');

    function updatePreviews() {
        uploadGrid.innerHTML = '';
        selectedFiles.forEach((file, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'hub-upload-thumb';
            thumb.innerHTML = `<img src="${URL.createObjectURL(file)}" alt=""><button type="button" class="hub-upload-thumb__remove" data-idx="${i}">&times;</button>`;
            uploadGrid.appendChild(thumb);
        });
        uploadCounter.textContent = `${selectedFiles.length} / ${MAX_IMAGES} imagini selectate`;
    }

    function addFiles(files) {
        for (const file of files) {
            if (selectedFiles.length >= MAX_IMAGES) break;
            if (!file.type.match(/^image\/(jpeg|png|webp)$/)) continue;
            if (file.size > 10 * 1024 * 1024) continue;
            selectedFiles.push(file);
        }
        updatePreviews();
    }

    uploadZone.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => { addFiles(uploadInput.files); uploadInput.value = ''; });

    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('hub-upload-zone--drag'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('hub-upload-zone--drag'));
    uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('hub-upload-zone--drag'); addFiles(e.dataTransfer.files); });

    uploadGrid.addEventListener('click', e => {
        const btn = e.target.closest('.hub-upload-thumb__remove');
        if (!btn) return;
        const idx = parseInt(btn.dataset.idx, 10);
        selectedFiles.splice(idx, 1);
        updatePreviews();
    });

    /** Resize an image file to max 800px and return a base64 data URL */
    function resizeImage(file) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > MAX || h > MAX) {
                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                    else { w = Math.round(w * MAX / h); h = MAX; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
                URL.revokeObjectURL(img.src);
            };
            img.src = URL.createObjectURL(file);
        });
    }

    overlay.querySelector('#new-listing-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, btn = f.querySelector('[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Publishing…';

        const imageUrls = await Promise.all(selectedFiles.map(resizeImage));

        // Default image: if no images uploaded but a console is selected, use console image
        let finalImages = imageUrls;
        if (finalImages.length === 0 && f.console_type.value) {
            const consoleDef = (window.CONSOLES_DATA || []).find(c => c.id === f.console_type.value);
            if (consoleDef && consoleDef.image) finalImages = [consoleDef.image];
        }

        const res = await api('POST', '/marketplace/listings', {
            title: f.title.value.trim(),
            description: f.description.value.trim(),
            price: parseFloat(f.price.value),
            condition: f.condition.value,
            category: f.category.value,
            console_type: f.console_type.value,
            location: f.location.value.trim(),
            phone: f.phone.value.trim(),
            olx_url: f.olx_url.value.trim(),
            ebay_url: f.ebay_url.value.trim(),
            images: finalImages,
        });
        if (res.success) { close(); loadListings(); }
        else { btn.disabled = false; btn.textContent = 'Publish'; showToast(res.error || 'Error.', 'error'); }
    });
}


/** Open modal dialog to edit an existing listing (from detail view) */
function openEditListingFromDetail(id, l) {
    const _prev = document.querySelector('.hub-modal-overlay');
    if (_prev) { cleanupHubSelects(_prev); _prev.remove(); }

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">Edit listing</span>
                <button class="hub-modal__close">&times;</button>
            </div>
            <form class="hub-modal__body" id="edit-listing-form">
                <div class="hub-form-group">
                    <label class="hub-form-label">Title</label>
                    <input class="hub-form-input" name="title" maxlength="200" required value="${esc(l.title)}">
                </div>
                <div class="hub-form-row">
                    <div class="hub-form-group">
                        <label class="hub-form-label">Price (RON)</label>
                        <input class="hub-form-input" name="price" type="number" min="0" step="1" required value="${l.price}">
                    </div>
                    <div class="hub-form-group">
                        <label class="hub-form-label">Condition</label>
                        <select class="hub-form-select" name="condition">
                            ${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}"${k === l.condition ? ' selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Category</label>
                    <select class="hub-form-select" name="category">
                        ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}"${k === l.category ? ' selected' : ''}>${v}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Console</label>
                    <select class="hub-form-select" name="console_type">
                        <option value="">— Alege consola —</option>
                        ${(window.CONSOLES_DATA || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}"${c.id === (l.console_type || '') ? ' selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Description</label>
                    <textarea class="hub-form-textarea" name="description" maxlength="3000" required rows="4">${esc(l.description)}</textarea>
                </div>
                <div class="hub-form-row">
                    <div class="hub-form-group">
                        <label class="hub-form-label">Country</label>
                        <select class="hub-form-select" name="country" required>
                            <option value="">— Select a country —</option>
                            ${(window.LOCATION_DATA?.countries || []).map(c => `<option value="${c.code}"${c.code === (l.country || '') ? ' selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="hub-form-group">
                        <label class="hub-form-label">City</label>
                        <select class="hub-form-select" name="location" required ${!l.country ? 'disabled' : ''}>
                            <option value="">— Select a country first —</option>
                            ${l.country
                                ? ((window.LOCATION_DATA?.countries || []).find(c => c.code === l.country)?.cities || [])
                                    .map(city => `<option value="${city}"${city === l.location ? ' selected' : ''}>${city}</option>`).join('')
                                : ''}
                        </select>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Telefon</label>
                    <input class="hub-form-input" name="phone" maxlength="20" required value="${esc(l.phone || '')}">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">OLX Link (optional)</label>
                    <input class="hub-form-input" name="olx_url" type="url" value="${esc(l.olx_url || '')}">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">eBay Link (optional)</label>
                    <input class="hub-form-input" name="ebay_url" type="url" value="${esc(l.ebay_url || '')}">
                </div>
                <div class="hub-modal__footer" style="padding:0;border:none">
                    <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Cancel</button>
                    <button type="submit" class="hub-btn hub-btn--primary">Save</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    initHubSelects(overlay);
    const close = () => { cleanupHubSelects(overlay); overlay.remove(); };
    overlay.querySelector('.hub-modal__close').addEventListener('click', close);
    overlay.querySelector('.hub-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Populate cities on country change
    overlay.querySelector('[name="country"]').addEventListener('change', e => {
        const citySelect = overlay.querySelector('[name="location"]');
        const country = window.LOCATION_DATA?.countries.find(c => c.code === e.target.value);
        citySelect.innerHTML = '<option value="">— Select a city —</option>' +
            (country?.cities || []).map(city => `<option value="${city}">${city}</option>`).join('');
        citySelect.disabled = !e.target.value;
    });

    overlay.querySelector('#edit-listing-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, btn = f.querySelector('[type="submit"]');
        btn.disabled = true; btn.textContent = 'Saving…';
        const res = await api('PUT', `/marketplace/listings/${id}`, {
            title: f.title.value.trim(),
            description: f.description.value.trim(),
            price: parseFloat(f.price.value),
            condition: f.condition.value,
            category: f.category.value,
            console_type: f.console_type.value,
            country: f.country.value,
            location: f.location.value.trim(),
            phone: f.phone.value.trim(),
            olx_url: f.olx_url.value.trim(),
            ebay_url: f.ebay_url.value.trim(),
        });
        if (res.success) { close(); openListingDetail(id); } // reload detail
        else { btn.disabled = false; btn.textContent = 'Save'; showToast(res.error || 'Error.', 'error'); }
    });
}

/* ================================================================
   REPAIR WIZARD
   ================================================================ */

/** Status badge HTML */
function repairStatusBadge(status) {
    const map = {
        pending:     { label: '🟡 Pending',     cls: 'hub-status--pending' },
        in_progress: { label: '🔵 In Progress', cls: 'hub-status--in-progress' },
        resolved:    { label: '🟢 Resolved',    cls: 'hub-status--resolved' }
    };
    const s = map[status] || { label: status, cls: '' };
    return `<span class="hub-status-badge ${s.cls}">${esc(s.label)}</span>`;
}

/** Render the repair wizard: model → symptoms → description → submit */
function renderRepair() {
    const v = document.getElementById('view-repair');
    if (!user()) {
        v.innerHTML = `<div class="hub-empty"><div class="hub-empty__icon">🔒</div>${esc(t('repair_login_text'))}<br><a href="login.html" style="color:var(--accent-color)">${esc(t('repair_login_link'))}</a></div>`;
        return;
    }
    const cName = CONSOLES.find(c => c.id === S.console)?.name || S.console;
    const models = MODELS_BY_CONSOLE[S.console] || [];
    const symptoms = SYMPTOMS_BY_CONSOLE[S.console] || [];
    const step = S.repairStep;

    const bars = [0, 1, 2, 3].map(i =>
        `<div class="hub-repair-progress__bar${i <= step ? ' hub-repair-progress__bar--done' : ''}"></div>`).join('');

    let body = '';

    if (step === 0) {
        /* ── Step 0: Model selection (or text input for "other") ── */
        if (S.console === 'other') {
            body = `
                <div class="hub-repair-question">${esc(t('repair_other_model_question'))}</div>
                <div class="hub-repair-hint">${esc(t('repair_other_model_hint'))}</div>
                <input type="text" class="hub-repair-textarea" id="repair-other-model" maxlength="200" placeholder="${esc(t('repair_other_model_placeholder'))}" value="${esc(S.repairModel)}" style="padding:10px;font-size:.92rem">
                <button class="hub-btn hub-btn--primary" id="repair-next"${S.repairModel.trim() ? '' : ' disabled'}>${esc(t('repair_continue'))}</button>`;
        } else {
            body = `
                <div class="hub-repair-question">${esc(t('repair_model_question').replace('{console}', cName))}</div>
                <div class="hub-repair-hint">${esc(t('repair_model_hint'))}</div>
                <div class="hub-symptom-grid">
                    ${models.map(m => `<button class="hub-symptom-btn${S.repairModel === m ? ' hub-symptom-btn--selected' : ''}" data-model="${esc(m)}">${esc(m)}</button>`).join('')}
                </div>
                <button class="hub-btn hub-btn--primary" id="repair-next"${S.repairModel ? '' : ' disabled'}>${esc(t('repair_continue'))}</button>`;
        }
    } else if (step === 1) {
        /* ── Step 1: Symptom selection ── */
        const hasCustom = S.repairSymptoms.includes('__custom__');
        const canProceed = S.repairSymptoms.length > 0 && (!hasCustom || S.repairCustomProblem.trim());
        body = `
            <div class="hub-repair-question">${esc(t('repair_symptom_question').replace('{console}', cName))}</div>
            <div class="hub-repair-hint">${esc(t('repair_symptom_hint'))}</div>
            <div class="hub-symptom-grid">
                ${symptoms.map(s => `<button class="hub-symptom-btn${S.repairSymptoms.includes(s) ? ' hub-symptom-btn--selected' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}
                <button class="hub-symptom-btn hub-symptom-btn--custom${hasCustom ? ' hub-symptom-btn--selected' : ''}" id="repair-custom-btn">${esc(t('repair_other_issue'))}</button>
            </div>
            ${hasCustom ? `<div class="hub-repair-custom-wrap">
                <textarea class="hub-repair-textarea" id="repair-custom-text" rows="4" maxlength="500" placeholder="${esc(t('repair_custom_placeholder'))}">${esc(S.repairCustomProblem)}</textarea>
                <div class="hub-repair-char-count"><span id="repair-custom-count">${S.repairCustomProblem.length}</span> / 500</div>
            </div>` : ''}
            <div style="display:flex;gap:8px">
                <button class="hub-btn hub-btn--secondary" id="repair-prev">${esc(t('repair_back'))}</button>
                <button class="hub-btn hub-btn--primary" id="repair-next"${canProceed ? '' : ' disabled'}>${esc(t('repair_continue'))}</button>
            </div>`;
    } else if (step === 2) {
        /* ── Step 2: Description ── */
        body = `
            <div class="hub-repair-question">${esc(t('repair_desc_question'))}</div>
            <div class="hub-repair-hint">${esc(t('repair_desc_hint'))}</div>
            <textarea class="hub-repair-textarea" id="repair-desc" rows="6" maxlength="2000" placeholder="${esc(t('repair_desc_placeholder'))}">${esc(S.repairDesc)}</textarea>
            <div style="display:flex;gap:8px">
                <button class="hub-btn hub-btn--secondary" id="repair-prev">${esc(t('repair_back'))}</button>
                <button class="hub-btn hub-btn--primary" id="repair-submit">${esc(t('repair_submit_btn'))}</button>
            </div>`;
    } else {
        /* ── Step 3: Success ── */
        body = `
            <div class="hub-repair-success">
                <div class="hub-repair-success__icon">✅</div>
                <div style="color:var(--text-light);font-size:1.1rem;font-weight:600">${esc(t('repair_submitted_title'))}</div>
                <div style="color:var(--text-gray);font-size:.88rem">${esc(t('repair_submitted_desc'))}</div>
                <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
                    <button class="hub-btn hub-btn--secondary" id="repair-new">${esc(t('repair_new_request'))}</button>
                    <button class="hub-btn hub-btn--primary" id="repair-view-requests">${esc(t('repair_view_requests'))}</button>
                </div>
            </div>`;
    }

    v.innerHTML = `
        <div class="hub-view-header"><div class="hub-view-header__title">${t('repair_header').replace('{console}', esc(cName))}</div></div>
        <div class="hub-repair-progress">${bars}</div>
        <div class="hub-repair-body"><div class="hub-repair-inner">${body}</div></div>`;

    // Events per step
    if (step === 0) {
        if (S.console === 'other') {
            const inp = v.querySelector('#repair-other-model');
            if (inp) {
                inp.addEventListener('input', e => {
                    S.repairModel = e.target.value;
                    v.querySelector('#repair-next').disabled = !e.target.value.trim();
                });
                inp.focus();
            }
        } else {
            v.querySelectorAll('.hub-symptom-btn[data-model]').forEach(b => b.addEventListener('click', () => {
                S.repairModel = b.dataset.model;
                renderRepair();
            }));
        }
        v.querySelector('#repair-next')?.addEventListener('click', () => { S.repairStep = 1; renderRepair(); });
    }
    if (step === 1) {
        v.querySelectorAll('.hub-symptom-btn[data-s]').forEach(b => b.addEventListener('click', () => {
            const s = b.dataset.s;
            const i = S.repairSymptoms.indexOf(s);
            if (i >= 0) S.repairSymptoms.splice(i, 1); else S.repairSymptoms.push(s);
            renderRepair();
        }));
        v.querySelector('#repair-custom-btn')?.addEventListener('click', () => {
            const i = S.repairSymptoms.indexOf('__custom__');
            if (i >= 0) { S.repairSymptoms.splice(i, 1); S.repairCustomProblem = ''; }
            else S.repairSymptoms.push('__custom__');
            renderRepair();
        });
        const cta = v.querySelector('#repair-custom-text');
        if (cta) {
            cta.addEventListener('input', e => {
                S.repairCustomProblem = e.target.value;
                v.querySelector('#repair-custom-count').textContent = e.target.value.length;
                const ok = S.repairSymptoms.length > 0 && (!S.repairSymptoms.includes('__custom__') || S.repairCustomProblem.trim());
                v.querySelector('#repair-next').disabled = !ok;
            });
            cta.focus();
        }
        v.querySelector('#repair-prev')?.addEventListener('click', () => { S.repairStep = 0; renderRepair(); });
        v.querySelector('#repair-next')?.addEventListener('click', () => { S.repairStep = 2; renderRepair(); });
    }
    if (step === 2) {
        v.querySelector('#repair-desc')?.addEventListener('input', e => { S.repairDesc = e.target.value; });
        v.querySelector('#repair-prev')?.addEventListener('click', () => { S.repairStep = 1; renderRepair(); });
        v.querySelector('#repair-submit')?.addEventListener('click', submitRepair);
    }
    if (step === 3) {
        v.querySelector('#repair-new')?.addEventListener('click', () => {
            Object.assign(S, { repairStep: 0, repairModel: '', repairSymptoms: [], repairDesc: '', repairResult: null, repairCustomProblem: '' });
            renderRepair();
        });
        v.querySelector('#repair-view-requests')?.addEventListener('click', () => {
            navigate('repair-requests', null, '');
        });
    }
}

/** Submit the repair request directly */
async function submitRepair() {
    const btn = document.querySelector('#repair-submit');
    if (btn) { btn.disabled = true; btn.textContent = t('repair_submitting'); }

    const actualSymptoms = S.repairSymptoms.filter(s => s !== '__custom__');
    try {
        const data = await api('POST', '/repair', {
            consoleType: S.console,
            consoleModel: S.repairModel,
            symptoms: actualSymptoms,
            customSymptom: S.repairCustomProblem || '',
            description: S.repairDesc
        });
        if (data.success) {
            S.repairStep = 3;
            renderRepair();
        } else {
            if (btn) { btn.disabled = false; btn.textContent = t('repair_submit_btn'); }
            showToast(data.error || t('repair_submit_error'), 'error');
        }
    } catch {
        if (btn) { btn.disabled = false; btn.textContent = t('repair_submit_btn'); }
        showToast(t('repair_submit_error'), 'error');
    }
}

/* ================================================================
   REPAIR — MY REQUESTS
   ================================================================ */

/** Render the user's own repair requests */
async function renderRepairRequests() {
    const v = document.getElementById('view-repair-requests');
    if (!user()) {
        v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">🔒</div>You must be logged in.<br><a href="login.html" style="color:var(--accent-color)">Log in</a></div>';
        return;
    }
    v.innerHTML = `
        <div class="hub-view-header"><div class="hub-view-header__title">📋 ${t('repair_my_title')}</div></div>
        <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>${t('repair_loading')}</div></div>`;

    try {
        const data = await api('GET', '/repair');
        if (!data.success) throw 0;
        const requests = data.requests || [];

        if (!requests.length) {
            v.innerHTML = `
                <div class="hub-view-header"><div class="hub-view-header__title">📋 ${t('repair_my_title')}</div></div>
                <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">📭</div>${t('repair_no_requests')}</div></div>`;
            return;
        }

        const cards = requests.map(r => {
            const consoleName = CONSOLES.find(c => c.id === r.console)?.name || r.console;
            const symptomList = r.symptoms ? r.symptoms.split(', ').map(s => `<span class="hub-repair-tag">${esc(s)}</span>`).join('') : '';
            return `
                <div class="hub-repair-card">
                    <div class="hub-repair-card__header">
                        <div>
                            <strong style="color:var(--text-light)">${esc(consoleName)}</strong>
                            ${r.console_model ? `<span style="color:var(--text-gray);font-size:.82rem;margin-left:6px">${esc(r.console_model)}</span>` : ''}
                            <span style="color:var(--text-gray);font-size:.8rem;margin-left:8px">#${r.id}</span>
                        </div>
                        ${repairStatusBadge(r.status)}
                    </div>
                    <div class="hub-repair-card__symptoms">${symptomList}</div>
                    ${r.custom_symptom ? `<div style="color:var(--text-gray);font-size:.84rem;font-style:italic">${t('repair_custom_label')}: ${esc(r.custom_symptom)}</div>` : ''}
                    ${r.description ? `<div style="color:var(--text-gray);font-size:.84rem;margin-top:4px">${esc(r.description)}</div>` : ''}
                    ${r.admin_reply ? `
                        <div class="hub-repair-card__reply">
                            <div style="font-size:.76rem;color:var(--accent-color);font-weight:600;margin-bottom:4px">${t('repair_admin_reply_title')}</div>
                            <div style="color:var(--text-light);font-size:.88rem;line-height:1.5">${esc(r.admin_reply)}</div>
                        </div>` : ''}
                    <div style="color:var(--text-gray);font-size:.76rem;margin-top:8px">${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>`;
        }).join('');

        v.innerHTML = `
            <div class="hub-view-header"><div class="hub-view-header__title">📋 ${t('repair_my_title')}</div></div>
            <div class="hub-repair-body"><div class="hub-repair-list">${cards}</div></div>`;
    } catch {
        v.innerHTML = `
            <div class="hub-view-header"><div class="hub-view-header__title">📋 ${t('repair_my_title')}</div></div>
            <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">❌</div>${t('repair_load_error')}</div></div>`;
    }
}

/* ================================================================
   REPAIR — ADMIN VIEW
   ================================================================ */

/** Render admin view of all repair requests with inline editing */
async function renderRepairAdmin() {
    const v = document.getElementById('view-repair-admin');
    const u = user();
    if (!u || u.role !== 'admin') {
        v.innerHTML = `<div class="hub-empty"><div class="hub-empty__icon">🔒</div>${t('repair_admin_access')}</div>`;
        return;
    }
    v.innerHTML = `
        <div class="hub-view-header"><div class="hub-view-header__title">🛠️ ${t('repair_admin_title')}</div></div>
        <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>${t('repair_loading')}</div></div>`;

    try {
        const data = await api('GET', '/repair/all');
        if (!data.success) throw 0;
        const requests = data.requests || [];

        if (!requests.length) {
            v.innerHTML = `
                <div class="hub-view-header"><div class="hub-view-header__title">🛠️ ${t('repair_admin_title')}</div></div>
                <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">📭</div>${t('repair_admin_no_requests')}</div></div>`;
            return;
        }

        const cards = requests.map(r => {
            const consoleName = CONSOLES.find(c => c.id === r.console)?.name || r.console;
            const symptomList = r.symptoms ? r.symptoms.split(', ').map(s => `<span class="hub-repair-tag">${esc(s)}</span>`).join('') : '';
            return `
                <div class="hub-repair-card hub-repair-card--admin" data-rid="${r.id}">
                    <div class="hub-repair-card__header">
                        <div>
                            <strong style="color:var(--text-light)">${esc(r.username || 'User #' + r.user_id)}</strong>
                            <span style="color:var(--text-gray);font-size:.8rem;margin-left:8px">${esc(consoleName)}${r.console_model ? ' · ' + esc(r.console_model) : ''} · #${r.id}</span>
                        </div>
                        ${repairStatusBadge(r.status)}
                    </div>
                    <div class="hub-repair-card__symptoms">${symptomList}</div>
                    ${r.custom_symptom ? `<div style="color:var(--text-gray);font-size:.84rem;font-style:italic">${t('repair_custom_label')}: ${esc(r.custom_symptom)}</div>` : ''}
                    ${r.description ? `<div style="color:var(--text-gray);font-size:.84rem;margin-top:4px">${esc(r.description)}</div>` : ''}
                    <div class="hub-repair-admin-controls">
                        <div class="hub-repair-admin-row">
                            <label style="color:var(--text-gray);font-size:.8rem">${t('repair_admin_status_label')}</label>
                            <select class="hub-repair-select" data-field="status">
                                <option value="pending"${r.status === 'pending' ? ' selected' : ''}>${t('repair_admin_status_pending')}</option>
                                <option value="in_progress"${r.status === 'in_progress' ? ' selected' : ''}>${t('repair_admin_status_in_progress')}</option>
                                <option value="resolved"${r.status === 'resolved' ? ' selected' : ''}>${t('repair_admin_status_resolved')}</option>
                            </select>
                        </div>
                        <div class="hub-repair-admin-row">
                            <label style="color:var(--text-gray);font-size:.8rem">${t('repair_admin_reply_label')}</label>
                            <textarea class="hub-repair-textarea" data-field="reply" rows="3" maxlength="2000" placeholder="${t('repair_admin_reply_placeholder')}">${esc(r.admin_reply || '')}</textarea>
                        </div>
                        <button class="hub-btn hub-btn--primary hub-btn--sm" data-action="save-repair">${t('repair_admin_save')}</button>
                    </div>
                    <div style="color:var(--text-gray);font-size:.76rem;margin-top:8px">${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>`;
        }).join('');

        v.innerHTML = `
            <div class="hub-view-header"><div class="hub-view-header__title">🛠️ ${t('repair_admin_title')} (${requests.length})</div></div>
            <div class="hub-repair-body"><div class="hub-repair-list">${cards}</div></div>`;

        // Admin save event delegation
        v.addEventListener('click', async e => {
            const btn = e.target.closest('[data-action="save-repair"]');
            if (!btn) return;
            const card = btn.closest('.hub-repair-card');
            const rid = card.dataset.rid;
            const status = card.querySelector('[data-field="status"]').value;
            const adminReply = card.querySelector('[data-field="reply"]').value.trim();

            btn.disabled = true; btn.textContent = t('repair_admin_saving');
            try {
                const res = await api('PATCH', `/repair/${rid}`, { status, adminReply });
                if (res.success) {
                    btn.textContent = t('repair_admin_saved');
                    // Update the badge inline
                    const header = card.querySelector('.hub-repair-card__header');
                    const oldBadge = header.querySelector('.hub-status-badge');
                    if (oldBadge) oldBadge.outerHTML = repairStatusBadge(status);
                    setTimeout(() => { btn.disabled = false; btn.textContent = t('repair_admin_save'); }, 1500);
                } else {
                    btn.disabled = false; btn.textContent = t('repair_admin_save');
                    showToast(res.error || 'Failed to save.', 'error');
                }
            } catch {
                btn.disabled = false; btn.textContent = t('repair_admin_save');
                showToast('Failed to save.', 'error');
            }
        });
    } catch {
        v.innerHTML = `
            <div class="hub-view-header"><div class="hub-view-header__title">🛠️ ${t('repair_admin_title')}</div></div>
            <div class="hub-repair-body"><div class="hub-empty"><div class="hub-empty__icon">❌</div>${t('repair_load_error')}</div></div>`;
    }
}

/* ================================================================
   DIRECT MESSAGES
   ================================================================ */

/** Render the direct messages view: conversation list + chat panel */
function renderDM() {
    const v = document.getElementById('view-dm');
    if (!user()) {
        v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">🔒</div>You must be logged in.<br><a href="login.html" style="color:var(--accent-color)">Log in</a></div>';
        return;
    }
    v.innerHTML = `
        <div class="hub-dm-layout" id="dm-layout">
            <div class="hub-dm-list" id="dm-list"><div class="hub-dm-list__empty">Loading…</div></div>
            <div class="hub-dm-thread" id="dm-thread"><div class="hub-dm-empty">Select a conversation</div></div>
        </div>`;
}

/** Fetch DM conversation list (grouped by partner) */
async function loadConversations() {
    const list = document.getElementById('dm-list');
    if (!list) return;
    try {
        const data = await api('GET', '/dm/conversations');
        if (!data.success) throw 0;
        const convs = data.conversations || [];

        if (!convs.length) { list.innerHTML = '<div class="hub-dm-list__empty">No conversations</div>'; return; }

        list.innerHTML = convs.map(c => `
            <button class="hub-dm-conv${S.dmPartner === c.partner_id ? ' hub-dm-conv--active' : ''}" data-id="${c.partner_id}" data-name="${esc(c.partner_name)}" data-avatar="${esc(c.partner_avatar || '')}">
                <div class="hub-dm-conv__avatar">${avatarHtml(c.partner_name, c.partner_avatar, 36)}</div>
                <div class="hub-dm-conv__body">
                    <div class="hub-dm-conv__name">${esc(c.partner_name)}</div>
                    <div class="hub-dm-conv__preview">${esc(c.last_message)}</div>
                </div>
                ${c.unread_count > 0 ? `<span class="hub-badge hub-badge--count">${c.unread_count}</span>` : ''}
            </button>`).join('');

        list.addEventListener('click', e => {
            const c = e.target.closest('.hub-dm-conv');
            if (c) openConversation(+c.dataset.id, c.dataset.name, c.dataset.avatar);
        });

        if (S.dmPartner) {
            const found = convs.find(c => c.partner_id === S.dmPartner);
            if (found) openConversation(S.dmPartner, found.partner_name, found.partner_avatar);
        }
    } catch { list.innerHTML = '<div class="hub-dm-list__empty">Failed to load</div>'; }
}

/** Open a DM conversation thread with a specific user */
async function openConversation(partnerId, partnerName, partnerAvatar) {
    S.dmPartner = partnerId;
    const thread = document.getElementById('dm-thread');
    if (!thread) return;

    document.querySelectorAll('.hub-dm-conv').forEach(c => {
        c.classList.toggle('hub-dm-conv--active', +c.dataset.id === partnerId);
        if (+c.dataset.id === partnerId) {
            if (!partnerName) partnerName = c.dataset.name;
            if (!partnerAvatar) partnerAvatar = c.dataset.avatar;
        }
    });

    document.getElementById('dm-layout')?.classList.add('hub-dm-layout--thread-open');

    const u = user();
    thread.innerHTML = `
        <div class="hub-dm-thread__header">
            <button class="hub-dm-back-btn" id="dm-back-btn" aria-label="Back to conversations" type="button">←</button>
            <div class="hub-dm-conv__avatar" style="width:30px;height:30px;font-size:.7rem">${avatarHtml(partnerName, partnerAvatar, 30)}</div>
            <span style="color:var(--text-light);font-weight:600;font-size:.9rem">${esc(partnerName || 'Utilizator')}</span>
        </div>
        <div class="hub-dm-messages" id="dm-messages"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>Loading…</div></div>
        <form class="hub-dm-form" id="dm-form">
            <input class="hub-dm-form__input" type="text" placeholder="Write a message…" maxlength="2000" required>
            <button class="hub-btn hub-btn--primary" type="submit">Send</button>
        </form>`;

    thread.querySelector('#dm-back-btn').addEventListener('click', () => {
        S.dmPartner = null;
        document.getElementById('dm-layout')?.classList.remove('hub-dm-layout--thread-open');
        document.querySelectorAll('.hub-dm-conv').forEach(c => c.classList.remove('hub-dm-conv--active'));
        thread.innerHTML = '<div class="hub-dm-empty">Select a conversation</div>';
    });

    try {
        const data = await api('GET', `/dm/messages/${partnerId}`);
        const msgs = data.messages || [];
        const el = document.getElementById('dm-messages');
        if (!msgs.length) {
            el.innerHTML = '<div class="hub-dm-empty" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-gray)">Send the first message</div>';
        } else {
            el.innerHTML = msgs.map(m => `
                <div class="hub-dm-msg ${m.sender_id === u.id ? 'hub-dm-msg--mine' : 'hub-dm-msg--theirs'}">
                    ${esc(m.message)}
                    <div class="hub-dm-msg__time">${timeAgo(m.created_at)}</div>
                    ${m.sender_id !== u.id ? `<button class="report-trigger-btn" data-report-type="direct_message" data-report-id="${m.id}" data-report-preview="${esc((m.message || '').substring(0, 60))}" title="${I18nModule.t('report_btn_trigger_dm_title')}">⚑</button>` : ''}
                </div>`).join('');
            el.scrollTop = el.scrollHeight;
        }
    } catch {
        document.getElementById('dm-messages').innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Error.</div>';
    }

    document.getElementById('dm-messages').addEventListener('click', e => {
        const reportBtn = e.target.closest('.report-trigger-btn');
        if (reportBtn && typeof window.openReportModal === 'function') {
            window.openReportModal({
                contentType: reportBtn.dataset.reportType,
                contentId:   reportBtn.dataset.reportId,
                contentPreview: reportBtn.dataset.reportPreview,
            });
        }
    });

    document.getElementById('dm-form').addEventListener('submit', async e => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';
        const res = await api('POST', '/dm/send', { receiverId: partnerId, message: msg });
        if (res.success) {
            const el = document.getElementById('dm-messages');
            el.querySelector('.hub-dm-empty')?.remove();
            const div = document.createElement('div');
            div.className = 'hub-dm-msg hub-dm-msg--mine';
            div.innerHTML = `${esc(msg)}<div class="hub-dm-msg__time">now</div>`;
            el.appendChild(div);
            el.scrollTop = el.scrollHeight;
            window.dispatchEvent(new CustomEvent('cn:message-sent'));
        }
    });
}

/* ================================================================
   COMMUNITY PHOTOS
   ================================================================ */

let photosState = { page: 1, items: [] };

function renderPhotos() {
    const v = document.getElementById('view-photos');
    if (!v) return;
    const u = user();
    v.innerHTML = `
        <div class="hub-view-header">
            <h2 class="hub-view-header__title">${I18nModule.t('photos_title')}</h2>
            ${u ? `<button class="hub-btn hub-btn--primary" id="photos-upload-btn">📸 ${I18nModule.t('photos_upload_btn')}</button>` : ''}
        </div>
        <div class="hub-photos-grid" id="photos-grid"></div>
        <div class="hub-photos-loadmore" id="photos-loadmore" hidden>
            <button class="hub-btn hub-btn--secondary" id="photos-loadmore-btn">${I18nModule.t('photos_load_more')}</button>
        </div>
    `;

    v.querySelector('#photos-upload-btn')?.addEventListener('click', openPhotoUploadModal);
    v.querySelector('#photos-loadmore-btn')?.addEventListener('click', () => loadPhotos(true));
}

/** Open modal dialog to upload a new community photo — mirrors openAddListingModal()'s singleton overlay + dropzone pattern */
function openPhotoUploadModal() {
    const _prev = document.querySelector('.hub-modal-overlay');
    if (_prev) _prev.remove();

    let selectedFile = null;

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">${I18nModule.t('photos_upload_title')}</span>
                <button class="hub-modal__close" aria-label="Close">&times;</button>
            </div>
            <div class="hub-modal__body">
                <div class="hub-form-group">
                    <div class="hub-upload-zone" id="photo-upload-zone">
                        <input type="file" id="photo-upload-file" accept="image/jpeg,image/png,image/webp,image/gif" hidden>
                        <span class="hub-upload-zone__icon">📸</span>
                        <span class="hub-upload-zone__text" id="photo-upload-zone-text">${I18nModule.t('photos_no_file')}</span>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">${I18nModule.t('photos_caption_placeholder')}</label>
                    <textarea class="hub-form-textarea" id="photo-upload-caption" maxlength="300" rows="2"></textarea>
                </div>
                <p class="hub-form-status" id="photo-upload-status"></p>
            </div>
            <div class="hub-modal__footer">
                <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Cancel</button>
                <button type="button" class="hub-btn hub-btn--primary" id="photo-upload-submit">${I18nModule.t('photos_upload_submit')}</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.hub-modal__close').addEventListener('click', close);
    overlay.querySelector('.hub-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const zone = overlay.querySelector('#photo-upload-zone');
    const fileInput = overlay.querySelector('#photo-upload-file');
    const zoneText = overlay.querySelector('#photo-upload-zone-text');

    function setFile(file) {
        selectedFile = file || null;
        zoneText.textContent = selectedFile ? selectedFile.name : I18nModule.t('photos_no_file');
    }

    zone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => setFile(fileInput.files[0]));
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('hub-upload-zone--drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('hub-upload-zone--drag'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('hub-upload-zone--drag');
        setFile(e.dataTransfer.files[0]);
    });

    overlay.querySelector('#photo-upload-submit').addEventListener('click', () => submitPhotoUpload(overlay, () => selectedFile, close));
}

async function loadPhotos(append) {
    const grid = document.getElementById('photos-grid');
    if (!grid) return;

    if (!append) {
        photosState = { page: 1, items: [] };
        grid.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">⏳</div></div>';
    }

    try {
        const data = await api('GET', `/community/photos?page=${photosState.page}`);
        if (!data.success) throw 0;
        photosState.items.push(...data.photos);

        if (!photosState.items.length) {
            grid.innerHTML = `<div class="hub-empty"><div class="hub-empty__icon">📸</div><p>${I18nModule.t('photos_empty')}</p></div>`;
            document.getElementById('photos-loadmore').hidden = true;
            return;
        }

        const u = user();
        grid.innerHTML = photosState.items.map(p => `
            <div class="hub-photo-card">
                <img src="${esc(p.imageUrl)}" alt="${esc(p.caption)}" loading="lazy">
                <div class="hub-photo-card__meta">
                    <span class="hub-photo-card__user">${esc(p.username)}</span>
                    ${u && u.id === p.userId ? `<button class="hub-photo-card__delete" data-id="${p.id}" title="${I18nModule.t('photos_delete')}">🗑</button>` : ''}
                </div>
                ${p.caption ? `<p class="hub-photo-card__caption">${esc(p.caption)}</p>` : ''}
            </div>
        `).join('');

        document.getElementById('photos-loadmore').hidden = data.photos.length < 24;
        photosState.page++;

        grid.querySelectorAll('.hub-photo-card__delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!(await confirmModal(I18nModule.t('photos_delete_confirm')))) return;
                const res = await api('DELETE', `/community/photos/${btn.dataset.id}`);
                if (res.success) loadPhotos(false);
            });
        });
    } catch {
        if (!photosState.items.length) grid.innerHTML = `<div class="hub-empty"><p>${I18nModule.t('photos_error')}</p></div>`;
    }
}

async function submitPhotoUpload(overlay, getFile, close) {
    const captionInput = overlay.querySelector('#photo-upload-caption');
    const statusEl = overlay.querySelector('#photo-upload-status');
    const submitBtn = overlay.querySelector('#photo-upload-submit');
    const file = getFile();
    if (!file) { statusEl.textContent = I18nModule.t('photos_no_file'); return; }

    submitBtn.disabled = true;
    statusEl.textContent = I18nModule.t('photos_uploading');

    try {
        const presign = await api('POST', '/uploads/presign', {
            kind: 'gallery',
            contentType: file.type,
            fileSize: file.size,
        });
        if (!presign.success) throw new Error(presign.error || 'Presign failed');

        const putRes = await fetch(presign.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });
        if (!putRes.ok) throw new Error('Upload failed');

        const meta = await api('POST', '/community/photos', {
            imageKey: presign.key,
            caption: captionInput.value.trim(),
        });
        if (!meta.success) throw new Error(meta.error || 'Save failed');

        close();
        loadPhotos(false);
    } catch (err) {
        statusEl.textContent = err.message || I18nModule.t('photos_upload_error');
    } finally {
        submitBtn.disabled = false;
    }
}

/* ================================================================
   UNREAD BADGE POLLING
   ================================================================ */

/** Poll for unread DM count and update sidebar badge */
function startUnreadPolling() {
    const badge = document.getElementById('dm-unread-badge');
    if (!badge) return;

    async function tick() {
        if (!user()) return;
        try {
            const d = await api('GET', '/dm/unread-count');
            if (d.success && d.count > 0) { badge.textContent = d.count; badge.hidden = false; }
            else badge.hidden = true;
        } catch { /* ignore */ }
    }
    tick();
    setInterval(tick, 15000);
}

/* ================================================================
   BOOT
   ================================================================ */

// Always initialize mobile controls, even if later logic exits early.
initMobileSidebarControls();

// Login gate: block community if not logged in
// Gate only the actual hub page (community.html); the welcome/landing page (#community-landing) is public.
const _isWelcomePage = !!document.getElementById('community-landing');
if (!user() && !_isWelcomePage) {
    const page = document.querySelector('.community-page');
    if (page) {
        page.innerHTML = `
            <div class="hub-login-gate">
                <div class="hub-login-gate__icon">🔒</div>
                <h2 class="hub-login-gate__title">${t('community_login_required_title')}</h2>
                <p class="hub-login-gate__text">${t('community_login_required_text')}</p>
                <a href="login.html" class="hub-login-gate__btn">${t('community_login_required_btn')}</a>
            </div>`;
    }
} else {

initSidebar();
startUnreadPolling();

// Hide admin-only sidebar items for non-admin users
(function initAdminVisibility() {
    const u = user();
    const isAdminUser = u && u.role === 'admin';
    document.querySelectorAll('.hub-sidebar__admin-only').forEach(el => {
        el.style.display = isAdminUser ? '' : 'none';
    });
})();

// Deep link: handles hash-based navigation on load and hash changes
function handleHashNavigation() {
    const hash = window.location.hash;

    // Deep link listing: #listing-123
    const listingMatch = hash.match(/^#listing-(\d+)$/);
    if (listingMatch) {
        showView('marketplace');
        openListingDetail(+listingMatch[1]);
        return;
    }

    // Deep link forum thread: #forum/ps/thread/123
    const threadDeepMatch = hash.match(/^#forum\/([^/]+)\/thread\/(\d+)$/);
    if (threadDeepMatch) {
        const con = threadDeepMatch[1];
        const tid = +threadDeepMatch[2];
        const validConsoles = ['ps', 'xbox', 'nintendo', 'pc', 'general', 'other'];
        if (validConsoles.includes(con)) {
            S.console = con;
            renderForum();
            openThread(tid);
            return;
        }
    }

    // Section: #marketplace, #marketplace/consoles, #forum/ps, etc.
    if (hash && hash.length > 1) {
        const parts = hash.slice(1).split('/');
        const view = parts[0];
        const con  = parts[1] || null;
        const cat  = parts[2] || '';

        const validViews = ['chat', 'forum', 'marketplace', 'repair', 'repair-requests', 'repair-admin', 'dm', 'photos'];
        if (validViews.includes(view)) {
            // Mark the active sidebar item
            sidebar?.querySelectorAll('.hub-sidebar__item').forEach(item => {
                const match = item.dataset.view === view &&
                    (item.dataset.console || null) === con &&
                    (item.dataset.category ?? '') === cat;
                item.classList.toggle('hub-sidebar__item--active', match);
            });
            navigate(view, con, cat);
            return;
        }
    }

    // Default route
    navigate('chat', null, '');
}
handleHashNavigation();
window.addEventListener('hashchange', handleHashNavigation);

} // end login gate else

// ── Mobile bottom nav — community view routing ───────────────
(function initMbnTabs() {
    const btn = document.getElementById('mbn-more-btn');
    const dd  = document.getElementById('mbn-dropdown');

    function switchView(view, con, cat) {
        navigate(view || 'chat', con || null, cat || '');

        // Sync active state on MBN items
        document.querySelectorAll('.mbn-item[data-mbn-view], .mbn-dd-item[data-mbn-view]').forEach(el => {
            const match = el.dataset.mbnView === view &&
                (el.dataset.mbnConsole || '') === (con || '') &&
                (el.dataset.mbnCategory || '') === (cat || '');
            el.classList.toggle('mbn-item--active', match);
        });
    }

    function buildDropdown() {
        if (!dd) return;
        dd.innerHTML = '';

        // Collect data from sidebar sections
        const consoles = [];
        const flatSections = [];

        document.querySelectorAll('.hub-sidebar__section').forEach(section => {
            const heading = section.querySelector('.hub-sidebar__heading');
            if (!heading) return;

            const consoleGroups = section.querySelectorAll('.hub-sidebar__console');
            if (consoleGroups.length) {
                consoleGroups.forEach(cg => {
                    const nameEl = cg.querySelector('.hub-sidebar__console-name');
                    const consoleName = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '';
                    const color = nameEl ? (nameEl.style.getPropertyValue('--console-color') || '') : '';
                    const first = cg.querySelector('.hub-sidebar__item');
                    consoles.push({ name: consoleName, color, slug: first?.dataset.console || '' });
                });
                return;
            }

            const items = [];
            section.querySelectorAll('.hub-sidebar__item').forEach(item => {
                if (item.classList.contains('hub-sidebar__item--locked')) return;
                if (window.getComputedStyle(item).display === 'none') return;
                items.push({ el: item, label: item.textContent.replace(/\s+/g, ' ').trim() });
            });
            if (items.length) flatSections.push({ heading: heading.textContent.replace(/\s+/g, ' ').trim(), items });
        });

        // Flat sections (General Chat, Repair, Marketplace, Messages)
        flatSections.forEach(sec => {
            const h = document.createElement('div');
            h.className = 'mbn-dd-heading';
            h.textContent = sec.heading;
            dd.appendChild(h);

            sec.items.forEach(it => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'mbn-dd-item';
                b.dataset.mbnView = it.el.dataset.view || '';
                if (it.el.dataset.console) b.dataset.mbnConsole = it.el.dataset.console;
                if (typeof it.el.dataset.category === 'string') b.dataset.mbnCategory = it.el.dataset.category;
                b.innerHTML = `<span>${it.label}</span>`;
                b.addEventListener('click', () => {
                    switchView(b.dataset.mbnView, b.dataset.mbnConsole || '', b.dataset.mbnCategory || '');
                    dd.classList.remove('is-open');
                    btn.setAttribute('aria-expanded', 'false');
                });
                dd.appendChild(b);
            });
        });

        // Console chip rows (Community + Repair)
        if (consoles.length) {
            [{ heading: 'Community', view: 'forum' }, { heading: 'Repair', view: 'repair' }].forEach(g => {
                const h = document.createElement('div');
                h.className = 'mbn-dd-heading';
                h.textContent = g.heading;
                dd.appendChild(h);

                const row = document.createElement('div');
                row.className = 'mbn-dd-consoles';
                consoles.forEach(c => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'mbn-dd-chip';
                    chip.dataset.mbnView = g.view;
                    chip.dataset.mbnConsole = c.slug;
                    chip.innerHTML = `<span class="mbn-dd-dot" style="background:${c.color}"></span><span>${c.name}</span>`;
                    chip.addEventListener('click', () => {
                        switchView(g.view, c.slug, '');
                        dd.classList.remove('is-open');
                        btn.setAttribute('aria-expanded', 'false');
                    });
                    row.appendChild(chip);
                });
                dd.appendChild(row);
            });
        }

        // Static links at bottom
        const sep = document.createElement('div');
        sep.className = 'mbn-dd-sep';
        dd.appendChild(sep);

        [{ href: 'profil.html', icon: '👤', label: 'Profile' },
         { href: 'evolutie.html', icon: '🕹️', label: 'Consoles' }].forEach(s => {
            const a = document.createElement('a');
            a.href = s.href;
            a.className = 'mbn-dd-item';
            a.innerHTML = `<span class="mbn-dd-icon">${s.icon}</span><span>${s.label}</span>`;
            dd.appendChild(a);
        });
    }

    // Wire up static MBN items
    document.querySelectorAll('.mbn-item[data-mbn-view]').forEach(el => {
        el.addEventListener('click', () => {
            switchView(el.dataset.mbnView, el.dataset.mbnConsole || '', el.dataset.mbnCategory || '');
        });
    });

    buildDropdown();

    // Sync MBN active state to current hash without navigating
    const _initView = (window.location.hash.slice(1).split('/')[0]) || 'chat';
    document.querySelectorAll('.mbn-item[data-mbn-view]').forEach(el => {
        el.classList.toggle('mbn-item--active', el.dataset.mbnView === _initView);
    });
}());