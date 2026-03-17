/**
 * Public User Profile Page
 * Displays another user's profile: progress, achievements,
 * favorites, owned consoles, and friend request controls.
 */
import { AuthModule } from '/js/modules/auth.js';
import { API_BASE_URL } from '/js/config.js';
import { ProgressModule } from '/js/modules/progress.js';
import { AchievementsModule } from '/js/modules/achievements.js';


        /** Escape HTML special characters */
        function escapeHtml(s) {
            if (!s) return '';
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        /** Extract username from URL path: /user/:username */
        function getUsernameFromUrl() {
            const path = window.location.pathname;
            const match = path.match(/\/user\/([^/]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        }

        /** Convert numeric rating to star characters (★☆) */
        function renderRatingStars(rating) {
            const full = Math.floor(rating);
            const half = rating - full >= 0.3 && rating - full < 0.8 ? 1 : 0;
            const fullExtra = rating - full >= 0.8 ? 1 : 0;
            const empty = 5 - full - fullExtra - half;
            return '★'.repeat(full + fullExtra) + (half ? '½' : '') + '☆'.repeat(empty);
        }

        /** Render the user's dashboard: progress, achievements, ratings, favorites */
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
                coursePreview.innerHTML = '<p class="dash-empty">No courses.</p>';
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
                achPreview.innerHTML = '<p class="dash-empty">No achievements yet.</p>';
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
                    ratingsPreview.innerHTML = '<p class="dash-empty">No ratings yet.</p>';
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
                    friendsPreview.innerHTML = '<p class="dash-empty">No friends yet.</p>';
                }
            } catch {
                document.getElementById('user-dash-friends-preview').innerHTML = '<p class="dash-empty">—</p>';
            }
        }

        /** Fetch public profile data by username and render the page */
        async function loadUserProfile() {
            const username = getUsernameFromUrl();
            const loadingEl = document.getElementById('user-profile-loading');

            if (!username) {
                loadingEl.textContent = 'Invalid URL.';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}`);
                const data = await res.json();

                if (!data.success || !data.user) {
                    loadingEl.textContent = 'User not found.';
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
                document.getElementById('user-bio').textContent = profile.bio || 'No description.';
                document.getElementById('user-date').textContent = 'Member since ' + new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

                // Console lists
                const consolesSection = document.getElementById('user-profile-consoles');
                if (consolesSection) {
                    consolesSection.hidden = false;
                }

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
                    actionsEl.innerHTML = '<a href="/html/pages/profil.html#setari" class="user-action-btn user-action-btn--edit">Edit Profile</a>';
                }

                // Friends list
                await loadFriendsList(profile.username);

                // Active marketplace listings
                await loadUserListings(profile.id);

            } catch (err) {
                console.error('Profile load error:', err);
                loadingEl.textContent = 'An error occurred while loading the profile.';
            }
        }

        /** Render the Add/Remove/Accept Friend button with status checks */
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
                            <span class="user-action-btn user-action-btn--friends">✓ Friends</span>
                            <button class="user-action-btn user-action-btn--remove" id="remove-friend-btn">Remove friend</button>
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
                        container.innerHTML = '<span class="user-action-btn user-action-btn--pending">⏳ Request sent</span>';
                        break;

                    case 'request_received':
                        container.innerHTML = `
                            <button class="user-action-btn user-action-btn--accept" id="accept-friend-btn">Accept request</button>
                            <button class="user-action-btn user-action-btn--reject" id="reject-friend-btn">Reject</button>
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
                        container.innerHTML = '<button class="user-action-btn user-action-btn--add" id="add-friend-btn">+ Add friend</button>';
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

        /** Fetch and display user's friends list */
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

        /** Fetch and display user's active marketplace listings on public profile */
        async function loadUserListings(userId) {
            const section = document.getElementById('user-listings-section');
            const grid = document.getElementById('user-listings-grid');
            if (!section || !grid) return;

            try {
                const res = await fetch(`${API_BASE_URL}/marketplace/listings/user/${userId}`);
                const data = await res.json();

                if (!data.success || !data.listings || data.listings.length === 0) {
                    section.hidden = false;
                    grid.innerHTML = '<p class="user-listings-empty">No active listings at the moment.</p>';
                    return;
                }

                const CONDITIONS = { new: 'Nou', like_new: 'Ca nou', good: 'Bun', fair: 'Acceptabil', parts: 'Piese' };

                section.hidden = false;
                grid.innerHTML = data.listings.map(l => {
                    const imgs = Array.isArray(l.images) ? l.images : [];
                    return `<a href="/html/pages/community.html" class="user-listing-card">
                        <div class="user-listing-card__img">
                            ${imgs[0] ? `<img src="${escapeHtml(imgs[0])}" alt="" loading="lazy">` : '<img src="/assets/images/graphics/no-image-placeholder.jpg" alt="" loading="lazy">'}
                            ${l.sold ? '<div class="hub-listing-sold-overlay"><span class="hub-listing-sold-badge">VÂNDUT</span></div>' : ''}
                        </div>
                        <div class="user-listing-card__info">
                            <div class="user-listing-card__condition"><span class="hub-condition hub-condition--${l.condition}">${CONDITIONS[l.condition] || l.condition}</span></div>
                            <div class="user-listing-card__title">${escapeHtml(l.title)}</div>
                            <div class="user-listing-card__price">${Number(l.price).toFixed(0)} RON</div>
                        </div>
                    </a>`;
                }).join('');
            } catch {
                section.hidden = false;
                grid.innerHTML = '<p class="user-listings-empty">Unable to load listings.</p>';
            }
        }

        loadUserProfile();