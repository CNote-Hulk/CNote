import { AuthModule } from '/js/modules/auth.js';
        import { API_BASE_URL } from '/js/config.js';
        import { ProgressModule } from '/js/modules/progress.js';
        import { AchievementsModule } from '/js/modules/achievements.js';

        function escapeHtml(s) {
            if (!s) return '';
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // Extract username from URL path: /user/:username
        function getUsernameFromUrl() {
            const path = window.location.pathname;
            const match = path.match(/\/user\/([^/]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        }

        function renderRatingStars(rating) {
            const full = Math.floor(rating);
            const half = rating - full >= 0.3 && rating - full < 0.8 ? 1 : 0;
            const fullExtra = rating - full >= 0.8 ? 1 : 0;
            const empty = 5 - full - fullExtra - half;
            return '★'.repeat(full + fullExtra) + (half ? '½' : '') + '☆'.repeat(empty);
        }

        async function renderUserDashboard(profile) {
            // Show dashboard
            document.getElementById('user-dashboard-panel').hidden = false;

            // Progress
            const courses = ProgressModule.COURSES;
            let totalLessons = 0, completedLessons = 0;
            courses.forEach(c => {
                const p = ProgressModule.getCourseProgress(profile.id, c.id, c.totalLessons);
                totalLessons += p.total_lessons;
                completedLessons += p.completed_lessons.length;
            });
            const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            document.getElementById('user-dash-courses-pct').textContent = overallPct + '%';
            // Course preview
            const coursePreview = document.getElementById('user-dash-course-preview');
            if (courses.length > 0) {
                coursePreview.innerHTML = courses.map(c => {
                    const p = ProgressModule.getCourseProgress(profile.id, c.id, c.totalLessons);
                    return `<div style="margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-light);margin-bottom:4px;">
                            <span>${c.icon} ${c.name}</span>
                            <span>${p.completed_lessons.length}/${p.total_lessons}</span>
                        </div>
                        <div class="progress-bar"><div class="progress-bar__fill" style="width:${p.percentage}%"></div></div>
                    </div>`;
                }).join('');
            } else {
                coursePreview.innerHTML = '<p class="dash-empty">Niciun curs.</p>';
            }

            // Achievements
            const badges = AchievementsModule.getAllBadges(profile.id);
            const earnedCount = badges.filter(b => b.earned).length;
            document.getElementById('user-dash-achievements').textContent = `${earnedCount} / ${badges.length}`;
            // Achievements preview
            const achPreview = document.getElementById('user-dash-achievements-preview');
            const recentBadges = badges.filter(b => b.earned).slice(-6).reverse();
            if (recentBadges.length > 0) {
                achPreview.innerHTML = '<div class="dash-badges">' + recentBadges.map(b =>
                    `<span class="dash-badge" title="${escapeHtml(b.name)}">${b.icon}</span>`
                ).join('') + '</div>';
            } else {
                achPreview.innerHTML = '<p class="dash-empty">Nicio realizare încă.</p>';
            }

            // Ratings
            try {
                const res = await fetch(`${API_BASE_URL}/ratings/user/all?user_id=${encodeURIComponent(profile.id)}`);
                const data = await res.json();
                const ratings = (data.ratings || []);
                document.getElementById('user-dash-ratings').textContent = ratings.length;
                const ratingsPreview = document.getElementById('user-dash-ratings-preview');
                if (ratings.length > 0) {
                    ratingsPreview.innerHTML = ratings.slice(0, 5).map(r => {
                        const name = r.console_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return `<a href="/consoles/${encodeURIComponent(r.console_id)}.html" class="dash-rating-row">
                            <span class="dash-rating-row__name">${escapeHtml(name)}</span>
                            <span class="dash-rating-row__stars">${renderRatingStars(r.rating)}</span>
                        </a>`;
                    }).join('');
                } else {
                    ratingsPreview.innerHTML = '<p class="dash-empty">Nicio evaluare încă.</p>';
                }
            } catch {
                document.getElementById('user-dash-ratings-preview').innerHTML = '<p class="dash-empty">—</p>';
            }

            // Favorites
            const favCount = (profile.favorite_console_ids || []).length || (profile.favorite_consoles || '').split(',').filter(Boolean).length;
            document.getElementById('user-dash-favorites').textContent = favCount;

            // Friends
            try {
                const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(profile.username)}/friends`);
                const data = await res.json();
                const friends = data.friends || [];
                document.getElementById('user-dash-friends').textContent = friends.length;
                const friendsPreview = document.getElementById('user-dash-friends-preview');
                if (friends.length > 0) {
                    friendsPreview.innerHTML = '<div class="dash-friends-row">' + friends.slice(0, 8).map(f => {
                        const hasAvatar = f.avatar && f.avatar.length > 10;
                        const av = hasAvatar
                            ? `<img src="${escapeHtml(f.avatar)}" alt="" class="dash-friend-av">`
                            : `<span class="dash-friend-av dash-friend-av--fallback">👤</span>`;
                        return `<a href="/user/${encodeURIComponent(f.username)}" class="dash-friend" title="${escapeHtml(f.username)}">${av}</a>`;
                    }).join('') + '</div>';
                } else {
                    friendsPreview.innerHTML = '<p class="dash-empty">Niciun prieten încă.</p>';
                }
            } catch {
                document.getElementById('user-dash-friends-preview').innerHTML = '<p class="dash-empty">—</p>';
            }
        }

        async function loadUserProfile() {
            const username = getUsernameFromUrl();
            const loadingEl = document.getElementById('user-profile-loading');

            if (!username) {
                loadingEl.textContent = 'URL invalid.';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}`);
                const data = await res.json();

                if (!data.success || !data.user) {
                    loadingEl.textContent = 'Utilizatorul nu a fost găsit.';
                    return;
                }

                const profile = data.user;
                loadingEl.hidden = true;

                // Update page title
                document.title = `${profile.username} — Console Notebook`;

                // Show header
                const headerEl = document.getElementById('user-profile-header');
                headerEl.hidden = false;
                // Show dashboard
                await renderUserDashboard(profile);

                // Avatar
                const avatarImg = document.getElementById('user-avatar-img');
                const avatarFallback = document.getElementById('user-avatar-fallback');
                if (profile.avatar && profile.avatar.length > 10) {
                    avatarImg.src = profile.avatar;
                    avatarImg.hidden = false;
                    avatarFallback.hidden = true;
                }

                // Info
                document.getElementById('user-name').textContent = profile.username;
                document.getElementById('user-bio').textContent = profile.bio || 'Nicio descriere.';
                document.getElementById('user-date').textContent = 'Membru din ' + new Date(profile.created_at).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });

                // Console lists
                const consolesSection = document.getElementById('user-consoles-section');
                consolesSection.hidden = false;

                // Favorite consoles - use favorite_console_ids from new table, fallback to CSV
                const favContainer = document.getElementById('user-favorite-consoles');
                const favIds = profile.favorite_console_ids || [];
                const favCsv = (profile.favorite_consoles || '').split(',').map(s => s.trim()).filter(Boolean);
                const allFavs = [...new Set([...favIds, ...favCsv])];

                if (allFavs.length > 0) {
                    // Try to resolve IDs to names
                    let consoleNames = {};
                    try {
                        const cRes = await fetch(`${API_BASE_URL}/consoles/list`);
                        const cData = await cRes.json();
                        if (cData.success) {
                            cData.consoles.forEach(c => { consoleNames[c.id] = c.name; });
                        }
                    } catch { /* ignore */ }

                    favContainer.innerHTML = allFavs.map(id => {
                        const name = consoleNames[id] || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return `<span class="profile-console-tag">${escapeHtml(name)}</span>`;
                    }).join('');
                }

                // Owned consoles
                const ownedContainer = document.getElementById('user-owned-consoles');
                const ownedIds = profile.owned_console_ids || [];
                const ownedCsv = (profile.owned_consoles || '').split(',').map(s => s.trim()).filter(Boolean);
                const allOwned = [...new Set([...ownedIds, ...ownedCsv])];

                if (allOwned.length > 0) {
                    let consoleNames = {};
                    try {
                        const cRes = await fetch(`${API_BASE_URL}/consoles/list`);
                        const cData = await cRes.json();
                        if (cData.success) {
                            cData.consoles.forEach(c => { consoleNames[c.id] = c.name; });
                        }
                    } catch { /* ignore */ }

                    ownedContainer.innerHTML = allOwned.map(id => {
                        const name = consoleNames[id] || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return `<span class="profile-console-tag">${escapeHtml(name)}</span>`;
                    }).join('');
                }

                // Friend button
                const actionsEl = document.getElementById('user-profile-actions');
                const currentUser = AuthModule.getCurrentUser();

                if (currentUser && currentUser.id !== profile.id) {
                    await renderFriendButton(actionsEl, profile.id);
                } else if (currentUser && currentUser.id === profile.id) {
                    actionsEl.innerHTML = '<a href="/html/pages/profil.html#setari" class="user-action-btn user-action-btn--edit">Editează Profilul</a>';
                }

                // Friends list
                await loadFriendsList(profile.username);

            } catch (err) {
                console.error('Profile load error:', err);
                loadingEl.textContent = 'A apărut o eroare la încărcarea profilului.';
            }
        }

        async function renderFriendButton(container, targetUserId) {
            try {
                const token = localStorage.getItem('cn_token');
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const res = await fetch(`${API_BASE_URL}/friends/status/${targetUserId}`, {
                    headers,
                    credentials: 'include'
                });
                const data = await res.json();

                if (!data.success) return;

                switch (data.status) {
                    case 'friends':
                        container.innerHTML = `
                            <span class="user-action-btn user-action-btn--friends">✓ Prieteni</span>
                            <button class="user-action-btn user-action-btn--remove" id="remove-friend-btn">Elimină Prieten</button>
                        `;
                        document.getElementById('remove-friend-btn').addEventListener('click', async () => {
                            await fetch(`${API_BASE_URL}/friends/${targetUserId}`, {
                                method: 'DELETE',
                                headers,
                                credentials: 'include'
                            });
                            renderFriendButton(container, targetUserId);
                        });
                        break;

                    case 'request_sent':
                        container.innerHTML = '<span class="user-action-btn user-action-btn--pending">⏳ Cerere Trimisă</span>';
                        break;

                    case 'request_received':
                        container.innerHTML = `
                            <button class="user-action-btn user-action-btn--accept" id="accept-friend-btn">Acceptă Cererea</button>
                            <button class="user-action-btn user-action-btn--reject" id="reject-friend-btn">Refuză</button>
                        `;
                        document.getElementById('accept-friend-btn').addEventListener('click', async () => {
                            await fetch(`${API_BASE_URL}/friends/accept/${data.requestId}`, {
                                method: 'POST',
                                headers,
                                credentials: 'include'
                            });
                            renderFriendButton(container, targetUserId);
                        });
                        document.getElementById('reject-friend-btn').addEventListener('click', async () => {
                            await fetch(`${API_BASE_URL}/friends/reject/${data.requestId}`, {
                                method: 'POST',
                                headers,
                                credentials: 'include'
                            });
                            renderFriendButton(container, targetUserId);
                        });
                        break;

                    default: // 'none'
                        container.innerHTML = '<button class="user-action-btn user-action-btn--add" id="add-friend-btn">+ Adaugă Prieten</button>';
                        document.getElementById('add-friend-btn').addEventListener('click', async () => {
                            await fetch(`${API_BASE_URL}/friends/request/${targetUserId}`, {
                                method: 'POST',
                                headers,
                                credentials: 'include'
                            });
                            renderFriendButton(container, targetUserId);
                        });
                        break;
                }
            } catch { /* ignore */ }
        }

        async function loadFriendsList(username) {
            const section = document.getElementById('user-friends-section');
            const list = document.getElementById('user-friends-list');

            try {
                const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}/friends`);
                const data = await res.json();

                if (!data.success || !data.friends || data.friends.length === 0) {
                    section.hidden = false;
                    return;
                }

                section.hidden = false;
                list.innerHTML = data.friends.map(f => {
                    const hasAvatar = f.avatar && f.avatar.length > 10;
                    const avatarHtml = hasAvatar
                        ? `<img src="${escapeHtml(f.avatar)}" alt="" class="friend-card__avatar">`
                        : `<span class="friend-card__avatar friend-card__avatar--fallback">👤</span>`;

                    return `<a href="/user/${encodeURIComponent(f.username)}" class="friend-card">
                        ${avatarHtml}
                        <span class="friend-card__name">${escapeHtml(f.username)}</span>
                    </a>`;
                }).join('');
            } catch {
                section.hidden = false;
            }
        }

        loadUserProfile();