import { I18nModule } from './i18n.js';
import { AuthModule } from './auth.js';
import { AchievementsModule } from './achievements.js';

function normalizeAvatarUrl(avatarUrl, preferredSize = 1024) {
    const raw = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    if (!raw || raw.startsWith('data:')) return raw;
    if (!/googleusercontent\.com|ggpht\.com/i.test(raw)) return raw;

    let upgraded = raw
        .replace(/[?&]sz=\d+/i, (m) => m.charAt(0) + 'sz=' + preferredSize)
        .replace(/=s\d{2,4}(-c)?(?=&|$)/i, '=s' + preferredSize + '-c')
        .replace(/\/s\d{2,4}(-c)?(?=\/)/i, '/s' + preferredSize + '-c');

    if (upgraded === raw && !/[?&]sz=\d+/i.test(raw)) {
        upgraded += (raw.includes('?') ? '&' : '?') + 'sz=' + preferredSize;
    }
    return upgraded;
}

document.addEventListener('DOMContentLoaded', async () => {

    // =========================
    // SESSION
    // =========================
    let currentUser = null;
    try {
        const raw = localStorage.getItem('cn_session');
        if (raw) currentUser = JSON.parse(raw);
    } catch {}

    // If local session is missing or incomplete, rebuild it from a valid token.
    if (!currentUser || !currentUser.id || !currentUser.username || String(currentUser.username).toLowerCase() === 'user') {
        const restoredUser = await AuthModule.refreshSession();
        if (restoredUser) {
            currentUser = AuthModule.getCurrentUser() || restoredUser;
        }
    }

    if (!currentUser) return;

    const username = currentUser.username || currentUser.email || 'user';

    // =========================
    // API HELPER
    // =========================
    async function apiFetch(url, options = {}) {
        try {
            const token = localStorage.getItem('cn_token');
            const res = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                credentials: 'include'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error('API error:', err);
            return { success: false };
        }
    }

    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // =========================
    // SIDEBAR — User info
    // =========================
    function renderSidebar(user) {
        const nameEl = document.getElementById('profile-name');
        const bioEl = document.getElementById('profile-bio');
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarFallback = document.getElementById('profile-avatar-fallback');
        const adminBadge = document.getElementById('profile-admin-badge');

        if (nameEl) nameEl.textContent = user.username || currentUser.username;
        if (bioEl) bioEl.textContent = user.bio || currentUser.bio || '';

        if (avatarImg && avatarFallback) {
            const avatar = normalizeAvatarUrl(user.avatar || currentUser.avatar || '');
            if (avatar) {
                avatarImg.src = avatar;
                avatarImg.hidden = false;
                avatarFallback.hidden = true;
            }
        }

        if (adminBadge && (user.role === 'admin' || currentUser.role === 'admin')) {
            adminBadge.hidden = false;
        }

        // Level badge
        let levelEl = document.getElementById('profile-level');
        if (!levelEl) {
            levelEl = document.createElement('span');
            levelEl.id = 'profile-level';
            levelEl.className = 'profile-level-badge';
            const onlineDot = document.querySelector('.profile-online-dot');
            if (onlineDot) onlineDot.after(levelEl);
            else if (nameEl && nameEl.parentElement) nameEl.parentElement.appendChild(levelEl);
        }
        const storedLevel = (() => { try { return JSON.parse(localStorage.getItem('cn_user_level') || 'null'); } catch { return null; } })();
        if (storedLevel && levelEl) {
            levelEl.textContent = `${storedLevel.emoji} ${storedLevel.name}`;
            levelEl.hidden = false;
        }

        // Edit shortcuts → go to settings
        const editNameBtn = document.getElementById('edit-username-shortcut');
        const editBioBtn = document.getElementById('edit-bio-shortcut');
        if (editNameBtn) editNameBtn.addEventListener('click', () => { window.location.href = 'profil.html#account'; });
        if (editBioBtn) editBioBtn.addEventListener('click', () => { window.location.href = 'profil.html#account'; });

        // Avatar click → go to profile settings
        const avatarBtn = document.getElementById('profile-avatar');
        if (avatarBtn) avatarBtn.addEventListener('click', () => { window.location.href = 'profil.html#profil'; });
    }

    // =========================
    // WELCOME
    // =========================
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle) welcomeTitle.textContent = username;

    // Set hero date
    const dateEl = document.getElementById('home-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        }).toUpperCase();
    }

    // =========================
    // DASHBOARD DATA
    // =========================
    // getLocalAchievements removed. Use AchievementsModule.BADGES if needed for static badge info.

    // Inițializare dashboard la încărcare
    await populateDashboard();

    // Re-populează dashboard la schimbarea panelului (hashchange)
    window.addEventListener('hashchange', () => {
        populateDashboard();
    });

    async function populateDashboard() {
        try {
            const userRes = await apiFetch(`/api/users/${encodeURIComponent(username)}`);
            if (!userRes.success) throw new Error('User fetch failed');

            const user = userRes.user;

            // Render sidebar with user data
            renderSidebar(user);

            // parallel fetch
            const [ratingsRes, favoritesRes, friendsRes, friendRequestsRes, forumRes, myPostsRes, likedPostsRes, achievementsRes, starterProgressRes, visitedRes, myListingsRes, favListingsRes] = await Promise.all([
                apiFetch('/api/ratings/user/all'),
                apiFetch('/api/favorites'),
                apiFetch('/api/friends'),
                apiFetch('/api/friends/requests'),
                apiFetch('/api/forum/recent'),
                apiFetch('/api/forum/my-posts'),
                apiFetch('/api/forum/liked'),
                apiFetch('/api/achievements'),
                apiFetch('/api/courses/starter-guide/progress'),
                apiFetch('/api/consoles/visited'),
                apiFetch('/api/marketplace/listings/mine'),
                apiFetch('/api/marketplace/favorites'),
            ]);

            // =========================
            // PROGRESS — real course data
            // =========================
            {
                const sp = starterProgressRes;
                const totalLessons = sp && sp.total_lessons > 0 ? sp.total_lessons : 0;
                const completedIds = sp && Array.isArray(sp.completed_lesson_ids) ? sp.completed_lesson_ids : [];
                const doneCount = completedIds.length;
                const lastId = sp && sp.last_lesson_id;
                const courseComplete = sp && sp.course_completed;
                const pct = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;
                const CIRC = 2 * Math.PI * 42;

                const continueHref = courseComplete
                    ? 'course.html?slug=starter-guide'
                    : lastId
                        ? `lesson.html?id=${lastId}&slug=starter-guide`
                        : 'course.html?slug=starter-guide';

                // Hero continue-card
                const continueProgress = document.getElementById('continue-progress');
                const activeProgress = document.getElementById('active-progress');
                const continueTitle = document.getElementById('home-continue-title');
                const homeContinueBtn = document.getElementById('home-continue-btn');
                if (continueTitle) continueTitle.textContent = sp && sp.course_title ? sp.course_title : 'Console Starter Guide';
                if (continueProgress) continueProgress.textContent = totalLessons > 0 ? `${doneCount}/${totalLessons}` : '—';
                if (activeProgress) setTimeout(() => { activeProgress.style.width = pct + '%'; }, 80);
                if (homeContinueBtn) {
                    homeContinueBtn.href = continueHref;
                    homeContinueBtn.textContent = courseComplete ? 'Review →' : doneCount > 0 ? 'Continue →' : 'Start →';
                }

                // Progress ring (progress panel)
                const progressRingArc = document.getElementById('progress-ring-arc');
                const progressRingPct = document.getElementById('progress-ring-pct');
                const progressContinueText = document.getElementById('progress-continue-text');
                const progressBarFill = document.getElementById('progress-bar-fill');
                const progressPanelBtn = document.getElementById('progress-panel-continue-btn');
                const progressPanelTitle = document.getElementById('progress-panel-title');
                if (progressPanelTitle) progressPanelTitle.textContent = sp && sp.course_title ? sp.course_title : 'Console Starter Guide';
                if (progressRingArc) {
                    progressRingArc.style.strokeDasharray = CIRC;
                    setTimeout(() => { progressRingArc.style.strokeDashoffset = CIRC * (1 - pct / 100); }, 80);
                }
                if (progressRingPct) progressRingPct.textContent = pct + '%';
                if (progressContinueText) progressContinueText.textContent = totalLessons > 0 ? `${doneCount}/${totalLessons} lessons` : '—';
                if (progressBarFill) setTimeout(() => { progressBarFill.style.width = pct + '%'; }, 80);
                if (progressPanelBtn) {
                    progressPanelBtn.href = continueHref;
                    progressPanelBtn.textContent = courseComplete ? '✓ Review course' : doneCount > 0 ? '▶ Continue' : '▶ Start course';
                }


                // Milestones
                const milestonesEl = document.getElementById('progress-milestones');
                if (milestonesEl) {
                    const m = (done, label) =>
                        `<div class="milestone-item${done ? ' milestone-item--done' : ''}">
                            <span class="milestone-dot"></span>
                            <span class="milestone-label">${label}</span>
                        </div>`;
                    milestonesEl.innerHTML =
                        m(true,            'Created your account') +
                        m(doneCount > 0,   'Started first lesson') +
                        m(doneCount >= 10, 'Completed 10 lessons') +
                        m(doneCount >= 20, 'Completed 20 lessons') +
                        m(courseComplete,  'Finished your first course');
                }
            }

            // =========================
            // STATS
            // =========================
            if (ratingsRes.success) {
                setStat('stat-ratings', `<strong>${ratingsRes.ratings.length}</strong>`);
            }

            if (favoritesRes.success) {
                setStat('stat-favorites', `<strong>${favoritesRes.favorites.length}</strong>`);
            }

            if (friendsRes.success) {
                setStat('stat-friends', `<strong>${friendsRes.friends.length}</strong>`);
            }

            function setStat(id, value) {
                const el = document.getElementById(id);
                if (el) el.innerHTML = value;
            }

            // =========================
            // COLLECTION
            // =========================
            const collectionGrid = document.getElementById('collection-grid');

            if (collectionGrid && Array.isArray(user.owned_console_ids)) {
                const allConsoles = window.CONSOLES_DATA || [];

                collectionGrid.innerHTML = '';

                const emojis = ['🎮','🕹️','🔥','⚡','🌟','🎯'];

                user.owned_console_ids.forEach((cid, idx) => {
                    const c = allConsoles.find(x => x.id === cid);
                    if (!c) return;

                    const btn = document.createElement('button');
                    btn.className = 'console-card';
                    btn.dataset.console = c.name;

                    const emoji = emojis[idx % emojis.length];

                    btn.innerHTML = `${emoji} <span>${c.name}</span>`;

                    btn.addEventListener('click', () => {
                        window.location.href = `console.html?name=${encodeURIComponent(c.name)}`;
                    });

                    collectionGrid.appendChild(btn);
                });

                // Update collection count badge
                const collectionCount = document.getElementById('collection-count');
                if (collectionCount) {
                    const n = user.owned_console_ids.length;
                    collectionCount.textContent = n + (n === 1 ? ' console' : ' consoles');
                }
            }

            // =========================
            // MY LISTINGS (in collection panel)
            // =========================
            const myListingsSection = document.getElementById('my-listings-section');
            const myListingsGrid = document.getElementById('my-listings-grid');
            if (myListingsSection && myListingsGrid && myListingsRes.success && myListingsRes.listings && myListingsRes.listings.length > 0) {
                myListingsSection.hidden = false;
                renderMyListingCards(myListingsGrid, myListingsRes.listings);
            }

            function renderMyListingCards(grid, listings) {
                grid.innerHTML = listings.map(l => {
                    const imgs = Array.isArray(l.images) ? l.images : [];
                    const img = imgs[0] || '/assets/images/graphics/no-image-placeholder.jpg';
                    const isSold = l.sold || l.status === 'sold';
                    const isInactive = !isSold && l.status === 'inactive';
                    return `<div class="home-listing-card" data-id="${l.id}">
                        <a href="community.html#listing-${l.id}" class="home-listing-card__media">
                            <img src="${escapeHtml(img)}" alt="" loading="lazy">
                            ${isSold ? '<span class="home-listing-card__sold">SOLD</span>' : ''}
                            ${isInactive ? '<span class="home-listing-card__sold" style="background:rgba(100,100,100,.8)">INACTIVE</span>' : ''}
                        </a>
                        <div class="home-listing-card__info">
                            <div class="home-listing-card__title">${escapeHtml(l.title)}</div>
                            <div class="home-listing-card__price">${Number(l.price).toFixed(0)} RON</div>
                        </div>
                        <div class="home-listing-card__actions">
                            <a href="community.html#listing-${l.id}" class="hlc-btn hlc-btn--edit" title="Edit listing">✏️</a>
                            <button class="hlc-btn hlc-btn--sold" data-id="${l.id}" data-sold="${isSold}" title="${isSold ? 'Mark as unsold' : 'Mark as sold'}">
                                ${isSold ? '↩️' : '✅'}
                            </button>
                            <button class="hlc-btn hlc-btn--delete" data-id="${l.id}" title="Delete listing">🗑️</button>
                        </div>
                    </div>`;
                }).join('');

                grid.querySelectorAll('.hlc-btn--sold').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const id = btn.dataset.id;
                        const wasSold = btn.dataset.sold === 'true';
                        const newStatus = wasSold ? 'active' : 'sold';
                        const res = await apiFetch(`/api/marketplace/listings/${id}/status`, {
                            method: 'PATCH',
                            body: JSON.stringify({ status: newStatus })
                        });
                        if (res && res.success) {
                            const card = grid.querySelector(`.home-listing-card[data-id="${id}"]`);
                            if (card) {
                                const overlay = card.querySelector('.home-listing-card__sold');
                                if (newStatus === 'sold') {
                                    btn.textContent = '↩️';
                                    btn.dataset.sold = 'true';
                                    btn.title = 'Mark as unsold';
                                    if (!overlay) {
                                        const media = card.querySelector('.home-listing-card__media');
                                        const span = document.createElement('span');
                                        span.className = 'home-listing-card__sold';
                                        span.textContent = 'SOLD';
                                        media.appendChild(span);
                                    } else {
                                        overlay.textContent = 'SOLD';
                                        overlay.style.background = '';
                                    }
                                } else {
                                    btn.textContent = '✅';
                                    btn.dataset.sold = 'false';
                                    btn.title = 'Mark as sold';
                                    if (overlay) overlay.remove();
                                }
                            }
                        }
                    });
                });

                grid.querySelectorAll('.hlc-btn--delete').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        if (!confirm('Delete this listing?')) return;
                        const id = btn.dataset.id;
                        const res = await apiFetch(`/api/marketplace/listings/${id}`, { method: 'DELETE' });
                        if (res && res.success) {
                            const card = grid.querySelector(`.home-listing-card[data-id="${id}"]`);
                            if (card) { card.style.opacity = '0'; card.style.transition = 'opacity .2s'; setTimeout(() => { card.remove(); if (!grid.querySelector('.home-listing-card')) myListingsSection.hidden = true; }, 200); }
                        }
                    });
                });
            }

            // =========================
            // ACTIVITY FEED
            // =========================
            const activityList = document.getElementById('activity-list');

            if (activityList) {
                const allConsoles = window.CONSOLES_DATA || [];
                const events = [];

                // Ratings
                if (ratingsRes.success && Array.isArray(ratingsRes.ratings)) {
                    ratingsRes.ratings.forEach(r => {
                        const c = allConsoles.find(x => x.id === r.console_id);
                        if (!c) return;
                        const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
                        events.push({
                            ts: r.created_at ? new Date(r.created_at) : null,
                            icon: '⭐',
                            html: `Rated <a href="consoles/${escapeHtml(c.id)}.html"><strong>${escapeHtml(c.name)}</strong></a> <span class="activity-stars">${stars}</span>`
                        });
                    });
                }

                // Forum posts
                if (myPostsRes.success && Array.isArray(myPostsRes.posts)) {
                    myPostsRes.posts.forEach(p => {
                        events.push({
                            ts: p.created_at ? new Date(p.created_at) : null,
                            icon: '💬',
                            html: `Posted in forum: <strong>${escapeHtml(p.title)}</strong>`
                        });
                    });
                }

                // Marketplace listings
                if (myListingsRes.success && Array.isArray(myListingsRes.listings)) {
                    myListingsRes.listings.forEach(l => {
                        events.push({
                            ts: l.created_at ? new Date(l.created_at) : null,
                            icon: '🏪',
                            html: `Listed <strong>${escapeHtml(l.title)}</strong> for ${Number(l.price).toFixed(0)} RON`
                        });
                    });
                }

                // Console visits (most recent 5 only — noisy otherwise)
                if (visitedRes.success && Array.isArray(visitedRes.visits)) {
                    visitedRes.visits.slice(0, 5).forEach(v => {
                        const c = allConsoles.find(x => x.id === v.console_id);
                        if (!c) return;
                        events.push({
                            ts: v.visited_at ? new Date(v.visited_at) : null,
                            icon: '👁️',
                            html: `Visited <a href="consoles/${escapeHtml(c.id)}.html"><strong>${escapeHtml(c.name)}</strong></a>`
                        });
                    });
                }

                // Friends
                if (friendsRes.success && Array.isArray(friendsRes.friends)) {
                    friendsRes.friends.forEach(f => {
                        events.push({
                            ts: f.friends_since ? new Date(f.friends_since) : null,
                            icon: '🤝',
                            html: `Became friends with <a href="user-profile.html?u=${encodeURIComponent(f.username)}"><strong>${escapeHtml(f.username)}</strong></a>`
                        });
                    });
                }

                // Sort by timestamp descending, nulls last
                events.sort((a, b) => {
                    if (!a.ts && !b.ts) return 0;
                    if (!a.ts) return 1;
                    if (!b.ts) return -1;
                    return b.ts - a.ts;
                });

                const INITIAL_SHOW = 5;

                if (events.length === 0) {
                    activityList.innerHTML = '<li class="activity-empty">No activity yet — start exploring consoles!</li>';
                } else {
                    activityList.innerHTML = events.map((e, i) => {
                        const timeStr = e.ts ? `<time class="activity-time" title="${e.ts.toLocaleString()}">${relativeTime(e.ts)}</time>` : '';
                        const hiddenClass = i >= INITIAL_SHOW ? ' activity-hidden' : '';
                        return `<li class="${hiddenClass}"><span class="activity-icon">${e.icon}</span><span class="activity-text">${e.html}</span>${timeStr}</li>`;
                    }).join('');

                    // Remove stale button from previous render
                    const staleBtn = activityList.nextElementSibling;
                    if (staleBtn && staleBtn.classList.contains('activity-show-more')) staleBtn.remove();

                    if (events.length > INITIAL_SHOW) {
                        const btn = document.createElement('button');
                        btn.className = 'activity-show-more';
                        const remaining = events.length - INITIAL_SHOW;
                        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Show ${remaining} more`;
                        let expanded = false;
                        const extraItems = activityList.querySelectorAll('li.activity-hidden');
                        btn.addEventListener('click', () => {
                            expanded = !expanded;
                            extraItems.forEach(li => li.classList.toggle('activity-hidden', !expanded));
                            if (expanded) {
                                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg> Show less`;
                            } else {
                                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Show ${remaining} more`;
                            }
                        });
                        activityList.after(btn);
                    }
                }
            }

            function relativeTime(date) {
                const diff = Date.now() - date.getTime();
                const mins = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(diff / 86400000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                if (hours < 24) return `${hours}h ago`;
                if (days < 7) return `${days}d ago`;
                return date.toLocaleDateString();
            }

            // =========================
            // LEVEL CARD (home preview + progress panel)
            // =========================
            if (achievementsRes.success) {
                const visitedCount = Array.isArray(visitedRes?.consoles) ? visitedRes.consoles.length : 0;
                const backendBadges = AchievementsModule.getAllBadges(achievementsRes.achievements);
                const earned = backendBadges.filter(b => b.earned).length;
                const total = backendBadges.length;
                const achPct = total > 0 ? (earned / total) * 100 : 0;
                const lvl = AchievementsModule.computeLevel(achPct, visitedCount, total);



                // Home panel: mini preview (simplu)
                const homeLevelCard = document.getElementById('home-level-card');
                if (homeLevelCard) {
                    homeLevelCard.innerHTML = `<div class="level-preview"><span class="level-label">Level:</span> <span class="level-emoji">${lvl.emoji}</span> <span class="level-name">${lvl.name}</span></div>`;
                }


                // Progress panel: full level card
                const progressLevelCard = document.getElementById('progress-level-card');
                if (progressLevelCard) {
                    const nextHtml = lvl.nextLevel
                        ? `<p class="prog-level-next">Next: <strong>${lvl.nextLevel.emoji} ${lvl.nextLevel.name}</strong> — need <strong>${lvl.nextRequirements.scoreNeeded} pts</strong></p>`
                        : `<p class="prog-level-next" style="color:var(--accent-color);font-weight:600;">🏆 Max level!</p>`;
                    progressLevelCard.innerHTML = `
                        <div class="prog-level-emoji">${lvl.emoji}</div>
                        <p class="prog-level-name">${lvl.name}</p>
                        <p class="prog-level-desc">${lvl.description}</p>
                        <div class="prog-level-score-bar">
                            <span class="prog-level-score-label">Score: <strong>${lvl.score}</strong> / 100</span>
                            <div class="prog-level-bar-track">
                                <div class="prog-level-bar-fill" style="width:0%"></div>
                            </div>
                        </div>
                        ${nextHtml}
                    `;
                    setTimeout(() => {
                        const fill = progressLevelCard.querySelector('.prog-level-bar-fill');
                        if (fill) fill.style.width = lvl.score + '%';
                    }, 100);
                }

                // Save to localStorage pentru alte pagini
                localStorage.setItem('cn_user_level', JSON.stringify({ name: lvl.name, emoji: lvl.emoji }));
            }

            // =========================
            // ACHIEVEMENTS
            // =========================
            if (achievementsRes.success) {
                const earned = achievementsRes.achievements.filter(a => a.unlocked).length;
                const total_ach = achievementsRes.achievements.length;
                setStat('stat-achievements', `<strong>${earned}</strong> / <strong>${total_ach}</strong>`);

                // Update achievements count badge and progress bar
                const achievementsCount = document.getElementById('achievements-count');
                if (achievementsCount) achievementsCount.textContent = `${earned} / ${total_ach}`;
                const achievementsProgressFill = document.getElementById('achievements-progress-fill');
                if (achievementsProgressFill) achievementsProgressFill.style.width = `${total_ach > 0 ? Math.round((earned / total_ach) * 100) : 0}%`;

                const achievementsGrid = document.getElementById('achievements-grid');
                if (achievementsGrid) {
                    achievementsGrid.innerHTML = '';
                    const ACH_CATEGORIES = [
                        { id: 'learning',  label: 'Learning',  icon: '📚' },
                        { id: 'explorer',  label: 'Explorer',  icon: '🌍' },
                        { id: 'social',    label: 'Social',    icon: '👥' },
                        { id: 'collector', label: 'Collector', icon: '💾' },
                        { id: 'veteran',   label: 'Veteran',   icon: '🏛️' },
                    ];
                    const grouped = {};
                    achievementsRes.achievements.forEach(a => {
                        const cat = a.category || 'other';
                        if (!grouped[cat]) grouped[cat] = [];
                        grouped[cat].push(a);
                    });
                    ACH_CATEGORIES.forEach(cat => {
                        const items = grouped[cat.id];
                        if (!items || items.length === 0) return;
                        const catEarned = items.filter(a => a.unlocked).length;
                        const section = document.createElement('div');
                        section.className = 'ach-category';
                        section.innerHTML = `
                            <div class="ach-category__header">
                                <span class="ach-category__icon">${cat.icon}</span>
                                <span class="ach-category__label">${cat.label}</span>
                                <span class="ach-category__count">${catEarned}/${items.length}</span>
                            </div>
                            <div class="ach-category__grid"></div>
                        `;
                        const catGrid = section.querySelector('.ach-category__grid');
                        items.forEach(a => {
                            const div = document.createElement('div');
                            div.className = 'achievement-card' + (a.unlocked ? ' achievement-card--unlocked' : ' achievement-card--locked');
                            div.innerHTML = `
                                <span class="achievement-card__icon">${a.icon || '🏅'}</span>
                                <strong class="achievement-card__name">${escapeHtml(a.name)}</strong>
                                <span class="achievement-card__desc">${escapeHtml(a.description || '')}</span>
                                <span class="achievement-card__status">${a.unlocked ? '✓ Earned' : '🔒 Locked'}</span>
                            `;
                            catGrid.appendChild(div);
                        });
                        achievementsGrid.appendChild(section);
                    });
                }
            }

            // =========================
            // FAVORITES SECTION
            // =========================
            const favoritesGrid = document.getElementById('favorites-grid');
            if (favoritesGrid) {
                const allConsoles = window.CONSOLES_DATA || [];
                if (favoritesRes.success && Array.isArray(favoritesRes.favorites) && favoritesRes.favorites.length > 0) {
                    favoritesGrid.innerHTML = '';
                    const emojis = ['❤️','🌟','⚡','🔥','🎯','🎮'];
                    favoritesRes.favorites.forEach((cid, idx) => {
                        const c = allConsoles.find(x => x.id === cid);
                        if (!c) return;
                        const btn = document.createElement('button');
                        btn.className = 'console-card';
                        btn.innerHTML = `${emojis[idx % emojis.length]} <span>${escapeHtml(c.name)}</span>`;
                        btn.addEventListener('click', () => { window.location.href = `console.html?name=${encodeURIComponent(c.name)}`; });
                        favoritesGrid.appendChild(btn);
                    });
                    // Update favorites count badge
                    const favCount = document.getElementById('favorites-count');
                    if (favCount) favCount.textContent = favoritesRes.favorites.length;
                } else {
                    favoritesGrid.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">❤️</span>
                            <p class="dash-empty-state__text">No favorites yet</p>
                            <p class="dash-empty-state__hint">Visit any console page and click the heart icon to add it here.</p>
                            <a href="evolutie.html" class="dash-empty-state__link">Browse consoles →</a>
                        </div>`;
                }
            }

            // =========================
            // FAVORITE LISTINGS (in favorites panel)
            // =========================
            const favListingsSection = document.getElementById('fav-listings-section');
            const favListingsGrid = document.getElementById('fav-listings-grid');
            if (favListingsSection && favListingsGrid && favListingsRes.success && favListingsRes.listings && favListingsRes.listings.length > 0) {
                favListingsSection.hidden = false;
                favListingsGrid.innerHTML = favListingsRes.listings.map(l => {
                    const imgs = Array.isArray(l.images) ? l.images : [];
                    const img = imgs[0] || '/assets/images/graphics/no-image-placeholder.jpg';
                    return `<a href="community.html#listing-${l.id}" class="home-listing-card">
                        <div class="home-listing-card__img">
                            <img src="${escapeHtml(img)}" alt="" loading="lazy">
                            ${l.sold ? '<span class="home-listing-card__sold">SOLD</span>' : ''}
                        </div>
                        <div class="home-listing-card__info">
                            <div class="home-listing-card__title">${escapeHtml(l.title)}</div>
                            <div class="home-listing-card__price">${Number(l.price).toFixed(0)} RON</div>
                            <div class="home-listing-card__seller">${escapeHtml(l.seller_name || '')}</div>
                        </div>
                    </a>`;
                }).join('');
            }

            // =========================
            // FRIENDS — pending requests
            // =========================
            const friendsRequests = document.getElementById('home-friends-requests');
            if (friendsRequests && friendRequestsRes.success && Array.isArray(friendRequestsRes.requests) && friendRequestsRes.requests.length > 0) {
                friendsRequests.innerHTML = `
                    <div class="dash-requests">
                        <p class="dash-requests__label">Friend Requests (${friendRequestsRes.requests.length})</p>
                        ${friendRequestsRes.requests.map(r => `
                            <div class="dash-request-item">
                                <span class="dash-request-name">${escapeHtml(r.username)}</span>
                                <div class="dash-request-actions">
                                    <button class="dash-request-btn dash-request-btn--accept btn primary" data-request-id="${r.request_id}">Accept</button>
                                    <button class="dash-request-btn dash-request-btn--decline btn secondary" data-request-id="${r.request_id}">Decline</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                friendsRequests.querySelectorAll('.dash-request-btn--accept').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const res = await apiFetch(`/api/friends/accept/${encodeURIComponent(btn.dataset.requestId)}`, { method: 'POST' });
                        if (res && res.success !== false) window.dispatchEvent(new CustomEvent('cn:friend-changed'));
                        btn.closest('.dash-request-item').remove();
                    });
                });
                friendsRequests.querySelectorAll('.dash-request-btn--decline').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await apiFetch(`/api/friends/reject/${encodeURIComponent(btn.dataset.requestId)}`, { method: 'POST' });
                        btn.closest('.dash-request-item').remove();
                    });
                });
            }

            // =========================
            // FRIENDS PREVIEW
            // =========================
            const friendsPreview = document.getElementById('home-friends-preview');
            if (friendsPreview) {
                if (friendsRes.success && friendsRes.friends.length > 0) {
                    // Update friends count badge
                    const friendsCount = document.getElementById('friends-count');
                    if (friendsCount) friendsCount.textContent = friendsRes.friends.length;

                    const preview = friendsRes.friends.slice(0, 8);
                    friendsPreview.innerHTML = `
                        <div class="dash-friends-list">
                            ${preview.map(f => `
                                <a href="user-profile.html?username=${encodeURIComponent(f.username)}" class="dash-friend-item">
                                    <span class="dash-friend-avatar">${f.avatar ? `<img src="${escapeHtml(f.avatar)}" alt="">` : '<span class="dash-friend-fallback">👤</span>'}</span>
                                    <span class="dash-friend-name">${escapeHtml(f.username)}</span>
                                </a>
                            `).join('')}
                        </div>
                        ${friendsRes.friends.length > 8 ? `<a href="profil.html#profil" class="dash-see-all">${I18nModule.t('home_friends_see_all').replace('{count}', friendsRes.friends.length)}</a>` : ''}
                    `;
                } else {
                    friendsPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">👥</span>
                            <p class="dash-empty-state__text">No friends yet</p>
                            <p class="dash-empty-state__hint">Join the community and connect with other console enthusiasts!</p>
                            <a href="community.html" class="dash-empty-state__link">Join community →</a>
                        </div>`;
                }
            }

            // =========================
            // MY COURSES
            // =========================
            const coursesContent = document.getElementById('home-courses-content');
            if (coursesContent) {
                const sp = starterProgressRes;
                const totalLessons = sp && sp.total_lessons > 0 ? sp.total_lessons : 19;
                const completedIds = sp && Array.isArray(sp.completed_lesson_ids) ? sp.completed_lesson_ids : [];
                const doneCount = completedIds.length;
                const lastId = sp && sp.last_lesson_id;
                const courseComplete = sp && sp.course_completed;

                if (courseComplete) {
                    coursesContent.innerHTML = `
                        <div class="dash-course-card dash-course-card--complete">
                            <div class="dash-course-card__icon">🏆</div>
                            <div class="dash-course-card__body">
                                <div class="dash-course-card__title">Console Starter Guide</div>
                                <div class="dash-course-card__sub">Course complete — ${totalLessons}/${totalLessons} lessons</div>
                            </div>
                            <a href="course.html?slug=starter-guide" class="dash-course-card__btn">Review →</a>
                        </div>
                        <p class="dash-empty" style="margin-top:18px;text-align:center;">More courses coming soon.</p>`;
                } else if (doneCount > 0) {
                    const pct = Math.round((doneCount / totalLessons) * 100);
                    const continueHref = lastId
                        ? `lesson.html?id=${lastId}&slug=starter-guide`
                        : `course.html?slug=starter-guide`;
                    coursesContent.innerHTML = `
                        <div class="dash-course-card">
                            <div class="dash-course-card__icon">🎮</div>
                            <div class="dash-course-card__body">
                                <div class="dash-course-card__title">Console Starter Guide</div>
                                <div class="dash-course-card__progress-bar"><div class="dash-course-card__progress-fill" style="width:${pct}%"></div></div>
                                <div class="dash-course-card__sub">${doneCount} / ${totalLessons} lessons · ${pct}%</div>
                            </div>
                            <a href="${continueHref}" class="dash-course-card__btn">Continue →</a>
                        </div>`;
                } else {
                    coursesContent.innerHTML = `
                        <div class="dash-course-card">
                            <div class="dash-course-card__icon">🎮</div>
                            <div class="dash-course-card__body">
                                <div class="dash-course-card__title">Console Starter Guide</div>
                                <div class="dash-course-card__sub">Everything you need to know about gaming consoles</div>
                            </div>
                            <a href="course.html?slug=starter-guide" class="dash-course-card__btn">Start →</a>
                        </div>`;
                }
            }

            // Overview course stat
            const overviewCourseStat = document.getElementById('home-overview-course-stat');
            if (overviewCourseStat && starterProgressRes && starterProgressRes.total_lessons > 0) {
                const done = (starterProgressRes.completed_lesson_ids || []).length;
                const total = starterProgressRes.total_lessons;
                overviewCourseStat.textContent = `${done}/${total}`;
            }

            // Progress panel course stat
            const progressPanelCourseStat = document.getElementById('progress-panel-course-stat');
            if (progressPanelCourseStat && starterProgressRes && starterProgressRes.total_lessons > 0) {
                const done = (starterProgressRes.completed_lesson_ids || []).length;
                const total = starterProgressRes.total_lessons;
                progressPanelCourseStat.textContent = `${done}/${total}`;
            }

            // =========================
            // MY POSTS
            // =========================
            const postsPreview = document.getElementById('home-posts-preview');
            if (postsPreview) {
                if (myPostsRes.success && Array.isArray(myPostsRes.posts) && myPostsRes.posts.length > 0) {
                    postsPreview.innerHTML = `
                        <div class="dash-posts-list">
                            ${myPostsRes.posts.slice(0, 5).map(p => `
                                <a href="community.html?post=${p.id}" class="dash-post-item">
                                    <span class="dash-post-title">${escapeHtml(p.title || p.content || 'Post')}</span>
                                    <span class="dash-post-meta">${p.replies || 0} replies</span>
                                </a>
                            `).join('')}
                        </div>
                        <a href="community.html" class="dash-see-all">See all posts</a>
                    `;
                } else {
                    postsPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">📝</span>
                            <p class="dash-empty-state__text">No posts yet</p>
                            <p class="dash-empty-state__hint">Start a discussion or ask a question in the community forum.</p>
                            <a href="community.html" class="dash-empty-state__link">Create your first post →</a>
                        </div>`;
                }
            }

            // =========================
            // LIKED POSTS
            // =========================
            const likedPreview = document.getElementById('home-liked-preview');
            if (likedPreview) {
                if (likedPostsRes.success && Array.isArray(likedPostsRes.posts) && likedPostsRes.posts.length > 0) {
                    likedPreview.innerHTML = `
                        <div class="dash-posts-list">
                            ${likedPostsRes.posts.slice(0, 5).map(p => `
                                <a href="community.html?post=${p.id}" class="dash-post-item">
                                    <span class="dash-post-title">${escapeHtml(p.title || p.content || 'Post')}</span>
                                    <span class="dash-post-meta">by ${escapeHtml(p.username || '')}</span>
                                </a>
                            `).join('')}
                        </div>
                        <a href="community.html" class="dash-see-all">See all liked posts</a>
                    `;
                } else {
                    likedPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">👍</span>
                            <p class="dash-empty-state__text">No liked posts yet</p>
                            <p class="dash-empty-state__hint">Explore the community forum and upvote posts you find helpful.</p>
                            <a href="community.html" class="dash-empty-state__link">Explore community →</a>
                        </div>`;
                }
            }

            // =========================
            // RECENT RATINGS PREVIEW
            // =========================
            const ratingsPreview = document.getElementById('home-ratings-preview');
            if (ratingsPreview) {
                if (ratingsRes.success && ratingsRes.ratings.length > 0) {
                    const recent = ratingsRes.ratings.slice(0, 3);
                    const allConsoles = window.CONSOLES_DATA || [];
                    ratingsPreview.innerHTML = `
                        <div class="dash-ratings-list">
                            ${recent.map(r => {
                                const c = allConsoles.find(x => x.id === r.console_id);
                                const name = c ? c.name : r.console_id;
                                const stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
                                return `<div class="dash-rating-item">
                                    <span class="dash-rating-name">${escapeHtml(name)}</span>
                                    <span class="dash-rating-stars">${stars}</span>
                                </div>`;
                            }).join('')}
                        </div>
                    `;
                } else {
                    ratingsPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">⭐</span>
                            <p class="dash-empty-state__text">${I18nModule.t('home_ratings_empty')}</p>
                            <p class="dash-empty-state__hint">Rate your favorite consoles to keep track here.</p>
                            <a href="evolutie.html" class="dash-empty-state__link">Browse consoles →</a>
                        </div>`;
                }
            }

            // =========================
            // COMMUNITY / TRENDING
            // =========================
            const communityGrid = document.querySelector('.community-grid');

            if (communityGrid && forumRes.success) {
                communityGrid.innerHTML = '';

                if (forumRes.threads && forumRes.threads.length > 0) {
                    forumRes.threads.slice(0, 6).forEach((t) => {
                        const card = document.createElement('article');
                        card.className = 'community-card';
                        card.innerHTML = `
                            <h3>${escapeHtml(t.title)}</h3>
                            <p>By ${escapeHtml(t.username)}</p>
                        `;
                        card.addEventListener('click', () => { window.location.href = `community.html?post=${t.id}`; });
                        communityGrid.appendChild(card);
                    });
                } else {
                    communityGrid.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">💬</span>
                            <p class="dash-empty-state__text">No trending posts yet</p>
                            <p class="dash-empty-state__hint">Be the first to start a discussion!</p>
                            <a href="community.html" class="dash-empty-state__link">Go to community →</a>
                        </div>`;
                }
            }

            // =========================
            // HOME PANEL — Collection preview
            // =========================
            const homeCollectionPreview = document.getElementById('home-collection-preview');
            if (homeCollectionPreview && Array.isArray(user.owned_console_ids)) {
                const allConsoles = window.CONSOLES_DATA || [];
                if (user.owned_console_ids.length > 0) {
                    homeCollectionPreview.innerHTML = '';
                    const emojis = ['🎮','🕹️','🔥','⚡','🌟','🎯'];
                    user.owned_console_ids.slice(0, 6).forEach((cid, idx) => {
                        const c = allConsoles.find(x => x.id === cid);
                        if (!c) return;
                        const btn = document.createElement('button');
                        btn.className = 'console-card';
                        btn.innerHTML = `${emojis[idx % emojis.length]} <span>${escapeHtml(c.name)}</span>`;
                        btn.addEventListener('click', () => { window.location.href = `console.html?name=${encodeURIComponent(c.name)}`; });
                        homeCollectionPreview.appendChild(btn);
                    });
                    if (user.owned_console_ids.length > 6) {
                        const seeAll = document.createElement('a');
                        seeAll.href = '#collection';
                        seeAll.className = 'dash-see-all';
                        seeAll.textContent = `See all ${user.owned_console_ids.length} consoles`;
                        homeCollectionPreview.parentElement.appendChild(seeAll);
                    }
                } else {
                    homeCollectionPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">📦</span>
                            <p class="dash-empty-state__text">No consoles in your collection</p>
                            <p class="dash-empty-state__hint">Browse the console library and start building your collection.</p>
                            <a href="evolutie.html" class="dash-empty-state__link">Browse consoles →</a>
                        </div>`;
                }
            }

            // =========================
            // HOME PANEL — Achievements preview
            // =========================
            const homeAchievementsPreview = document.getElementById('home-achievements-preview');
            if (homeAchievementsPreview && achievementsRes.success) {
                const badges = achievementsRes.achievements || [];
                const earnedBadges = badges.filter(b => b.unlocked);
                if (badges.length > 0) {
                    homeAchievementsPreview.innerHTML = '';
                    // Show earned first, then up to 6 total
                    const preview = [...earnedBadges, ...badges.filter(b => !b.unlocked)].slice(0, 6);
                    preview.forEach(a => {
                        const div = document.createElement('div');
                        div.className = 'achievement-card' + (a.unlocked ? ' achievement-card--unlocked' : ' achievement-card--locked');
                        div.innerHTML = `
                            <span class="achievement-card__icon">${a.icon || '🏅'}</span>
                            <strong class="achievement-card__name">${escapeHtml(a.name)}</strong>
                            <span class="achievement-card__desc">${escapeHtml(a.description || '')}</span>
                            <span class="achievement-card__status">${a.unlocked ? '✓ Earned' : '🔒 Locked'}</span>
                        `;
                        homeAchievementsPreview.appendChild(div);
                    });
                    const parent = homeAchievementsPreview.parentElement;
                    if (parent) parent.querySelectorAll('.dash-see-all').forEach(el => el.remove());
                    const seeAll = document.createElement('a');
                    seeAll.href = '#achievements';
                    seeAll.className = 'dash-see-all btn btn--primary';
                    seeAll.innerHTML = `See all ${earnedBadges.length}/${badges.length} achievements →`;
                    if (parent) parent.appendChild(seeAll);
                } else {
                    homeAchievementsPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">🏆</span>
                            <p class="dash-empty-state__text">No achievements yet</p>
                            <p class="dash-empty-state__hint">Complete lessons and interact with the community to earn badges.</p>
                            <a href="invata.html" class="dash-empty-state__link">Start learning →</a>
                        </div>`;
                }
            }

            // =========================
            // HOME PANEL — Friends preview
            // =========================
            const homeFriendsPreview = document.getElementById('home-friends-home-preview');
            if (homeFriendsPreview) {
                if (friendsRes.success && friendsRes.friends.length > 0) {
                    const preview = friendsRes.friends.slice(0, 8);
                    homeFriendsPreview.innerHTML = `
                        <div class="dash-friends-list">
                            ${preview.map(f => `
                                <a href="user-profile.html?username=${encodeURIComponent(f.username)}" class="dash-friend-item">
                                    <span class="dash-friend-avatar">${f.avatar ? `<img src="${escapeHtml(f.avatar)}" alt="">` : '<span class="dash-friend-fallback">👤</span>'}</span>
                                    <span class="dash-friend-name">${escapeHtml(f.username)}</span>
                                </a>
                            `).join('')}
                        </div>
                        ${friendsRes.friends.length > 8 ? `<a href="#friends" class="dash-see-all">${I18nModule.t('home_friends_see_all').replace('{count}', friendsRes.friends.length)}</a>` : ''}
                    `;
                } else {
                    homeFriendsPreview.innerHTML = `
                        <div class="dash-empty-state">
                            <span class="dash-empty-state__icon">👥</span>
                            <p class="dash-empty-state__text">No friends yet</p>
                            <p class="dash-empty-state__hint">Join the community and connect with console enthusiasts!</p>
                            <a href="community.html" class="dash-empty-state__link">Join community →</a>
                        </div>`;
                }
            }

        } catch (err) {
            console.error('Dashboard error:', err);
        }
    }

    // RUN
    populateDashboard();

    // =========================
    // CONTINUE BUTTON
    // =========================
    const continueButton = document.getElementById('continue-btn');

    if (continueButton) {
        continueButton.addEventListener('click', () => {
            window.location.href = 'invata.html';
        });
    }

});

// ── Panel hash routing ────────────────────────────────────────
(function initPanelRouting() {
    const PANELS = ['home','collection','favorites','progress','achievements','courses','friends','posts','liked'];
    const DEFAULT = 'home';

    function activatePanel(hash) {
        const name = PANELS.includes((hash || '').replace('#', ''))
            ? hash.replace('#', '')
            : DEFAULT;
        document.querySelectorAll('.home-panel').forEach(p => {
            p.classList.toggle('active', p.dataset.panel === name);
        });
        document.querySelectorAll('.sidebar-link[data-panel]').forEach(a => {
            a.classList.toggle('active', a.dataset.panel === name);
        });
    }

    activatePanel(location.hash);
    window.addEventListener('hashchange', () => activatePanel(location.hash));
}());
