 import { AuthModule } from '../../js/modules/auth.js';
        import { ProgressModule } from '../../js/modules/progress.js';
        import { AchievementsModule } from '../../js/modules/achievements.js';
        import { SearchModule } from '../../js/modules/search.js';
        import { ProfileDropdownModule } from '../../js/modules/profile-dropdown.js';
        import { API_BASE_URL } from '../../js/config.js';

        // Init search + profile dropdown
        SearchModule.init();
        ProfileDropdownModule.init();

        const user = AuthModule.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
        }

        function escapeHtml(s) {
            if (!s) return '';
            return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        function initProfile() {
            if (!user) return;

            const activateTab = (tabKey, syncHash = false) => {
                const tabBtn = document.querySelector(`.profile-tab[data-tab="${tabKey}"]`);
                const panel = document.querySelector(`.profile-panel[data-panel="${tabKey}"]`);
                if (!tabBtn || !panel) return;

                document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));

                tabBtn.classList.add('active');
                panel.classList.add('active');

                if (syncHash) {
                    const nextHash = `#${tabKey}`;
                    if (window.location.hash !== nextHash) {
                        window.location.hash = tabKey;
                    }
                }
            };

            const applyHashTab = () => {
                const hash = window.location.hash.replace('#', '');
                if (!hash) return;
                activateTab(hash);
            };

            // Check achievements
            AchievementsModule.checkAndAward(user.id);

            // Header
            document.getElementById('profile-name').textContent = user.username;
            document.getElementById('profile-bio').textContent = user.bio || 'Nicio descriere încă.';
            document.getElementById('profile-date').textContent = 'Membru din ' + new Date(user.created_at).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });

            // Render console lists
            const renderConsoleList = (containerId, csv) => {
                const el = document.getElementById(containerId);
                const items = (csv || '').split(',').map(s => s.trim()).filter(Boolean);
                if (items.length === 0) {
                    el.innerHTML = '<span class="profile-console-list__empty">Nicio consolă adăugată.</span>';
                } else {
                    el.innerHTML = items.map(c => `<span class="profile-console-tag">${escapeHtml(c)}</span>`).join('');
                }
            };
            renderConsoleList('profile-favorite-consoles', user.favorite_consoles);
            renderConsoleList('profile-owned-consoles', user.owned_consoles);

            const avatarBtn = document.getElementById('profile-avatar');
            const avatarInput = document.getElementById('avatar-upload');
            const avatarImg = document.getElementById('profile-avatar-img');
            const avatarFallback = document.getElementById('profile-avatar-fallback');

            const renderAvatar = (avatar) => {
                const hasAvatar = !!avatar;
                avatarImg.hidden = !hasAvatar;
                avatarFallback.hidden = hasAvatar;
                if (hasAvatar) {
                    avatarImg.src = avatar;
                } else {
                    avatarImg.removeAttribute('src');
                }
            };

            const toCompressedDataUrl = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const max = 320;
                        const scale = Math.min(max / img.width, max / img.height, 1);
                        const w = Math.round(img.width * scale);
                        const h = Math.round(img.height * scale);
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    img.onerror = () => reject(new Error('Fișierul selectat nu este o imagine validă.'));
                    img.src = reader.result;
                };
                reader.onerror = () => reject(new Error('Nu s-a putut citi fișierul.'));
                reader.readAsDataURL(file);
            });

            renderAvatar(user.avatar || '');

            avatarBtn.addEventListener('click', () => {
                avatarInput.click();
            });

            avatarInput.addEventListener('change', async (event) => {
                const file = event.target.files && event.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    showSettingsMessage('Poți încărca doar imagini.', false);
                    avatarInput.value = '';
                    return;
                }

                if (file.size > 5 * 1024 * 1024) {
                    showSettingsMessage('Imaginea este prea mare. Maxim 5MB.', false);
                    avatarInput.value = '';
                    return;
                }

                try {
                    const avatarDataUrl = await toCompressedDataUrl(file);
                    await AuthModule.updateProfile({ avatar: avatarDataUrl });
                    user.avatar = avatarDataUrl;
                    renderAvatar(avatarDataUrl);
                    showSettingsMessage('Poza de profil a fost actualizată.', true);
                } catch (error) {
                    showSettingsMessage(error.message || 'Nu s-a putut actualiza poza de profil.', false);
                } finally {
                    avatarInput.value = '';
                }
            });

            // Tabs
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    activateTab(tab.dataset.tab, true);
                });
            });

            // Handle hash navigation
            applyHashTab();
            window.addEventListener('hashchange', applyHashTab);

            // Courses
            renderCourses();

            // Achievements
            renderAchievements();

            // Dashboard
            renderDashboard();

            // Settings
            document.getElementById('set-username').value = user.username;
            document.getElementById('set-bio').value = user.bio || '';
            document.getElementById('set-favorite-consoles').value = user.favorite_consoles || '';
            document.getElementById('set-email').value = user.email || '';

            // Initialize owned consoles multi-select
            initOwnedConsolesSelect();

            const settingsTabButton = document.querySelector('.profile-tab[data-tab="setari"]');
            const goToSettingsAndFocus = (inputId) => {
                activateTab('setari', true);
                const input = document.getElementById(inputId);
                if (input) {
                    requestAnimationFrame(() => input.focus());
                }
            };

            document.getElementById('edit-username-shortcut').addEventListener('click', () => {
                goToSettingsAndFocus('set-username');
            });

            document.getElementById('edit-bio-shortcut').addEventListener('click', () => {
                goToSettingsAndFocus('set-bio');
            });

            if (settingsTabButton) {
                settingsTabButton.setAttribute('title', 'Poți modifica aici numele, bio, email și parola');
            }

            const showSettingsMessage = (message, isSuccess) => {
                const msg = document.getElementById('settings-msg');
                if (isSuccess) {
                    msg.style.color = 'var(--success)';
                    msg.style.background = 'rgba(74, 222, 128, 0.1)';
                    msg.style.borderColor = 'rgba(74, 222, 128, 0.2)';
                } else {
                    msg.style.color = '#e57373';
                    msg.style.background = 'rgba(229, 115, 115, 0.12)';
                    msg.style.borderColor = 'rgba(229, 115, 115, 0.25)';
                }
                msg.textContent = message;
                msg.classList.add('visible');
                setTimeout(() => msg.classList.remove('visible'), 3200);
            };

            document.getElementById('settings-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('set-username').value;
                const bio = document.getElementById('set-bio').value;
                const favorite_consoles = document.getElementById('set-favorite-consoles').value;
                const owned_consoles = document.getElementById('set-owned-consoles').value;
                const email = document.getElementById('set-email').value;
                const currentPassword = document.getElementById('set-current-password').value;
                const newPassword = document.getElementById('set-new-password').value;
                const confirmPassword = document.getElementById('set-new-password-confirm').value;

                const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase();
                const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;

                if ((emailChanged || wantsPasswordChange) && !currentPassword) {
                    showSettingsMessage('Introdu parola curentă pentru schimbarea emailului/parolei.', false);
                    return;
                }

                if (wantsPasswordChange && newPassword !== confirmPassword) {
                    showSettingsMessage('Parola nouă și confirmarea nu coincid.', false);
                    return;
                }

                await AuthModule.updateProfile({ username, bio, favorite_consoles, owned_consoles });

                // Also save owned consoles to the new table
                try {
                    const ownedList = owned_consoles.split(',').map(s => s.trim()).filter(Boolean);
                    const token = localStorage.getItem('cn_token');
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) headers['Authorization'] = 'Bearer ' + token;
                    await fetch(API_BASE_URL + '/owned-consoles', {
                        method: 'PUT',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({ consoles: ownedList })
                    });
                } catch { /* ignore */ }

                document.getElementById('profile-name').textContent = username;
                document.getElementById('profile-bio').textContent = bio || 'Nicio descriere încă.';
                renderConsoleList('profile-favorite-consoles', favorite_consoles);
                renderConsoleList('profile-owned-consoles', owned_consoles);

                if (emailChanged) {
                    const emailResult = await AuthModule.updateEmail(email, currentPassword);
                    if (!emailResult.success) {
                        showSettingsMessage(emailResult.error || 'Nu s-a putut schimba emailul.', false);
                        return;
                    }
                }

                if (wantsPasswordChange) {
                    const passwordResult = await AuthModule.updatePassword(currentPassword, newPassword);
                    if (!passwordResult.success) {
                        showSettingsMessage(passwordResult.error || 'Nu s-a putut schimba parola.', false);
                        return;
                    }
                    document.getElementById('set-new-password').value = '';
                    document.getElementById('set-new-password-confirm').value = '';
                }

                user.username = username.trim();
                user.bio = bio;
                user.favorite_consoles = favorite_consoles;
                user.owned_consoles = owned_consoles;
                user.email = email.trim().toLowerCase();
                document.getElementById('set-current-password').value = '';
                showSettingsMessage('Setările au fost actualizate cu succes.', true);
            });

            const showConfirmDialog = ({ title, message, confirmLabel = 'Confirmă', cancelLabel = 'Anulează' }) => {
                const modal = document.getElementById('confirm-modal');
                const titleEl = document.getElementById('confirm-modal-title');
                const textEl = document.getElementById('confirm-modal-text');
                const okBtn = document.getElementById('confirm-modal-ok');
                const cancelBtn = document.getElementById('confirm-modal-cancel');
                const cancelBackdrop = modal.querySelector('[data-modal-cancel]');

                titleEl.textContent = title;
                textEl.textContent = message;
                okBtn.textContent = confirmLabel;
                cancelBtn.textContent = cancelLabel;

                modal.hidden = false;
                document.body.classList.add('modal-open');
                setTimeout(() => okBtn.focus(), 0);

                return new Promise((resolve) => {
                    const close = (value) => {
                        modal.hidden = true;
                        document.body.classList.remove('modal-open');
                        okBtn.removeEventListener('click', onOk);
                        cancelBtn.removeEventListener('click', onCancel);
                        cancelBackdrop.removeEventListener('click', onCancel);
                        document.removeEventListener('keydown', onKeydown);
                        resolve(value);
                    };

                    const onOk = () => close(true);
                    const onCancel = () => close(false);
                    const onKeydown = (event) => {
                        if (event.key === 'Escape') close(false);
                    };

                    okBtn.addEventListener('click', onOk);
                    cancelBtn.addEventListener('click', onCancel);
                    cancelBackdrop.addEventListener('click', onCancel);
                    document.addEventListener('keydown', onKeydown);
                });
            };

            document.getElementById('reset-all-btn').addEventListener('click', async () => {
                const confirmed = await showConfirmDialog({
                    title: 'Reset Total Date',
                    message: 'Se vor șterge progresul cursului, realizările și istoricul quiz-urilor. Vrei să continui?',
                    confirmLabel: 'Da, resetează',
                    cancelLabel: 'Renunță'
                });
                if (!confirmed) return;

                ProgressModule.resetUserProgress(user.id);
                AchievementsModule.resetUserAchievements(user.id);
                AchievementsModule.resetUserQuizStats(user.id);
                AchievementsModule.resetVisitedConsoles();
                localStorage.removeItem('cn_lesson_visits');

                renderCourses();
                renderAchievements();

                showSettingsMessage('Reset complet realizat.', true);
            });

            // ─── Active Sessions ────────────────────────────
            async function loadSessions() {
                const container = document.getElementById('sessions-container');
                const logoutOthersBtn = document.getElementById('logout-others-btn');

                try {
                    const sessions = await AuthModule.getSessions();
                    if (!sessions || sessions.length === 0) {
                        container.innerHTML = '<p style="color:var(--text-muted,#a89880);font-size:0.85rem;">Nicio sesiune activă.</p>';
                        logoutOthersBtn.hidden = true;
                        return;
                    }

                    container.innerHTML = sessions.map(s => {
                        const ago = timeAgo(s.last_activity);
                        const icon = s.device_type === 'mobile' ? '📱' : s.device_type === 'tablet' ? '📱' : '💻';
                        const current = s.is_current ? ' <span style="color:var(--success);font-size:0.75rem;font-weight:600;">(sesiunea curentă)</span>' : '';
                        const logoutBtn = s.is_current ? '' : `<button class="session-logout-btn" data-session-id="${s.id}" style="background:none;border:1px solid rgba(229,115,115,0.4);color:#e57373;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;margin-top:6px;">Deconectare</button>`;

                        return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;">
                            <div style="font-size:0.9rem;color:var(--text-light);">${icon} ${escapeHtml(s.browser)} pe ${escapeHtml(s.operating_system)}${current}</div>
                            <div style="font-size:0.78rem;color:var(--text-muted,#a89880);margin-top:4px;">IP: ${escapeHtml(s.ip_address)} · Ultima activitate: ${ago}</div>
                            ${logoutBtn}
                        </div>`;
                    }).join('');

                    // Show "logout others" button if more than 1 session
                    logoutOthersBtn.hidden = sessions.filter(s => !s.is_current).length === 0;

                    // Bind individual session logout buttons
                    container.querySelectorAll('.session-logout-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const sid = parseInt(btn.dataset.sessionId, 10);
                            const result = await AuthModule.terminateSession(sid);
                            if (result.success) loadSessions();
                        });
                    });
                } catch {
                    container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca sesiunile.</p>';
                }
            }

            function timeAgo(dateStr) {
                if (!dateStr) return 'necunoscut';
                const diff = Date.now() - new Date(dateStr).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'chiar acum';
                if (mins < 60) return mins + ' min în urmă';
                const hours = Math.floor(mins / 60);
                if (hours < 24) return hours + ' ore în urmă';
                const days = Math.floor(hours / 24);
                return days + ' zile în urmă';
            }

            document.getElementById('logout-others-btn').addEventListener('click', async () => {
                const confirmed = await showConfirmDialog({
                    title: 'Deconectare alte dispozitive',
                    message: 'Vrei să te deconectezi de pe toate celelalte dispozitive?',
                    confirmLabel: 'Da, deconectează',
                    cancelLabel: 'Anulează'
                });
                if (!confirmed) return;
                const result = await AuthModule.terminateOtherSessions();
                if (result.success) {
                    showSettingsMessage('Toate celelalte sesiuni au fost închise.', true);
                    loadSessions();
                }
            });

            // Load sessions when settings tab is first activated
            loadSessions();

            // Load user ratings
            renderUserRatings();

            // Load friends data
            loadFriendRequests();
            loadMyFriends();
            initFriendSearch();
        }

        // ─── Friend Search ──────────────────────────────────

        function initFriendSearch() {
            const input = document.getElementById('friend-search-input');
            const resultsContainer = document.getElementById('friend-search-results');
            let searchTimeout = null;

            input.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                const query = input.value.trim();

                if (query.length < 2) {
                    resultsContainer.innerHTML = '';
                    return;
                }

                searchTimeout = setTimeout(() => searchUsers(query), 300);
            });

            async function searchUsers(query) {
                try {
                    const token = localStorage.getItem('cn_token');
                    const headers = {};
                    if (token) headers['Authorization'] = 'Bearer ' + token;

                    const res = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
                        headers,
                        credentials: 'include'
                    });
                    const data = await res.json();

                    if (!data.success || !data.users || data.users.length === 0) {
                        resultsContainer.innerHTML = '<p style="color:var(--text-muted,#a89880);font-size:0.85rem;padding:8px 0;">Niciun utilizator găsit.</p>';
                        return;
                    }

                    // Get friendship status for each user
                    const userCards = await Promise.all(data.users.map(async (u) => {
                        let status = 'none';
                        try {
                            const statusRes = await fetch(`${API_BASE_URL}/friends/status/${u.id}`, {
                                headers,
                                credentials: 'include'
                            });
                            const statusData = await statusRes.json();
                            if (statusData.success) status = statusData.status;
                        } catch {}

                        const hasAvatar = u.avatar && u.avatar.length > 10;
                        const avatarHtml = hasAvatar
                            ? `<img src="${escapeHtml(u.avatar)}" alt="" class="friend-card__avatar">`
                            : `<span class="friend-card__avatar friend-card__avatar--fallback">👤</span>`;

                        let actionBtn = '';
                        if (status === 'friends') {
                            actionBtn = `<span class="user-action-btn user-action-btn--friends" disabled>✓ Prieteni</span>`;
                        } else if (status === 'request_sent') {
                            actionBtn = `<span class="user-action-btn user-action-btn--pending" disabled>Cerere trimisă</span>`;
                        } else if (status === 'request_received') {
                            actionBtn = `<span class="user-action-btn user-action-btn--pending" disabled>Cerere primită</span>`;
                        } else {
                            actionBtn = `<button class="user-action-btn user-action-btn--add" data-user-id="${u.id}">Adaugă Prieten</button>`;
                        }

                        return `<div class="friend-search-result">
                            <a href="/user/${encodeURIComponent(u.username)}" class="friend-search-result__info">
                                ${avatarHtml}
                                <div class="friend-search-result__text">
                                    <span class="friend-card__name">${escapeHtml(u.username)}</span>
                                    ${u.bio ? `<span class="friend-search-result__bio">${escapeHtml(u.bio)}</span>` : ''}
                                </div>
                            </a>
                            ${actionBtn}
                        </div>`;
                    }));

                    resultsContainer.innerHTML = userCards.join('');

                    // Bind "Adaugă Prieten" buttons
                    resultsContainer.querySelectorAll('.user-action-btn--add').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            btn.disabled = true;
                            btn.textContent = '...';
                            try {
                                const token = localStorage.getItem('cn_token');
                                const headers = { 'Content-Type': 'application/json' };
                                if (token) headers['Authorization'] = 'Bearer ' + token;
                                const res = await fetch(`${API_BASE_URL}/friends/request/${btn.dataset.userId}`, {
                                    method: 'POST', headers, credentials: 'include'
                                });
                                const data = await res.json();
                                if (data.success) {
                                    if (data.status === 'friends') {
                                        btn.outerHTML = `<span class="user-action-btn user-action-btn--friends" disabled>✓ Prieteni</span>`;
                                        loadMyFriends();
                                    } else {
                                        btn.outerHTML = `<span class="user-action-btn user-action-btn--pending" disabled>Cerere trimisă</span>`;
                                    }
                                } else {
                                    btn.textContent = data.error || 'Eroare';
                                    setTimeout(() => { btn.textContent = 'Adaugă Prieten'; btn.disabled = false; }, 2000);
                                }
                            } catch {
                                btn.textContent = 'Eroare';
                                setTimeout(() => { btn.textContent = 'Adaugă Prieten'; btn.disabled = false; }, 2000);
                            }
                        });
                    });
                } catch {
                    resultsContainer.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Eroare la căutare.</p>';
                }
            }
        }

        async function loadFriendRequests() {
            const container = document.getElementById('friend-requests-container');
            try {
                const token = localStorage.getItem('cn_token');
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const res = await fetch(API_BASE_URL + '/friends/requests', {
                    headers,
                    credentials: 'include'
                });
                const data = await res.json();

                if (!data.success || !data.requests || data.requests.length === 0) {
                    container.innerHTML = '<p style="color:var(--text-muted,#a89880);font-size:0.85rem;">Nicio cerere de prietenie.</p>';
                    return;
                }

                container.innerHTML = data.requests.map(r => {
                    const hasAvatar = r.avatar && r.avatar.length > 10;
                    const avatarHtml = hasAvatar
                        ? `<img src="${escapeHtml(r.avatar)}" alt="" class="friend-card__avatar">`
                        : `<span class="friend-card__avatar friend-card__avatar--fallback">👤</span>`;

                    return `<div class="friend-request-item">
                        <a href="/user/${encodeURIComponent(r.username)}" class="friend-request-info">
                            ${avatarHtml}
                            <span class="friend-card__name">${escapeHtml(r.username)}</span>
                        </a>
                        <div class="friend-request-actions">
                            <button class="user-action-btn user-action-btn--accept" data-request-id="${r.request_id}">Acceptă</button>
                            <button class="user-action-btn user-action-btn--reject" data-request-id="${r.request_id}">Refuză</button>
                        </div>
                    </div>`;
                }).join('');

                // Bind accept/reject buttons
                container.querySelectorAll('.user-action-btn--accept').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const token = localStorage.getItem('cn_token');
                        const headers = {};
                        if (token) headers['Authorization'] = 'Bearer ' + token;
                        await fetch(`${API_BASE_URL}/friends/accept/${btn.dataset.requestId}`, {
                            method: 'POST', headers, credentials: 'include'
                        });
                        loadFriendRequests();
                        loadMyFriends();
                    });
                });

                container.querySelectorAll('.user-action-btn--reject').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const token = localStorage.getItem('cn_token');
                        const headers = {};
                        if (token) headers['Authorization'] = 'Bearer ' + token;
                        await fetch(`${API_BASE_URL}/friends/reject/${btn.dataset.requestId}`, {
                            method: 'POST', headers, credentials: 'include'
                        });
                        loadFriendRequests();
                    });
                });
            } catch {
                container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca cererile.</p>';
            }
        }

        async function loadMyFriends() {
            const container = document.getElementById('my-friends-list');
            try {
                const token = localStorage.getItem('cn_token');
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const res = await fetch(API_BASE_URL + '/friends', {
                    headers,
                    credentials: 'include'
                });
                const data = await res.json();

                if (!data.success || !data.friends || data.friends.length === 0) {
                    container.innerHTML = '<p style="color:var(--text-muted,#a89880);font-size:0.85rem;">Niciun prieten încă.</p>';
                    return;
                }

                container.innerHTML = data.friends.map(f => {
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
                container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca prietenii.</p>';
            }
        }

        async function renderDashboard() {
            // ── Stats: Course progress ──
            const courses = ProgressModule.COURSES;
            let totalLessons = 0, completedLessons = 0;
            courses.forEach(c => {
                const p = ProgressModule.getCourseProgress(user.id, c.id, c.totalLessons);
                totalLessons += p.total_lessons;
                completedLessons += p.completed_lessons.length;
            });
            const overallPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            document.getElementById('dash-courses-pct').textContent = overallPct + '%';

            // Course preview (progress bar)
            const coursePreview = document.getElementById('dash-course-preview');
            if (courses.length > 0) {
                coursePreview.innerHTML = courses.map(c => {
                    const p = ProgressModule.getCourseProgress(user.id, c.id, c.totalLessons);
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

            // ── Stats: Achievements ──
            const badges = AchievementsModule.getAllBadges(user.id);
            const earnedCount = badges.filter(b => b.earned).length;
            document.getElementById('dash-achievements').textContent = `${earnedCount} / ${badges.length}`;

            // Achievements preview (last 6)
            const achPreview = document.getElementById('dash-achievements-preview');
            const recentBadges = badges.filter(b => b.earned).slice(-6).reverse();
            if (recentBadges.length > 0) {
                achPreview.innerHTML = '<div class="dash-badges">' + recentBadges.map(b =>
                    `<span class="dash-badge" title="${escapeHtml(b.name)}">${b.icon}</span>`
                ).join('') + '</div>';
                if (earnedCount === 0) {
                    achPreview.innerHTML += '<p class="dash-empty">Explorează pentru a debloca realizări!</p>';
                }
            } else {
                achPreview.innerHTML = '<p class="dash-empty">Nicio realizare încă.</p>';
            }

            // ── Stats: Ratings + Favorites + Friends (async) ──
            const token = localStorage.getItem('cn_token');
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            // Ratings
            try {
                const res = await fetch(`${API_BASE_URL}/ratings/user/all`, { headers, credentials: 'include' });
                const data = await res.json();
                const ratings = (data.ratings || []);
                document.getElementById('dash-ratings').textContent = ratings.length;

                const ratingsPreview = document.getElementById('dash-ratings-preview');
                if (ratings.length > 0) {
                    ratingsPreview.innerHTML = ratings.slice(0, 5).map(r => {
                        const name = r.console_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return `<a href="consoles/${encodeURIComponent(r.console_id)}.html" class="dash-rating-row">
                            <span class="dash-rating-row__name">${escapeHtml(name)}</span>
                            <span class="dash-rating-row__stars">${renderRatingStars(r.rating)}</span>
                        </a>`;
                    }).join('');
                } else {
                    ratingsPreview.innerHTML = '<p class="dash-empty">Nicio evaluare încă.</p>';
                }
            } catch {
                document.getElementById('dash-ratings-preview').innerHTML = '<p class="dash-empty">—</p>';
            }

            // Favorites
            try {
                const res = await fetch(`${API_BASE_URL}/favorites`, { headers, credentials: 'include' });
                const data = await res.json();
                document.getElementById('dash-favorites').textContent = (data.favorites || []).length;
            } catch { /* silent */ }

            // Friends
            try {
                const res = await fetch(`${API_BASE_URL}/friends`, { headers, credentials: 'include' });
                const data = await res.json();
                const friends = data.friends || [];
                document.getElementById('dash-friends').textContent = friends.length;

                const friendsPreview = document.getElementById('dash-friends-preview');
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
                document.getElementById('dash-friends-preview').innerHTML = '<p class="dash-empty">—</p>';
            }
        }

        async function renderUserRatings() {
            const container = document.getElementById('ratings-container');
            container.innerHTML = '<p style="color:var(--text-muted,#a89880);font-size:0.9rem;">Se încarcă evaluările...</p>';

            try {
                const token = localStorage.getItem('cn_token');
                const res = await fetch(`${API_BASE_URL}/ratings/user/all`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('fetch failed');
                const { ratings } = await res.json();

                if (!ratings || ratings.length === 0) {
                    container.innerHTML = '<div class="profile-empty"><span class="profile-empty__icon">⭐</span>Nu ai evaluat nicio consolă încă.</div>';
                    return;
                }

                container.innerHTML = ratings.map(r => {
                    const name = r.console_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const stars = renderRatingStars(r.rating);
                    const date = new Date(r.created_at).toLocaleDateString('ro-RO');
                    const href = `consoles/${encodeURIComponent(r.console_id)}.html`;
                    return `<a href="${href}" class="user-rating-card">
                        <div class="user-rating-card__name">${escapeHtml(name)}</div>
                        <div class="user-rating-card__stars">${stars}</div>
                        <div class="user-rating-card__date">${date}</div>
                    </a>`;
                }).join('');
            } catch {
                container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca evaluările.</p>';
            }
        }

        function renderRatingStars(rating) {
            let html = '';
            for (let i = 1; i <= 5; i++) {
                html += i <= rating
                    ? '<span class="star--filled">★</span>'
                    : '<span class="star--empty">★</span>';
            }
            return html;
        }

        function renderCourses() {
            const container = document.getElementById('courses-container');
            const courses = ProgressModule.COURSES;

            if (courses.length === 0) {
                container.innerHTML = '<div class="profile-empty"><span class="profile-empty__icon">📚</span>Niciun curs disponibil.</div>';
                return;
            }

            container.innerHTML = courses.map(course => {
                const progress = ProgressModule.getCourseProgress(user.id, course.id, course.totalLessons);
                return `<div class="course-card">
                    <div class="course-card__header">
                        <div class="course-card__icon">${course.icon}</div>
                        <div>
                            <div class="course-card__name">${course.name}</div>
                            <div class="course-card__counter">${progress.completed_lessons.length} / ${progress.total_lessons} lecții completate</div>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar__fill" style="width: ${progress.percentage}%"></div>
                    </div>
                    <div class="progress-bar__text">${progress.percentage}%</div>
                </div>`;
            }).join('');

            // Animate progress bars
            setTimeout(() => {
                container.querySelectorAll('.progress-bar__fill').forEach(bar => {
                    bar.style.width = bar.style.width; // trigger reflow
                });
            }, 100);
        }

        function renderAchievements() {
            const container = document.getElementById('achievements-container');
            const badges = AchievementsModule.getAllBadges(user.id);

            container.innerHTML = badges.map(b => {
                const cls = b.earned ? 'earned' : 'locked';
                const date = b.earned_at ? new Date(b.earned_at).toLocaleDateString('ro-RO') : '';
                return `<div class="achievement-badge ${cls}">
                    <span class="achievement-badge__icon">${b.icon}</span>
                    <div class="achievement-badge__name">${b.name}</div>
                    <div class="achievement-badge__desc">${b.description}</div>
                    ${b.earned ? `<div class="achievement-badge__date">Obținut pe ${date}</div>` : ''}
                </div>`;
            }).join('');
        }

        async function initOwnedConsolesSelect() {
            const listEl = document.getElementById('owned-consoles-list');
            const searchEl = document.getElementById('owned-consoles-search');
            const hiddenInput = document.getElementById('set-owned-consoles');
            let allConsoles = [];
            let selectedIds = new Set();

            try {
                // Fetch console list from server
                const token = localStorage.getItem('cn_token');
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const [consolesRes, ownedRes] = await Promise.all([
                    fetch(API_BASE_URL + '/consoles/list', { headers, credentials: 'include' }),
                    fetch(API_BASE_URL + '/owned-consoles', { headers, credentials: 'include' })
                ]);

                const consolesData = await consolesRes.json();
                const ownedData = await ownedRes.json();

                if (consolesData.success) allConsoles = consolesData.consoles;
                if (ownedData.success) ownedData.consoles.forEach(id => selectedIds.add(id));
            } catch {
                // API failed — silent, will try fallback below
            }

            // Fallback: use locally loaded CONSOLES_DATA if API returned nothing
            if (allConsoles.length === 0 && window.CONSOLES_DATA && window.CONSOLES_DATA.length > 0) {
                allConsoles = window.CONSOLES_DATA.map(c => ({ id: c.id, name: c.nume })).sort((a, b) => a.name.localeCompare(b.name));
            }

            if (allConsoles.length === 0) {
                listEl.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca consolele.</p>';
                return;
            }

            // Include owned_consoles from user profile CSV
            if (user.owned_consoles) {
                user.owned_consoles.split(',').map(s => s.trim()).filter(Boolean).forEach(id => selectedIds.add(id));
            }

            function updateHidden() {
                hiddenInput.value = Array.from(selectedIds).join(',');
            }

            function renderList(filter = '') {
                const filtered = filter
                    ? allConsoles.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
                    : allConsoles;

                if (filtered.length === 0) {
                    listEl.innerHTML = '<p style="color:var(--text-gray);font-size:0.85rem;padding:8px;">Nicio consolă găsită.</p>';
                    return;
                }

                listEl.innerHTML = filtered.map(c => {
                    const checked = selectedIds.has(c.id);
                    return `<label class="owned-console-item${checked ? ' checked' : ''}">
                        <input type="checkbox" value="${escapeHtml(c.id)}" ${checked ? 'checked' : ''}>
                        <span class="owned-console-check">${checked ? '☑' : '☐'}</span>
                        <span class="owned-console-name">${escapeHtml(c.name)}</span>
                    </label>`;
                }).join('');

                listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', () => {
                        if (cb.checked) {
                            selectedIds.add(cb.value);
                        } else {
                            selectedIds.delete(cb.value);
                        }
                        updateHidden();
                        renderList(searchEl.value);
                    });
                });
            }

            searchEl.addEventListener('input', () => renderList(searchEl.value));
            renderList();
            updateHidden();
        }

        initProfile();