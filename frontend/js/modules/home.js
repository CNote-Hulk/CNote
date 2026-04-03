import { I18nModule } from './i18n.js';

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

document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // SESSION
    // =========================
    let currentUser = null;
    try {
        const raw = localStorage.getItem('cn_session');
        if (raw) currentUser = JSON.parse(raw);
    } catch {}

    if (!currentUser) return;

    const username = currentUser.username;

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
            const avatar = normalizeAvatarUrl(user.avatar || user.avatar_url || currentUser.avatar || currentUser.avatar_url || '');
            if (avatar) {
                avatarImg.src = avatar;
                avatarImg.hidden = false;
                avatarFallback.hidden = true;
            }
        }

        if (adminBadge && (user.role === 'admin' || currentUser.role === 'admin')) {
            adminBadge.hidden = false;
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
    function renderWelcome() {
        if (welcomeTitle) {
            welcomeTitle.textContent = I18nModule.t('home_welcome').replace(/,\s*\S+$/, ', ' + username);
        }
    }
    renderWelcome();
    window.addEventListener('cn:language-changed', renderWelcome);

    // =========================
    // DASHBOARD DATA
    // =========================
    function getLocalAchievements(userId) {
        const BADGES = [
            { id: 'first_steps',    name: 'First Steps',     icon: '🎯' },
            { id: 'starter_pack',   name: 'Starter Pack',    icon: '🧩' },
            { id: 'tech_explorer',  name: 'Tech Explorer',   icon: '🔬' },
            { id: 'bookworm',       name: 'Bookworm',        icon: '📚' },
            { id: 'grinder_25',     name: 'Grinder',         icon: '⚙️' },
            { id: 'halfway',        name: 'Halfway There',   icon: '⭐' },
            { id: 'almost_there',   name: 'Almost There',    icon: '🚀' },
            { id: 'console_doctor', name: 'Console Doctor',  icon: '🔧' },
            { id: 'quiz_rookie',    name: 'Quiz Rookie',     icon: '❓' },
            { id: 'quiz_veteran',   name: 'Quiz Veteran',    icon: '🧠' },
            { id: 'perfect_hit',    name: 'Perfect Hit',     icon: '💯' },
            { id: 'perfect_streak', name: 'Perfect Streak',  icon: '🏅' },
            { id: 'console_scout',  name: 'Console Scout',   icon: '🧭' },
            { id: 'retro_master',   name: 'Retro Master',    icon: '🕹️' },
            { id: 'archive_hunter', name: 'Archive Hunter',  icon: '🗂️' },
            { id: 'all_rounder',    name: 'All-Rounder',     icon: '👑' }
        ];
        try {
            const data = JSON.parse(localStorage.getItem('cn_achievements')) || {};
            const earned = data[userId] || {};
            return { success: true, achievements: BADGES.map(b => ({ ...b, unlocked: !!earned[b.id] })) };
        } catch { return { success: false }; }
    }

    async function populateDashboard() {
        try {
            const userRes = await apiFetch(`/api/users/${encodeURIComponent(username)}`);
            if (!userRes.success) throw new Error('User fetch failed');

            const user = userRes.user;

            // Render sidebar with user data
            renderSidebar(user);

            // parallel fetch
            const [ratingsRes, favoritesRes, friendsRes, friendRequestsRes, forumRes, myPostsRes, likedPostsRes, achievementsRes, coursesRes] = await Promise.all([
                apiFetch('/api/ratings/user/all'),
                apiFetch('/api/favorites'),
                apiFetch('/api/friends'),
                apiFetch('/api/friends/requests'),
                apiFetch('/api/forum/recent'),
                apiFetch('/api/forum/my-posts'),
                apiFetch('/api/forum/liked'),
                Promise.resolve(getLocalAchievements(currentUser?.id)),
                apiFetch('/api/progress')
            ]);

            // =========================
            // PROGRESS
            // =========================
            const progress = Array.isArray(user.owned_console_ids)
                ? user.owned_console_ids.length
                : 0;

            const total = (window.CONSOLES_DATA || []).length || 52;
            const percent = Math.round((progress / total) * 100);

            const continueProgress = document.getElementById('continue-progress');
            const activeProgress = document.getElementById('active-progress');
            const statProgress = document.getElementById('stat-progress');

            if (continueProgress) {
                continueProgress.innerHTML = `${progress}/${total}`;
            }

            if (activeProgress) {
                activeProgress.style.width = `${Math.max(2, percent)}%`;
            }

            if (statProgress) {
                statProgress.innerHTML = `<strong>${percent}%</strong>`;
            }

            // Progress panel ring + percentage
            const progressRingArc = document.getElementById('progress-ring-arc');
            const progressRingPct = document.getElementById('progress-ring-pct');
            if (progressRingArc) {
                const circumference = 2 * Math.PI * 42;
                progressRingArc.style.strokeDasharray = circumference;
                progressRingArc.style.strokeDashoffset = circumference - (percent / 100) * circumference;
            }
            if (progressRingPct) {
                progressRingPct.textContent = percent + '%';
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
            // ACTIVITY
            // =========================
            const activityList = document.querySelector('.activity-list');

            if (activityList) {
                activityList.innerHTML = '';

                if (ratingsRes.success && ratingsRes.ratings.length) {
                    const last = ratingsRes.ratings[0];
                    const c = (window.CONSOLES_DATA || []).find(x => x.id === last.console_id);

                    if (c) {
                        addActivity(`Rated <strong>${escapeHtml(c.name)}</strong> ${'★'.repeat(last.rating || 5)}`);
                    }
                }

                if (favoritesRes.success && favoritesRes.favorites.length) {
                    const c = (window.CONSOLES_DATA || []).find(x => x.id === favoritesRes.favorites[0]);

                    if (c) {
                        addActivity(`Added <strong>${escapeHtml(c.name)}</strong> to favorites`);
                    }
                }

                if (friendsRes.success && friendsRes.friends.length) {
                    addActivity(`Became friends with <strong>${escapeHtml(friendsRes.friends[0].username)}</strong>`);
                }

                function addActivity(html) {
                    const li = document.createElement('li');
                    li.innerHTML = html;
                    activityList.appendChild(li);
                }
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

                const achievementsGrid = document.querySelector('.achievements-grid');
                if (achievementsGrid) {
                    achievementsGrid.innerHTML = '';
                    // Show unlocked first, then locked
                    const sorted = [...achievementsRes.achievements].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
                    sorted.forEach(a => {
                            const div = document.createElement('div');
                            div.className = 'achievement-card' + (a.unlocked ? ' achievement-card--unlocked' : ' achievement-card--locked');
                            div.innerHTML = `
                                <span class="achievement-card__icon">${a.icon || '🏅'}</span>
                                <strong class="achievement-card__name">${escapeHtml(a.label || a.name)}</strong>
                                <span class="achievement-card__status">${a.unlocked ? '✓ Earned' : '🔒 Locked'}</span>
                            `;
                            achievementsGrid.appendChild(div);
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
                                    <button class="dash-request-btn dash-request-btn--accept" data-user="${escapeHtml(r.username)}">Accept</button>
                                    <button class="dash-request-btn dash-request-btn--decline" data-user="${escapeHtml(r.username)}">Decline</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                friendsRequests.querySelectorAll('.dash-request-btn--accept').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await apiFetch(`/api/friends/accept/${encodeURIComponent(btn.dataset.user)}`, { method: 'POST' });
                        btn.closest('.dash-request-item').remove();
                    });
                });
                friendsRequests.querySelectorAll('.dash-request-btn--decline').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await apiFetch(`/api/friends/decline/${encodeURIComponent(btn.dataset.user)}`, { method: 'POST' });
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
            // MY COURSES (all + progress + button)
            // =========================
            const coursesPreview = document.getElementById('home-courses-preview');
            if (coursesPreview) {
                let courses = [];
                if (coursesRes.success && Array.isArray(coursesRes.courses)) {
                    courses = coursesRes.courses;
                }

                if (courses.length > 0) {
                    coursesPreview.innerHTML = `
                        <div class="dash-courses-list">
                            ${courses.map(c => {
                                const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
                                return `<div class="dash-course-item">
                                    <div class="dash-course-info">
                                        <span class="dash-course-name">${escapeHtml(c.name)}</span>
                                        <span class="dash-course-pct">${pct}%</span>
                                    </div>
                                    <div class="progress-bar"><div style="width: ${Math.max(2, pct)}%;"></div></div>
                                    <div class="dash-course-lessons">${c.completed || 0} / ${c.total || 0} lessons</div>
                                </div>`;
                            }).join('')}
                        </div>
                        <a href="invata.html" class="primary-btn" style="display:inline-block;margin-top:14px;text-decoration:none;text-align:center;">View all courses</a>
                    `;
                } else {
                    coursesPreview.innerHTML = `
                        <div class="dash-courses-list">
                            <div class="dash-course-item">
                                <div class="dash-course-info">
                                    <span class="dash-course-name">${I18nModule.t('home_continue_title')}</span>
                                    <span class="dash-course-pct">${percent}%</span>
                                </div>
                                <div class="progress-bar"><div style="width: ${Math.max(2, percent)}%;"></div></div>
                            </div>
                        </div>
                        <a href="invata.html" class="primary-btn" style="display:inline-block;margin-top:14px;text-decoration:none;text-align:center;">View all courses</a>
                    `;
                }
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
                if (badges.length > 0) {
                    homeAchievementsPreview.innerHTML = '';
                    const sorted = [...badges].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
                    sorted.slice(0, 6).forEach(a => {
                        const div = document.createElement('div');
                        div.className = 'achievement-card' + (a.unlocked ? ' achievement-card--unlocked' : ' achievement-card--locked');
                        div.innerHTML = `
                            <span class="achievement-card__icon">${a.icon || '🏅'}</span>
                            <strong class="achievement-card__name">${escapeHtml(a.label || a.name)}</strong>
                            <span class="achievement-card__status">${a.unlocked ? '✓ Earned' : '🔒 Locked'}</span>
                        `;
                        homeAchievementsPreview.appendChild(div);
                    });
                    if (badges.length > 6) {
                        const seeAll = document.createElement('a');
                        seeAll.href = '#achievements';
                        seeAll.className = 'dash-see-all';
                        const earned = badges.filter(b => b.unlocked).length;
                        seeAll.textContent = `See all ${earned}/${badges.length} achievements`;
                        homeAchievementsPreview.parentElement.appendChild(seeAll);
                    }
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
