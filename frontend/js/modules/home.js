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

                const achievementsGrid = document.querySelector('.achievements-grid');
                if (achievementsGrid) {
                    achievementsGrid.innerHTML = '';
                    achievementsRes.achievements
                        .filter(a => a.unlocked)
                        .forEach(a => {
                            const div = document.createElement('div');
                            div.className = 'achievement-card';
                            div.innerHTML = `${a.icon || '🏅'} <strong>${a.label || a.name}</strong>`;
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
                } else {
                    favoritesGrid.innerHTML = `<p class="dash-empty">No favorites yet.</p>`;
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
                    const preview = friendsRes.friends.slice(0, 5);
                    friendsPreview.innerHTML = `
                        <div class="dash-friends-list">
                            ${preview.map(f => `
                                <a href="user-profile.html?username=${encodeURIComponent(f.username)}" class="dash-friend-item">
                                    <span class="dash-friend-avatar">${f.avatar ? `<img src="${escapeHtml(f.avatar)}" alt="">` : '<span class="dash-friend-fallback">👤</span>'}</span>
                                    <span class="dash-friend-name">${escapeHtml(f.username)}</span>
                                </a>
                            `).join('')}
                        </div>
                        ${friendsRes.friends.length > 5 ? `<a href="profil.html#profil" class="dash-see-all">${I18nModule.t('home_friends_see_all').replace('{count}', friendsRes.friends.length)}</a>` : ''}
                    `;
                } else {
                    friendsPreview.innerHTML = `<p class="dash-empty">${I18nModule.t('home_friends_empty')}</p>`;
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
                    postsPreview.innerHTML = `<p class="dash-empty">No posts yet. <a href="community.html" class="dash-see-all">Go to community</a></p>`;
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
                    likedPreview.innerHTML = `<p class="dash-empty">No liked posts yet. <a href="community.html" class="dash-see-all">Explore community</a></p>`;
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
                    ratingsPreview.innerHTML = `<p class="dash-empty">${I18nModule.t('home_ratings_empty')}</p>`;
                }
            }

            // =========================
            // COMMUNITY / TRENDING
            // =========================
            const communityGrid = document.querySelector('.community-grid');

            if (communityGrid && forumRes.success) {
                communityGrid.innerHTML = '';

                forumRes.threads.forEach((t) => {
                    const card = document.createElement('article');
                    card.className = 'community-card';

                    card.innerHTML = `
                        <h3>${escapeHtml(t.title)}</h3>
                        <p>By ${escapeHtml(t.username)}</p>
                    `;

                    communityGrid.appendChild(card);
                });
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
