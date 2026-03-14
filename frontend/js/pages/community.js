/**
 * ConsoleHub Community Module
 * Sidebar navigation, forum, marketplace, repair wizard, direct messages.
 * Vanilla ES module — no frameworks.
 */
import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';
import { confirmModal } from '../utils/confirm-modal.js';

// ── Constants ──────────────────────────────────────────────

const CONSOLES = [
    { id: 'ps',       name: 'PlayStation', color: '#0070D1' },
    { id: 'xbox',     name: 'Xbox',        color: '#107C10' },
    { id: 'nintendo', name: 'Nintendo',     color: '#E60012' },
    { id: 'pc',       name: 'PC Gaming',    color: '#9B59B6' },
];

const TAGS = ['All', 'General', 'Help', 'Discussion', 'News', 'Bug', 'Guide', 'Modding'];

const CONDITIONS = { new: 'Nou', like_new: 'Ca nou', good: 'Bun', fair: 'Acceptabil', parts: 'Piese' };
const CATEGORIES  = { consoles: 'Console', games: 'Jocuri', accessories: 'Accesorii', parts: 'Piese / Reparații' };

const SYMPTOMS = [
    'No power', 'Overheating', 'Disc read error', 'No video output',
    'Controller drift', 'Blue screen / crash', 'Slow performance', 'Network issues',
    'Strange noises', 'Eject problems', "Won't update", 'Battery drain',
];

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
    marketPage: 1,
    repairStep: 0,
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
    if (diff < 60000)    return 'acum';
    if (diff < 3600000)  return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
    return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
}

/** Get 2-letter initials from a username */
function ini(n) { return n ? n.slice(0, 2).toUpperCase() : '?'; }

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

    // Mobile sidebar: hamburger, overlay, close button
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    const closeBtn = document.getElementById('hub-sidebar-close');

    if (hamburger) hamburger.addEventListener('click', toggleMobileSidebar);
    if (overlay) overlay.addEventListener('click', closeMobileSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);

    // Legacy toggle (for non-mobile fallback)
    const toggle = document.getElementById('hub-sidebar-toggle');
    if (toggle) toggle.addEventListener('click', () => sidebar.classList.toggle('hub-sidebar--open'));
}

function toggleMobileSidebar() {
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    const isOpen = sidebar.classList.contains('hub-sidebar--open');
    if (isOpen) closeMobileSidebar();
    else {
        sidebar.classList.add('hub-sidebar--open');
        if (hamburger) hamburger.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const hamburger = document.getElementById('hub-mobile-hamburger');
    const overlay = document.getElementById('hub-mobile-overlay');
    sidebar.classList.remove('hub-sidebar--open');
    if (hamburger) hamburger.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

/** Navigate to a view, optionally filtering by console and category */
function navigate(view, con, cat) {
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
            Object.assign(S, { repairStep: 0, repairSymptoms: [], repairDesc: '', repairResult: null, repairCustomProblem: '' });
            showView('repair');
            renderRepair();
            break;
        case 'marketplace':
            S.category = cat || '';
            Object.assign(S, { marketSearch: '', marketSort: 'newest', marketCondition: '', marketPage: 1 });
            showView('marketplace');
            renderMarketplace();
            loadListings();
            break;
        case 'dm':
            showView('dm');
            renderDM();
            loadConversations();
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
            <div class="hub-view-header__title">💬 ${esc(cName)} — Comunitate</div>
            ${u ? '<button class="hub-btn hub-btn--primary" id="forum-new-btn">+ Subiect nou</button>' : ''}
        </div>
        <div class="hub-forum-filters" id="forum-filters">
            ${TAGS.map(t => `<button class="hub-filter-btn${S.forumTag === t ? ' hub-filter-btn--active' : ''}" data-tag="${t}">${t}</button>`).join('')}
        </div>
        <div class="hub-thread-list" id="forum-threads"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>Se încarcă…</div></div>`;

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
            list.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">💬</div>Niciun subiect. Fii primul!</div>';
            return;
        }
        list.innerHTML = threads.map(t => `
            <button class="hub-thread-item" data-id="${t.id}">
                <div class="hub-thread-avatar">${avatarHtml(t.username, t.avatar, 36)}</div>
                <div class="hub-thread-body">
                    <div class="hub-thread-title">
                        ${esc(t.title)}
                        <span class="hub-tag hub-tag--${(t.tag || 'general').toLowerCase()}">${esc(t.tag || 'General')}</span>
                    </div>
                    <div class="hub-thread-meta">
                        <span>${esc(t.username)}</span>
                        <span>${timeAgo(t.created_at)}</span>
                        <span>↑ ${t.upvotes || 0}</span>
                        <span>💬 ${t.reply_count || 0}</span>
                    </div>
                </div>
            </button>`).join('');

        list.addEventListener('click', e => {
            const item = e.target.closest('.hub-thread-item');
            if (item) openThread(+item.dataset.id);
        });
    } catch { list.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Eroare la încărcare.</div>'; }
}

/** Open a single thread with its replies and reply form */
async function openThread(id) {
    S.threadId = id;
    showView('thread');
    const v = document.getElementById('view-thread');
    v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">⏳</div>Se încarcă…</div>';

    try {
        const data = await api('GET', `/forum/${S.console}/threads/${id}`);
        if (!data.success) throw 0;
        const t = data.thread, replies = t.replies || [], u = user();

        v.innerHTML = `
            <div class="hub-view-header">
                <button class="hub-view-header__back" id="thread-back">← Înapoi</button>
                <div class="hub-view-header__title">${esc(t.title)}</div>
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
                    <div style="margin-top:10px">
                        <button class="hub-btn hub-btn--secondary hub-btn--sm" data-upvote="thread" data-id="${t.id}">↑ ${t.upvotes || 0}</button>
                    </div>
                </div>
                <div class="hub-replies-heading">Răspunsuri (${replies.length})</div>
                ${replies.map(r => `
                    <div class="hub-reply-card">
                        <div class="hub-reply-header">
                            <div class="hub-reply-avatar">${avatarHtml(r.username, r.avatar, 24)}</div>
                            <span class="hub-reply-user">${esc(r.username)}</span>
                            <span class="hub-reply-time">${timeAgo(r.created_at)}</span>
                        </div>
                        <div class="hub-reply-text">${esc(r.body)}</div>
                        <div style="padding-left:32px;margin-top:6px">
                            <button class="hub-btn hub-btn--secondary hub-btn--sm" data-upvote="reply" data-id="${r.id}">↑ ${r.upvotes || 0}</button>
                        </div>
                    </div>`).join('')}
            </div>
            ${u ? `<form class="hub-reply-form" id="thread-reply-form">
                <input type="text" placeholder="Scrie un răspuns…" maxlength="2000" required>
                <button class="hub-btn hub-btn--primary" type="submit">Trimite</button>
            </form>` : ''}`;

        v.querySelector('#thread-back').addEventListener('click', () => {
            showView('forum'); renderForum(); loadThreads();
        });

        v.querySelector('#thread-detail').addEventListener('click', async e => {
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
            const res = await api('POST', `/forum/${S.console}/threads/${id}/reply`, { body });
            if (res.success) openThread(id);
        });
    } catch { v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Eroare la încărcare.</div>'; }
}

/** Open modal dialog to create a new forum thread */
function openNewThreadModal() {
    document.querySelector('.hub-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">Subiect nou</span>
                <button class="hub-modal__close">&times;</button>
            </div>
            <form class="hub-modal__body" id="new-thread-form">
                <div class="hub-form-group">
                    <label class="hub-form-label">Titlu</label>
                    <input class="hub-form-input" name="title" maxlength="200" required placeholder="Titlul subiectului…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Tag</label>
                    <select class="hub-form-select" name="tag">
                        ${TAGS.filter(t => t !== 'All').map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Mesaj</label>
                    <textarea class="hub-form-textarea" name="body" maxlength="5000" required rows="5" placeholder="Scrie aici…"></textarea>
                </div>
                <div class="hub-modal__footer" style="padding:0;border:none">
                    <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Anulează</button>
                    <button type="submit" class="hub-btn hub-btn--primary">Publică</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
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
        if (res.success) { close(); loadThreads(); }
        else { btn.disabled = false; alert(res.error || 'Eroare.'); }
    });
}

/* ================================================================
   MARKETPLACE
   ================================================================ */

/** Render the marketplace view: listing grid, filters, add button */
function renderMarketplace() {
    const v = document.getElementById('view-marketplace');
    const u = user();

    v.innerHTML = `
        <div class="hub-view-header">
            <div class="hub-view-header__title">🛒 Marketplace</div>
            <div style="display:flex;gap:8px">
                ${u ? '<button class="hub-btn hub-btn--primary hub-market-add-btn" id="market-add-btn"><span class="hub-market-add-btn__text">+ Anunț nou</span><span class="hub-market-add-btn__icon">+</span></button>' : ''}
                ${u ? '<button class="hub-btn hub-btn--secondary" id="market-dm-btn">💬 Mesaje</button>' : ''}
            </div>
        </div>
        <div class="hub-market-filters">
            <input class="hub-market-search" id="market-search" placeholder="Caută anunțuri…">
            <select class="hub-market-select" id="market-condition">
                <option value="">Stare: Toate</option>
                ${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
            </select>
            <select class="hub-market-select" id="market-sort">
                <option value="newest">Cele mai noi</option>
                <option value="oldest">Cele mai vechi</option>
                <option value="price_asc">Preț ↑</option>
                <option value="price_desc">Preț ↓</option>
            </select>
        </div>
        <div class="hub-market-grid" id="market-grid"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>Se încarcă…</div></div>
        <div class="hub-market-pagination" id="market-pagination"></div>`;

    let timer;
    v.querySelector('#market-search').addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => { S.marketSearch = e.target.value.trim(); S.marketPage = 1; loadListings(); }, 300);
    });
    v.querySelector('#market-condition').addEventListener('change', e => { S.marketCondition = e.target.value; S.marketPage = 1; loadListings(); });
    v.querySelector('#market-sort').addEventListener('change', e => { S.marketSort = e.target.value; S.marketPage = 1; loadListings(); });
    v.querySelector('#market-add-btn')?.addEventListener('click', openAddListingModal);
    v.querySelector('#market-dm-btn')?.addEventListener('click', () => navigate('dm'));
}

/** Fetch and display marketplace listings with condition/category filters */
async function loadListings() {
    const grid = document.getElementById('market-grid');
    const pag  = document.getElementById('market-pagination');

    // Load favorite IDs if user is logged in
    const u = user();
    if (u) {
        try {
            const favData = await api('GET', '/marketplace/favorites/ids');
            if (favData.success) S.favoriteIds = new Set(favData.ids);
        } catch {}
    }

    try {
        const p = new URLSearchParams();
        if (S.category)        p.set('category',  S.category);
        if (S.marketCondition) p.set('condition',  S.marketCondition);
        if (S.marketSearch)    p.set('search',     S.marketSearch);
        p.set('sort', S.marketSort);
        p.set('page', S.marketPage);

        const data = await api('GET', '/marketplace/listings?' + p);
        if (!data.success) throw 0;
        const listings = data.listings || [];

        if (!listings.length) {
            grid.innerHTML = `<div class="hub-empty" style="grid-column:1/-1"><div class="hub-empty__icon">🛒</div>Niciun anunț${S.marketSearch ? ' pentru „' + esc(S.marketSearch) + '"' : ''}.</div>`;
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
                        ${l.sold ? '<div class="hub-listing-sold-overlay"><span class="hub-listing-sold-badge">VÂNDUT</span></div>' : ''}
                        <span class="hub-listing-fav-btn${isFav ? ' hub-listing-fav-btn--active' : ''}" data-fav-id="${l.id}" title="${u ? (isFav ? 'Elimină din favorite' : 'Adaugă la favorite') : 'Autentifică-te pentru favorite'}">
                            ${isFav ? '❤️' : '🤍'}
                        </span>
                    </div>
                    <div class="hub-listing-info">
                        <div class="hub-listing-info__top"><span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span></div>
                        <div class="hub-listing-info__title">${esc(l.title)}</div>
                        <div class="hub-listing-info__price">${Number(l.price).toFixed(0)} RON</div>
                        <div class="hub-listing-info__seller">${esc(l.seller_name)}${l.location ? ' · ' + esc(l.location) : ''}</div>
                    </div>
                </button>`;
        }).join('');

        // Favorite button click handler
        grid.addEventListener('click', async e => {
            const favBtn = e.target.closest('.hub-listing-fav-btn');
            if (favBtn) {
                e.stopPropagation();
                if (!u) { alert('Autentifică-te pentru favorite'); return; }
                const lid = +favBtn.dataset.favId;
                favBtn.classList.add('hub-listing-fav-btn--pop');
                const res = await api('POST', `/marketplace/listings/${lid}/favorite`);
                if (res.success) {
                    if (res.favorited) { S.favoriteIds.add(lid); favBtn.innerHTML = '❤️'; favBtn.classList.add('hub-listing-fav-btn--active'); }
                    else { S.favoriteIds.delete(lid); favBtn.innerHTML = '🤍'; favBtn.classList.remove('hub-listing-fav-btn--active'); }
                }
                setTimeout(() => favBtn.classList.remove('hub-listing-fav-btn--pop'), 300);
                return;
            }
            const c = e.target.closest('.hub-listing-card');
            if (c) openListingDetail(+c.dataset.id);
        });

        const total = data.totalPages || 1;
        pag.innerHTML = total > 1
            ? Array.from({ length: total }, (_, i) => i + 1).map(pg =>
                `<button class="hub-page-btn${pg === S.marketPage ? ' hub-page-btn--active' : ''}" data-page="${pg}">${pg}</button>`).join('')
            : '';
        pag.addEventListener('click', e => {
            const b = e.target.closest('.hub-page-btn');
            if (b) { S.marketPage = +b.dataset.page; loadListings(); }
        });
    } catch { grid.innerHTML = '<div class="hub-empty" style="grid-column:1/-1"><div class="hub-empty__icon">❌</div>Eroare la încărcare.</div>'; }
}

/** Open listing detail view with contact/DM options */
async function openListingDetail(id) {
    S.listingId = id;
    showView('listing');
    const v = document.getElementById('view-listing');
    v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">⏳</div>Se încarcă…</div>';

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
                                    <button class="hub-gallery-arrow hub-gallery-arrow--left" id="gallery-prev" aria-label="Imaginea anterioară">‹</button>
                                    <button class="hub-gallery-arrow hub-gallery-arrow--right" id="gallery-next" aria-label="Imaginea următoare">›</button>
                                    <span class="hub-gallery-counter" id="gallery-counter">1 / ${imgs.length}</span>` : ''}
                            </div>
                            ${imgs.length > 1 ? `<div class="hub-detail-thumbs">${imgs.map((im, i) =>
                                `<button class="hub-detail-thumb${i === 0 ? ' hub-detail-thumb--active' : ''}" data-idx="${i}"><img src="${esc(im)}" alt=""></button>`).join('')}</div>` : ''}
                        </div>` : `
                        <div class="hub-detail-gallery">
                            <div class="hub-detail-main-img hub-detail-main-img--placeholder">
                                <span class="hub-placeholder-icon">🖼️</span>
                                <span class="hub-placeholder-text">Fără fotografii</span>
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
                                <button class="hub-detail-fav-btn${isFavDetail ? ' hub-detail-fav-btn--active' : ''}" id="detail-fav-btn" title="${u ? (isFavDetail ? 'Elimină din favorite' : 'Adaugă la favorite') : 'Autentifică-te pentru favorite'}">
                                    ${isFavDetail ? '❤️' : '🤍'}
                                </button>
                            </div>
                            <div class="hub-detail-desc" style="margin-top:16px">${esc(l.description)}</div>
                            ${l.location ? `<div class="hub-detail-location" style="margin-top:10px">📍 ${esc(l.location)}</div>` : ''}
                            <div class="hub-detail-date" style="margin-top:6px">Publicat ${timeAgo(l.created_at)}</div>
                        </div>
                    </div>
                    <div class="hub-detail-card hub-detail-card--seller">
                        <div class="hub-detail-seller-avatar">${l.seller_avatar ? `<img src="${esc(l.seller_avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ini(l.seller_name)}</div>
                        <div style="flex:1">
                            <div style="color:var(--text-light);font-weight:600">${esc(l.seller_name)}</div>
                            <div style="color:var(--text-gray);font-size:.78rem">Vânzător</div>
                        </div>
                        ${u && !own ? '<button class="hub-btn hub-btn--primary" id="listing-dm-btn">💬 Contactează</button>' : ''}
                    </div>
                    <div class="hub-detail-actions">
                        ${l.phone   ? `<a href="tel:${esc(l.phone)}" class="hub-btn hub-btn--secondary">📞 ${esc(l.phone)}</a>` : ''}
                        ${l.olx_url ? `<a href="${esc(l.olx_url)}" target="_blank" rel="noopener noreferrer" class="hub-btn hub-btn--secondary">🔗 OLX</a>` : ''}
                        ${own && !l.sold ? '<button class="hub-btn hub-btn--primary" id="listing-sold-btn">✓ Marchează vândut</button>' : ''}
                        ${own ? '<button class="hub-btn hub-btn--danger" id="listing-del-btn">Șterge</button>' : ''}
                    </div>
                    <div class="hub-similar-section" id="similar-section">
                        <h3 class="hub-similar-section__title">📋 Anunțuri similare</h3>
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
                <button class="hub-lightbox__close" aria-label="Închide">✕</button>
                <span class="hub-lightbox__counter">${lbIdx + 1} / ${images.length}</span>
                <img class="hub-lightbox__img" src="${images[lbIdx]}" alt="">
                ${images.length > 1 ? `
                    <button class="hub-lightbox__arrow hub-lightbox__arrow--left" aria-label="Anterior">‹</button>
                    <button class="hub-lightbox__arrow hub-lightbox__arrow--right" aria-label="Următorul">›</button>` : ''}`;
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

        v.querySelector('#listing-dm-btn')?.addEventListener('click', () => {
            S.dmPartner = l.seller_id;
            navigate('dm');
            setTimeout(() => openConversation(l.seller_id, l.seller_name), 250);
        });

        v.querySelector('#listing-sold-btn')?.addEventListener('click', async () => {
            if ((await api('PATCH', `/marketplace/listings/${id}/sold`)).success) openListingDetail(id);
        });

        v.querySelector('#listing-del-btn')?.addEventListener('click', async () => {
            if (!(await confirmModal('Sigur vrei să ștergi acest anunț?'))) return;
            if ((await api('DELETE', `/marketplace/listings/${id}`)).success) { showView('marketplace'); renderMarketplace(); loadListings(); }
        });

        // Favorite toggle on detail page
        v.querySelector('#detail-fav-btn')?.addEventListener('click', async () => {
            if (!u) { alert('Autentifică-te pentru favorite'); return; }
            const btn = v.querySelector('#detail-fav-btn');
            btn.classList.add('hub-detail-fav-btn--pop');
            const res = await api('POST', `/marketplace/listings/${id}/favorite`);
            if (res.success) {
                if (res.favorited) { S.favoriteIds.add(id); btn.innerHTML = '❤️'; btn.classList.add('hub-detail-fav-btn--active'); }
                else { S.favoriteIds.delete(id); btn.innerHTML = '🤍'; btn.classList.remove('hub-detail-fav-btn--active'); }
            }
            setTimeout(() => btn.classList.remove('hub-detail-fav-btn--pop'), 300);
        });

        // Load similar listings
        loadSimilarListings(id, v);

    } catch { v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Eroare la încărcare.</div>'; }
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
                        <span class="hub-listing-fav-btn${isFav ? ' hub-listing-fav-btn--active' : ''}" data-fav-id="${l.id}" title="${u ? (isFav ? 'Elimină din favorite' : 'Adaugă la favorite') : 'Autentifică-te pentru favorite'}">
                            ${isFav ? '❤️' : '🤍'}
                        </span>
                    </div>
                    <div class="hub-listing-info">
                        <div class="hub-listing-info__top"><span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span></div>
                        <div class="hub-listing-info__title">${esc(l.title)}</div>
                        <div class="hub-listing-info__price">${Number(l.price).toFixed(0)} RON</div>
                        <div class="hub-listing-info__seller">${esc(l.seller_name)}${l.location ? ' · ' + esc(l.location) : ''}</div>
                    </div>
                </button>`;
        }).join('');

        // Click handlers for similar listing cards
        grid.addEventListener('click', async e => {
            const favBtn = e.target.closest('.hub-listing-fav-btn');
            if (favBtn) {
                e.stopPropagation();
                if (!u) { alert('Autentifică-te pentru favorite'); return; }
                const lid = +favBtn.dataset.favId;
                favBtn.classList.add('hub-listing-fav-btn--pop');
                const res = await api('POST', `/marketplace/listings/${lid}/favorite`);
                if (res.success) {
                    if (res.favorited) { S.favoriteIds.add(lid); favBtn.innerHTML = '❤️'; favBtn.classList.add('hub-listing-fav-btn--active'); }
                    else { S.favoriteIds.delete(lid); favBtn.innerHTML = '🤍'; favBtn.classList.remove('hub-listing-fav-btn--active'); }
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
    document.querySelector('.hub-modal-overlay')?.remove();

    const MAX_IMAGES = 8;
    let selectedFiles = [];

    const overlay = document.createElement('div');
    overlay.className = 'hub-modal-overlay';
    overlay.innerHTML = `
        <div class="hub-modal">
            <div class="hub-modal__header">
                <span class="hub-modal__title">Anunț nou</span>
                <button class="hub-modal__close">&times;</button>
            </div>
            <form class="hub-modal__body" id="new-listing-form">
                <div class="hub-form-group">
                    <label class="hub-form-label">Titlu</label>
                    <input class="hub-form-input" name="title" maxlength="200" required placeholder="Ce vinzi?">
                </div>
                <div class="hub-form-row">
                    <div class="hub-form-group">
                        <label class="hub-form-label">Preț (RON)</label>
                        <input class="hub-form-input" name="price" type="number" min="0" step="1" required placeholder="0">
                    </div>
                    <div class="hub-form-group">
                        <label class="hub-form-label">Stare</label>
                        <select class="hub-form-select" name="condition">
                            ${Object.entries(CONDITIONS).map(([k, v]) => `<option value="${k}"${k === 'good' ? ' selected' : ''}>${v}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Categorie</label>
                    <select class="hub-form-select" name="category">
                        ${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
                    </select>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Descriere</label>
                    <textarea class="hub-form-textarea" name="description" maxlength="3000" required rows="4" placeholder="Descrie produsul…"></textarea>
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Locație</label>
                    <input class="hub-form-input" name="location" maxlength="100" required placeholder="București">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Telefon</label>
                    <input class="hub-form-input" name="phone" maxlength="20" required placeholder="+40…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Link OLX</label>
                    <input class="hub-form-input" name="olx_url" type="url" required placeholder="https://www.olx.ro/…">
                </div>
                <div class="hub-form-group">
                    <label class="hub-form-label">Imagini (max ${MAX_IMAGES} fotografii)</label>
                    <div class="hub-upload-zone" id="upload-zone">
                        <input type="file" id="upload-input" accept="image/jpeg,image/png,image/webp" multiple hidden>
                        <span class="hub-upload-zone__icon">📁</span>
                        <span class="hub-upload-zone__text">Trage fotografiile aici sau click pentru a alege</span>
                    </div>
                    <div class="hub-upload-counter" id="upload-counter">0 / ${MAX_IMAGES} imagini selectate</div>
                    <div class="hub-upload-grid" id="upload-grid"></div>
                </div>
                <div class="hub-modal__footer" style="padding:0;border:none">
                    <button type="button" class="hub-btn hub-btn--secondary hub-modal__cancel">Anulează</button>
                    <button type="submit" class="hub-btn hub-btn--primary">Publică</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector('.hub-modal__close').addEventListener('click', close);
    overlay.querySelector('.hub-modal__cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

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
        btn.textContent = 'Se publică…';

        const imageUrls = await Promise.all(selectedFiles.map(resizeImage));

        const res = await api('POST', '/marketplace/listings', {
            title: f.title.value.trim(),
            description: f.description.value.trim(),
            price: parseFloat(f.price.value),
            condition: f.condition.value,
            category: f.category.value,
            location: f.location.value.trim(),
            phone: f.phone.value.trim(),
            olx_url: f.olx_url.value.trim(),
            images: imageUrls,
        });
        if (res.success) { close(); loadListings(); }
        else { btn.disabled = false; btn.textContent = 'Publică'; alert(res.error || 'Eroare.'); }
    });
}

/* ================================================================
   REPAIR WIZARD
   ================================================================ */

/** Render the repair wizard: symptom checkboxes, console selector */
function renderRepair() {
    const v = document.getElementById('view-repair');
    const cName = CONSOLES.find(c => c.id === S.console)?.name || S.console;
    const step = S.repairStep;

    const bars = [0, 1, 2, 3].map(i =>
        `<div class="hub-repair-progress__bar${i <= step ? ' hub-repair-progress__bar--done' : ''}"></div>`).join('');

    let body = '';

    if (step === 0) {
        const hasCustom = S.repairSymptoms.includes('__custom__');
        const canProceed = S.repairSymptoms.length > 0 && (!hasCustom || S.repairCustomProblem.trim());
        body = `
            <div class="hub-repair-question">Ce simptome are consola ta ${esc(cName)}?</div>
            <div class="hub-repair-hint">Selectează unul sau mai multe simptome:</div>
            <div class="hub-symptom-grid">
                ${SYMPTOMS.map(s => `<button class="hub-symptom-btn${S.repairSymptoms.includes(s) ? ' hub-symptom-btn--selected' : ''}" data-s="${esc(s)}">${esc(s)}</button>`).join('')}
                <button class="hub-symptom-btn hub-symptom-btn--custom${hasCustom ? ' hub-symptom-btn--selected' : ''}" id="repair-custom-btn">✏️ Altă problemă</button>
            </div>
            ${hasCustom ? `<div class="hub-repair-custom-wrap">
                <textarea class="hub-repair-textarea" id="repair-custom-text" rows="4" maxlength="500" placeholder="Descrie problema ta…">${esc(S.repairCustomProblem)}</textarea>
                <div class="hub-repair-char-count"><span id="repair-custom-count">${S.repairCustomProblem.length}</span> / 500</div>
            </div>` : ''}
            <button class="hub-btn hub-btn--primary" id="repair-next"${canProceed ? '' : ' disabled'}>Continuă →</button>`;
    } else if (step === 1) {
        body = `
            <div class="hub-repair-question">Descrie problema mai detaliat</div>
            <div class="hub-repair-hint">Include: când a apărut, ce ai încercat, modelul consolei</div>
            <textarea class="hub-repair-textarea" id="repair-desc" rows="6" maxlength="2000" placeholder="Descrie aici…">${esc(S.repairDesc)}</textarea>
            <div style="display:flex;gap:8px">
                <button class="hub-btn hub-btn--secondary" id="repair-prev">← Înapoi</button>
                <button class="hub-btn hub-btn--primary" id="repair-next">Analizează →</button>
            </div>`;
    } else if (step === 2) {
        if (!S.repairResult) {
            body = '<div class="hub-empty"><div class="hub-empty__icon">🔍</div>Se analizează…</div>';
        } else {
            const r = S.repairResult;
            const sevLabel = r.severity === 'high' ? '🔴 Sever' : r.severity === 'medium' ? '🟡 Moderat' : '🟢 Minor';
            body = `
                <div class="hub-repair-question">Diagnostic</div>
                <div class="hub-repair-result">
                    <span class="hub-tag hub-severity--${r.severity}">${sevLabel}</span>
                    <div style="color:var(--text-light);font-size:.9rem;line-height:1.5">${esc(r.diagnosis)}</div>
                    ${r.recommendation ? `<div style="color:var(--text-gray);font-size:.84rem">${esc(r.recommendation)}</div>` : ''}
                    <div class="hub-repair-cost-grid">
                        <div class="hub-repair-cost-box">
                            <div class="hub-repair-cost-label">Cost estimat</div>
                            <div class="hub-repair-cost-value">${r.estimated_cost_min} – ${r.estimated_cost_max} RON</div>
                        </div>
                        <div class="hub-repair-cost-box">
                            <div class="hub-repair-cost-label">Timp estimat</div>
                            <div class="hub-repair-cost-value">${esc(r.estimated_time)}</div>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="hub-btn hub-btn--secondary" id="repair-prev">← Înapoi</button>
                    <button class="hub-btn hub-btn--primary" id="repair-submit">Trimite cererea</button>
                </div>`;
        }
    } else {
        body = `
            <div class="hub-repair-success">
                <div class="hub-repair-success__icon">✅</div>
                <div style="color:var(--text-light);font-size:1.1rem;font-weight:600">Cererea a fost trimisă!</div>
                <div style="color:var(--text-gray);font-size:.88rem">Vei fi contactat de un specialist.</div>
                <button class="hub-btn hub-btn--secondary" id="repair-new" style="margin-top:16px">Cerere nouă</button>
            </div>`;
    }

    v.innerHTML = `
        <div class="hub-view-header"><div class="hub-view-header__title">🔧 ${esc(cName)} — Reparație</div></div>
        <div class="hub-repair-progress">${bars}</div>
        <div class="hub-repair-body"><div class="hub-repair-inner">${body}</div></div>`;

    // Events per step
    if (step === 0) {
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
        v.querySelector('#repair-next')?.addEventListener('click', () => { S.repairStep = 1; renderRepair(); });
    }
    if (step === 1) {
        v.querySelector('#repair-desc').addEventListener('input', e => { S.repairDesc = e.target.value; });
        v.querySelector('#repair-prev').addEventListener('click', () => { S.repairStep = 0; renderRepair(); });
        v.querySelector('#repair-next').addEventListener('click', analyzeRepair);
    }
    if (step === 2 && S.repairResult) {
        v.querySelector('#repair-prev')?.addEventListener('click', () => { S.repairStep = 1; renderRepair(); });
        v.querySelector('#repair-submit')?.addEventListener('click', submitRepair);
    }
    if (step === 3) {
        v.querySelector('#repair-new')?.addEventListener('click', () => {
            Object.assign(S, { repairStep: 0, repairSymptoms: [], repairDesc: '', repairResult: null, repairCustomProblem: '' });
            renderRepair();
        });
    }
}

/** Send selected symptoms to repair diagnosis API */
async function analyzeRepair() {
    S.repairStep = 2; S.repairResult = null; renderRepair();
    try {
        const data = await api('POST', '/repair/analyze', {
            console: S.console,
            symptoms: S.repairSymptoms.filter(s => s !== '__custom__'),
            description: S.repairDesc,
            customProblem: S.repairCustomProblem || undefined,
        });
        if (data.success) { S.repairResult = data.analysis; renderRepair(); }
        else throw 0;
    } catch { S.repairStep = 1; renderRepair(); alert('Eroare la analiză.'); }
}

/** Submit the analyzed repair request for storage */
async function submitRepair() {
    if (!S.repairResult?.id) return;
    try {
        const data = await api('POST', `/repair/${S.repairResult.id}/submit`);
        if (data.success) { S.repairStep = 3; renderRepair(); }
    } catch { alert('Eroare la trimitere.'); }
}

/* ================================================================
   DIRECT MESSAGES
   ================================================================ */

/** Render the direct messages view: conversation list + chat panel */
function renderDM() {
    const v = document.getElementById('view-dm');
    if (!user()) {
        v.innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">🔒</div>Trebuie să fii autentificat.<br><a href="login.html" style="color:var(--accent-color)">Conectare</a></div>';
        return;
    }
    v.innerHTML = `
        <div class="hub-dm-layout">
            <div class="hub-dm-list" id="dm-list"><div class="hub-dm-list__empty">Se încarcă…</div></div>
            <div class="hub-dm-thread" id="dm-thread"><div class="hub-dm-empty">Selectează o conversație</div></div>
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

        if (!convs.length) { list.innerHTML = '<div class="hub-dm-list__empty">Nicio conversație</div>'; return; }

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
    } catch { list.innerHTML = '<div class="hub-dm-list__empty">Eroare la încărcare</div>'; }
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

    const u = user();
    thread.innerHTML = `
        <div class="hub-dm-thread__header">
            <div class="hub-dm-conv__avatar" style="width:30px;height:30px;font-size:.7rem">${avatarHtml(partnerName, partnerAvatar, 30)}</div>
            <span style="color:var(--text-light);font-weight:600;font-size:.9rem">${esc(partnerName || 'Utilizator')}</span>
        </div>
        <div class="hub-dm-messages" id="dm-messages"><div class="hub-empty"><div class="hub-empty__icon">⏳</div>Se încarcă…</div></div>
        <form class="hub-dm-form" id="dm-form">
            <input class="hub-dm-form__input" type="text" placeholder="Scrie un mesaj…" maxlength="2000" required>
            <button class="hub-btn hub-btn--primary" type="submit">Trimite</button>
        </form>`;

    try {
        const data = await api('GET', `/dm/messages/${partnerId}`);
        const msgs = data.messages || [];
        const el = document.getElementById('dm-messages');
        if (!msgs.length) {
            el.innerHTML = '<div class="hub-dm-empty" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-gray)">Trimite primul mesaj</div>';
        } else {
            el.innerHTML = msgs.map(m => `
                <div class="hub-dm-msg ${m.sender_id === u.id ? 'hub-dm-msg--mine' : 'hub-dm-msg--theirs'}">
                    ${esc(m.message)}
                    <div class="hub-dm-msg__time">${timeAgo(m.created_at)}</div>
                </div>`).join('');
            el.scrollTop = el.scrollHeight;
        }
    } catch {
        document.getElementById('dm-messages').innerHTML = '<div class="hub-empty"><div class="hub-empty__icon">❌</div>Eroare.</div>';
    }

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
            div.innerHTML = `${esc(msg)}<div class="hub-dm-msg__time">acum</div>`;
            el.appendChild(div);
            el.scrollTop = el.scrollHeight;
        }
    });
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
   NOTIFICATIONS UI
   ================================================================ */

/** Initialize notification bell: dropdown, badge polling, mark-read */
function initNotifications() {
    const toggle = document.getElementById('hub-notif-toggle');
    const dropdown = document.getElementById('hub-notif-dropdown');
    const badge = document.getElementById('hub-notif-badge');
    const list = document.getElementById('hub-notif-list');
    const readAllBtn = document.getElementById('notif-read-all');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', e => {
        e.stopPropagation();
        const open = !dropdown.hidden;
        dropdown.hidden = open;
        if (!open) loadNotifications();
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
        if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== toggle) {
            dropdown.hidden = true;
        }
    });

    readAllBtn?.addEventListener('click', async () => {
        await api('POST', '/notifications/read-all');
        list.querySelectorAll('.hub-notif-item--unread').forEach(el => el.classList.remove('hub-notif-item--unread'));
        badge.hidden = true;
    });

    async function loadNotifications() {
        try {
            const data = await api('GET', '/notifications');
            if (!data.success) return;
            const items = data.notifications || [];
            if (!items.length) {
                list.innerHTML = '<div class="hub-notif-empty">Nicio notificare</div>';
                return;
            }
            list.innerHTML = items.map(n => `
                <div class="hub-notif-item ${n.read ? '' : 'hub-notif-item--unread'}" data-nid="${n.id}">
                    <div class="hub-notif-item__text">${esc(n.message)}</div>
                    <div class="hub-notif-item__time">${timeAgo(n.created_at)}</div>
                </div>`).join('');

            list.addEventListener('click', async e => {
                const item = e.target.closest('.hub-notif-item');
                if (!item) return;
                item.classList.remove('hub-notif-item--unread');
                await api('POST', `/notifications/${item.dataset.nid}/read`);
            });
        } catch { list.innerHTML = '<div class="hub-notif-empty">Eroare</div>'; }
    }

    // Poll unread count
    async function pollBadge() {
        if (!user()) return;
        try {
            const d = await api('GET', '/notifications/unread-count');
            if (d.success && d.count > 0) { badge.textContent = d.count; badge.hidden = false; }
            else badge.hidden = true;
        } catch { /* ignore */ }
    }
    pollBadge();
    setInterval(pollBadge, 20000);
}

/* ================================================================
   BOOT
   ================================================================ */

initSidebar();
startUnreadPolling();
initNotifications();
