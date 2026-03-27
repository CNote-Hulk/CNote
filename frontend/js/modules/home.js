document.addEventListener('DOMContentLoaded', () => {
    // Helper pentru fetch cu token
    function apiFetch(url, options = {}) {
        const token = localStorage.getItem('token');
        return fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
        }).then(r => r.json());
    }

    // Username-ul userului autentificat (presupunem că e salvat în localStorage)
    const username = localStorage.getItem('username') || 'user';
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome back, ${username}`;
    }

    // Populează datele principale din dashboard
    async function populateDashboard() {
        try {
            // 1. Profil user (progres, favorite, colecție, prieteni)
            const userRes = await apiFetch(`/api/users/${encodeURIComponent(username)}`);
            if (!userRes.success) throw new Error('User profile error');
            const user = userRes.user;

            // 2. Progres (ex: progres = owned_consoles.length, total = 42)
            const progress = Array.isArray(user.owned_console_ids) ? user.owned_console_ids.length : 0;
            const total = 42;
            const percent = Math.round((progress / total) * 100);
            const continueProgress = document.getElementById('continue-progress');
            const activeProgress = document.getElementById('active-progress');
            if (continueProgress && activeProgress) {
                continueProgress.textContent = `${progress}/${total}`;
                activeProgress.style.width = `${Math.max(2, percent)}%`;
            }

            // 3. Achievements (mock: 3/16, poți adapta dacă ai endpoint)
            const statAchievements = document.getElementById('stat-achievements');
            if (statAchievements) {
                statAchievements.textContent = '3/16';
            }

            // 4. Ratings (număr ratinguri date de user)
            const ratingsRes = await apiFetch('/api/ratings/user/all');
            const statRatings = document.getElementById('stat-ratings');
            if (statRatings && ratingsRes.success) {
                statRatings.textContent = ratingsRes.ratings.length;
            }

            // 5. Favorites (număr favorite)
            const favoritesRes = await apiFetch('/api/favorites');
            const statFavorites = document.getElementById('stat-favorites');
            if (statFavorites && favoritesRes.success) {
                statFavorites.textContent = favoritesRes.favorites.length;
            }

            // 6. Friends (număr prieteni)
            const friendsRes = await apiFetch('/api/friends');
            const statFriends = document.getElementById('stat-friends');
            if (statFriends && friendsRes.success) {
                statFriends.textContent = friendsRes.friends.length;
            }

            // 7. Colecție (populatează grid-ul cu console deținute)
            const collectionGrid = document.getElementById('collection-grid');
            if (collectionGrid && Array.isArray(user.owned_console_ids)) {
                // Folosește window.CONSOLES_DATA pentru lookup
                const allConsoles = window.CONSOLES_DATA || [];
                collectionGrid.innerHTML = '';
                user.owned_console_ids.forEach(cid => {
                    const c = allConsoles.find(x => x.id === cid);
                    if (c) {
                        const btn = document.createElement('button');
                        btn.className = 'console-card';
                        btn.setAttribute('data-console', c.name);
                        btn.innerHTML = `🎮 <span>${c.name}</span>`;
                        btn.addEventListener('click', () => {
                            window.location.href = `console.html?name=${encodeURIComponent(c.name)}`;
                        });
                        collectionGrid.appendChild(btn);
                    }
                });
            }

            // 8. Activitate recentă (mock, poți adapta dacă ai endpoint)
            const activityList = document.querySelector('.activity-list');
            if (activityList) {
                activityList.innerHTML = '';
                if (ratingsRes.success && ratingsRes.ratings.length > 0) {
                    const last = ratingsRes.ratings[0];
                    const c = (window.CONSOLES_DATA || []).find(x => x.id === last.console_id);
                    if (c) {
                        const li = document.createElement('li');
                        li.textContent = `Rated ${c.name} ★★★★★`;
                        activityList.appendChild(li);
                    }
                }
                if (favoritesRes.success && favoritesRes.favorites.length > 0) {
                    const c = (window.CONSOLES_DATA || []).find(x => x.id === favoritesRes.favorites[0]);
                    if (c) {
                        const li = document.createElement('li');
                        li.textContent = `Added ${c.name} to favorites`;
                        activityList.appendChild(li);
                    }
                }
                if (friendsRes.success && friendsRes.friends.length > 0) {
                    const li = document.createElement('li');
                    li.textContent = `Became friends with ${friendsRes.friends[0].username}`;
                    activityList.appendChild(li);
                }
            }

            // 9. Achievements grid (mock, poți adapta dacă ai endpoint)
            const achievementsGrid = document.querySelector('.achievements-grid');
            if (achievementsGrid) {
                achievementsGrid.innerHTML = '';
                [
                    { icon: '🏆', label: 'First Rating' },
                    { icon: '🔧', label: 'Repair Apprentice' },
                    { icon: '🌍', label: 'Community Member' }
                ].forEach(a => {
                    const div = document.createElement('div');
                    div.className = 'achievement-card';
                    div.innerHTML = `${a.icon} <strong>${a.label}</strong>`;
                    achievementsGrid.appendChild(div);
                });
            }

            // 10. Trending/Comunitate (forum recent)
            const communityGrid = document.querySelector('.community-grid');
            const forumRes = await apiFetch('/api/forum/recent');
            if (communityGrid && forumRes.success) {
                communityGrid.innerHTML = '';
                forumRes.threads.forEach(t => {
                    const art = document.createElement('article');
                    art.className = 'community-card';
                    art.innerHTML = `<h3>${t.title}</h3><p>By ${t.username}</p>`;
                    communityGrid.appendChild(art);
                });
            }

            // 11. Course Progress % (stat-progress)
            const statProgress = document.getElementById('stat-progress');
            if (statProgress) {
                statProgress.textContent = percent + '%';
            }
        } catch (err) {
            // Poți adăuga fallback sau mesaj de eroare
            console.error('Dashboard error:', err);
        }
    }

    populateDashboard();

    // Butoane console (pentru fallback dacă nu e colecție)
    const consoleButtons = document.querySelectorAll('.console-card');
    consoleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const consoleName = btn.getAttribute('data-console') || '';
            window.location.href = `console.html?name=${encodeURIComponent(consoleName)}`;
        });
    });

    // Buton continue
    const continueButton = document.getElementById('continue-btn');
    if (continueButton) {
        continueButton.addEventListener('click', () => {
            window.location.href = 'invata.html';
        });
    }
});
