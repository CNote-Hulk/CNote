import { I18nModule } from './i18n.js';

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
            const avatar = user.avatar || currentUser.avatar;
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
            const [ratingsRes, favoritesRes, friendsRes, forumRes, achievementsRes, coursesRes] = await Promise.all([
                apiFetch('/api/ratings/user/all'),
                apiFetch('/api/favorites'),
                apiFetch('/api/friends'),
                apiFetch('/api/forum/recent'),
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
                        ${friendsRes.friends.length > 5 ? `<a href="profil.html#profil" class="dash-see-all">See all ${friendsRes.friends.length} friends</a>` : ''}
                    `;
                } else {
                    friendsPreview.innerHTML = '<p class="dash-empty">No friends yet. Visit the community to connect!</p>';
                }
            }

            // =========================
            // COURSE PROGRESS PREVIEW
            // =========================
            const coursesPreview = document.getElementById('home-courses-preview');
            if (coursesPreview) {
                // Use local progress data
                const progressData = JSON.parse(localStorage.getItem('cn_lesson_visits') || '{}');
                const userId = currentUser?.id;
                const userProgress = userId && progressData[userId] ? progressData[userId] : progressData;

                // Try API data first, fallback to local
                let courses = [];
                if (coursesRes.success && Array.isArray(coursesRes.courses)) {
                    courses = coursesRes.courses.slice(0, 3);
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
                                </div>`;
                            }).join('')}
                        </div>
                        <a href="invata.html" class="dash-see-all">View all courses</a>
                    `;
                } else {
                    // Fallback: show general progress
                    coursesPreview.innerHTML = `
                        <div class="dash-courses-list">
                            <div class="dash-course-item">
                                <div class="dash-course-info">
                                    <span class="dash-course-name">Console Engineering</span>
                                    <span class="dash-course-pct">${percent}%</span>
                                </div>
                                <div class="progress-bar"><div style="width: ${Math.max(2, percent)}%;"></div></div>
                            </div>
                        </div>
                        <a href="invata.html" class="dash-see-all">View all courses</a>
                    `;
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
                    ratingsPreview.innerHTML = '<p class="dash-empty">No ratings yet. Explore consoles and share your thoughts!</p>';
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
