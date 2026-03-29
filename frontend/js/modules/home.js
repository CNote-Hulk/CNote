document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // SESSION
    // =========================
    let currentUser = null;
    try {
        const raw = localStorage.getItem('cn_session');
        if (raw) currentUser = JSON.parse(raw);
    } catch {}

    /*if (!currentUser || !currentUser.id) {
        window.location.replace('index.html');
        return;
    }*/

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

    // =========================
    // WELCOME
    // =========================
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome back, ${username} 👋`;
    }

    // =========================
    // DASHBOARD DATA
    // =========================
    async function populateDashboard() {
        try {
            const userRes = await apiFetch(`/api/users/${encodeURIComponent(username)}`);
            if (!userRes.success) throw new Error('User fetch failed');

            const user = userRes.user;

            // ⚡ parallel fetch
            const [ratingsRes, favoritesRes, friendsRes, forumRes, achievementsRes] = await Promise.all([
                apiFetch('/api/ratings/user/all'),
                apiFetch('/api/favorites'),
                apiFetch('/api/friends'),
                apiFetch('/api/forum/recent'),
                apiFetch('/api/achievements')
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
                statProgress.innerHTML = `📈 <strong>${percent}%</strong>`;
            }

            // =========================
            // STATS
            // =========================
            if (ratingsRes.success) {
                setStat('stat-ratings', `⭐ <strong>${ratingsRes.ratings.length}</strong>`);
            }

            if (favoritesRes.success) {
                setStat('stat-favorites', `💖 <strong>${favoritesRes.favorites.length}</strong>`);
            }

            if (friendsRes.success) {
                setStat('stat-friends', `🤝 <strong>${friendsRes.friends.length}</strong>`);
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
                        addActivity(`⭐ Rated <strong>${c.name}</strong> ★★★★★`);
                    }
                }

                if (favoritesRes.success && favoritesRes.favorites.length) {
                    const c = (window.CONSOLES_DATA || []).find(x => x.id === favoritesRes.favorites[0]);

                    if (c) {
                        addActivity(`💖 Added <strong>${c.name}</strong> to favorites`);
                    }
                }

                if (friendsRes.success && friendsRes.friends.length) {
                    addActivity(`🤝 Became friends with <strong>${friendsRes.friends[0].username}</strong>`);
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
                setStat('stat-achievements', `🏅 <strong>${earned}</strong> / <strong>${total_ach}</strong>`);

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
            // COMMUNITY / TRENDING
            // =========================
            const communityGrid = document.querySelector('.community-grid');

            if (communityGrid && forumRes.success) {
                communityGrid.innerHTML = '';

                forumRes.threads.forEach((t, idx) => {
                    const card = document.createElement('article');
                    card.className = 'community-card';

                    card.innerHTML = `
                        <h3>🔥 ${t.title}</h3>
                        <p>By ${t.username}</p>
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