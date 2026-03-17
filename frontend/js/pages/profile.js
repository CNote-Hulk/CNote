/**
 * Profile Page (profil.html)
 * User dashboard: edit profile, change email/password, 2FA setup,
 * course progress, achievements, favorites, and account deletion.
 */
 import { AuthModule } from '../../js/modules/auth.js';
        import { ProgressModule } from '../../js/modules/progress.js';
        import { AchievementsModule } from '../../js/modules/achievements.js';
        import { SearchModule } from '../../js/modules/search.js';
        import { API_BASE_URL } from '../../js/config.js';
        import { confirmModal } from '../../js/utils/confirm-modal.js';

        // Init search + profile dropdown
        SearchModule.init();

        const user = AuthModule.getCurrentUser();
        if (!user) {
            window.location.href = 'login.html';
        }

        /** Escape HTML special characters */
        function escapeHtml(s) {
            if (!s) return '';
            return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        }

        /** Convert console ID slug to display name (e.g. "playstation-5" → "PlayStation 5") */
        function formatConsoleDisplayName(value) {
            if (!value) return '';
            const words = String(value)
                .trim()
                .replace(/-/g, ' ')
                .split(/\s+/)
                .filter(Boolean)
                .map((word) => {
                    const lower = word.toLowerCase();
                    if (lower === 'playstation') return 'PlayStation';
                    if (lower === 'xbox') return 'Xbox';
                    if (lower === 'nintendo') return 'Nintendo';
                    if (lower === 'sega') return 'Sega';
                    if (/^\d+$/.test(lower)) return lower;
                    return lower.charAt(0).toUpperCase() + lower.slice(1);
                });
            return words.join(' ');
        }

        /** Main profile initializer — tabs, forms, settings panels */
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
            document.getElementById('profile-bio').textContent = user.bio || 'No description yet.';
            document.getElementById('profile-date').textContent = 'Membru din ' + new Date(user.created_at).toLocaleDateString('ro-RO', { year: 'numeric', month: 'long' });

            // Render console lists
            const renderConsoleList = (containerId, csv) => {
                const el = document.getElementById(containerId);
                const items = (csv || '').split(',').map(s => s.trim()).filter(Boolean);
                if (items.length === 0) {
                    el.innerHTML = '<span class="profile-console-list__empty">No consoles added.</span>';
                } else {
                    el.innerHTML = items
                        .map(c => `<span class="profile-console-tag">${escapeHtml(formatConsoleDisplayName(c))}</span>`)
                        .join('');
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
                    img.onerror = () => reject(new Error('Selected file is not a valid image.'));
                    img.src = reader.result;
                };
                reader.onerror = () => reject(new Error('Could not read file.'));
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
                    showSettingsMessage('You can only upload images.', false);
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
                    showSettingsMessage('Profile picture has been updated.', true);
                } catch (error) {
                    showSettingsMessage(error.message || 'Could not update profile picture.', false);
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
            document.getElementById('set-email').value = user.email || '';

            // Initialize owned consoles multi-select
            initOwnedConsolesSelect();

            // ─── Password section: toggle for Google-only users ──
            const passwordSectionInfo = document.getElementById('password-section-info');
            const currentPasswordField = document.getElementById('current-password-field');
            if (!user.has_password) {
                if (passwordSectionInfo) passwordSectionInfo.style.display = '';
                if (currentPasswordField) currentPasswordField.style.display = 'none';
            } else {
                if (passwordSectionInfo) passwordSectionInfo.style.display = 'none';
                if (currentPasswordField) currentPasswordField.style.display = '';
            }

            const settingsPanel = document.getElementById('panel-setari');
            if (settingsPanel && !user.email_verified && !document.getElementById('email-verification-banner')) {
                const verifyBanner = document.createElement('div');
                verifyBanner.className = 'course-card';
                verifyBanner.id = 'email-verification-banner';
                verifyBanner.style.marginBottom = '16px';
                verifyBanner.style.border = '1px solid rgba(212, 162, 78, 0.28)';
                verifyBanner.style.background = 'rgba(212, 162, 78, 0.08)';
                verifyBanner.innerHTML = `
                    <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;">
                        <div>
                            <div style="color:#f1d7a1;font-weight:700;margin-bottom:6px;">Email not verified</div>
                            <div style="color:var(--text-light);font-size:0.9rem;">Your email is not verified. Check your inbox.</div>
                        </div>
                        <button type="button" class="auth-btn" id="resend-verification-btn" style="white-space:nowrap;">Resend verification email</button>
                    </div>
                `;
                settingsPanel.insertBefore(verifyBanner, settingsPanel.firstChild);
            }

            // ─── Google Account Card ────────────────────────────
            if (settingsPanel && !document.getElementById('google-account-card')) {
                const googleCard = document.createElement('div');
                googleCard.className = 'course-card';
                googleCard.id = 'google-account-card';
                googleCard.style.marginTop = '24px';
                googleCard.innerHTML = `
                    <h3 style="margin-bottom:8px;font-size:1.05rem;letter-spacing:0.04em;">GOOGLE ACCOUNT</h3>
                    <p style="color:var(--text-light);font-size:0.88rem;margin-bottom:14px;">${user.google_linked 
                        ? 'Your account is connected with Google.' 
                        : 'Connect your account with Google for quick login.'}</p>
                    ${user.google_linked 
                        ? '<button type="button" class="auth-btn" id="google-unlink-btn" style="background:transparent;border:1px solid var(--color-border, #444);color:var(--text-light);">Disconnect Google</button>'
                        : '<button type="button" class="auth-btn" id="google-link-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:rgba(255,255,255,0.05);color:var(--text-light,#F5F0E8);border:1px solid rgba(255,255,255,0.12);font-weight:600;" onmouseover="this.style.background=\'rgba(255,255,255,0.10)\'" onmouseout="this.style.background=\'rgba(255,255,255,0.05)\'"><span style="font-weight:700;font-size:1.1rem;line-height:1;">G</span> Connect with Google</button>'
                    }
                `;
                settingsPanel.appendChild(googleCard);
            }

            // ─── Two-Factor Authentication Card ─────────────────
            if (settingsPanel && !document.getElementById('two-factor-card')) {
                const tfCard = document.createElement('div');
                tfCard.className = 'course-card';
                tfCard.id = 'two-factor-card';
                tfCard.style.marginTop = '24px';

                const totpEnabled = !!user.two_factor_totp_enabled;
                const emailEnabled = !!user.two_factor_email_enabled;

                let totpSection;
                if (totpEnabled) {
                    totpSection = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                            <span style="color:var(--success, #4ade80);font-size:0.88rem;">&#10003; Authenticator app — active${emailEnabled ? ' (primary)' : ''}</span>
                            <button type="button" class="auth-btn auth-btn--danger" id="disable-totp-btn" style="background:transparent;border:1px solid rgba(229,115,115,0.55);color:#f3a5a5;font-size:0.82rem;padding:5px 12px;">Disable</button>
                        </div>`;
                } else {
                    totpSection = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                            <span style="color:var(--text-light);font-size:0.88rem;">Authenticator app — inactive</span>
                            <button type="button" class="auth-btn" id="setup-totp-2fa-btn" style="font-size:0.82rem;padding:5px 12px;">Enable</button>
                        </div>
                        <div id="totp-setup-area" style="display:none;margin-top:16px;">
                            <p style="color:var(--text-light);font-size:0.88rem;margin-bottom:10px;">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>
                            <div id="totp-qr-container" style="text-align:center;margin-bottom:12px;"></div>
                            <p id="totp-secret-display" style="font-family:monospace;font-size:0.85rem;color:var(--text-light);word-break:break-all;margin-bottom:12px;text-align:center;"></p>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <input type="text" id="totp-confirm-code" placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" style="text-align:center;font-size:1.2rem;letter-spacing:0.3rem;padding:8px 12px;border:1px solid var(--color-border, #444);border-radius:6px;background:var(--bg-card, #1a1a1a);color:var(--text-primary, #fff);width:140px;">
                                <button type="button" class="auth-btn" id="totp-confirm-btn">Confirma</button>
                            </div>
                        </div>`;
                }

                let emailSection;
                if (emailEnabled) {
                    emailSection = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                            <span style="color:var(--success, #4ade80);font-size:0.88rem;">&#10003; Email — activ${totpEnabled ? ' (rezerva)' : ''}</span>
                            <button type="button" class="auth-btn auth-btn--danger" id="disable-email-btn" style="background:transparent;border:1px solid rgba(229,115,115,0.55);color:#f3a5a5;font-size:0.82rem;padding:5px 12px;">Disable</button>
                        </div>`;
                } else {
                    emailSection = `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                            <span style="color:var(--text-light);font-size:0.88rem;">Email — inactiv</span>
                            <button type="button" class="auth-btn" id="setup-email-2fa-btn" style="font-size:0.82rem;padding:5px 12px;">Enable</button>
                        </div>`;
                }

                tfCard.innerHTML = `
                    <h3 style="margin-bottom:8px;font-size:1.05rem;letter-spacing:0.04em;">TWO-FACTOR AUTHENTICATION (2FA)</h3>
                    <p style="color:var(--text-light);font-size:0.85rem;margin-bottom:14px;">Add an extra layer of security to your account. You can enable both methods — the app is primary, email is fallback.</p>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        ${totpSection}
                        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:2px 0;">
                        ${emailSection}
                    </div>
                `;
                settingsPanel.appendChild(tfCard);
            }

            if (settingsPanel && !document.getElementById('danger-zone-card')) {
                const dangerCard = document.createElement('div');
                dangerCard.className = 'course-card';
                dangerCard.id = 'danger-zone-card';
                dangerCard.style.marginTop = '24px';
                dangerCard.style.border = '1px solid rgba(229, 115, 115, 0.35)';
                dangerCard.style.background = 'rgba(58, 23, 23, 0.35)';
                dangerCard.innerHTML = `
                    <h3 style="color:#f0b3b3;margin-bottom:8px;font-size:1.05rem;letter-spacing:0.04em;">DANGER ZONE</h3>
                    <p style="color:#c8a3a3;font-size:0.88rem;margin-bottom:14px;">Deleting your account is permanent and cannot be undone.</p>
                    <button type="button" class="auth-btn auth-btn--danger" id="delete-account-btn" style="background:transparent;border:1px solid rgba(229,115,115,0.55);color:#f3a5a5;">Delete account</button>
                `;
                settingsPanel.appendChild(dangerCard);
            }

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
                settingsTabButton.setAttribute('title', 'You can change your username, bio, email, and password here');
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
                const owned_consoles = document.getElementById('set-owned-consoles').value;
                const email = document.getElementById('set-email').value;
                const currentPassword = document.getElementById('set-current-password').value;
                const newPassword = document.getElementById('set-new-password').value;
                const confirmPassword = document.getElementById('set-new-password-confirm').value;

                const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase();
                const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
                const isSetPasswordMode = !user.has_password;

                if (!isSetPasswordMode && (emailChanged || wantsPasswordChange) && !currentPassword) {
                    showSettingsMessage('Enter your current password to change email/password.', false);
                    return;
                }

                if (wantsPasswordChange && newPassword !== confirmPassword) {
                    showSettingsMessage('New password and confirmation do not match.', false);
                    return;
                }

                await AuthModule.updateProfile({ username, bio, owned_consoles });

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
                document.getElementById('profile-bio').textContent = bio || 'No description yet.';
                renderConsoleList('profile-favorite-consoles', user.favorite_consoles || '');
                renderConsoleList('profile-owned-consoles', owned_consoles);

                if (emailChanged) {
                    const emailResult = await AuthModule.updateEmail(email, currentPassword);
                    if (!emailResult.success) {
                        showSettingsMessage(emailResult.error || 'Could not change email.', false);
                        return;
                    }
                }

                if (wantsPasswordChange) {
                    let passwordResult;
                    if (isSetPasswordMode) {
                        passwordResult = await AuthModule.setPassword(newPassword, confirmPassword);
                    } else {
                        passwordResult = await AuthModule.updatePassword(currentPassword, newPassword);
                    }
                    if (!passwordResult.success) {
                        showSettingsMessage(passwordResult.error || 'Could not change password.', false);
                        return;
                    }
                    if (isSetPasswordMode) {
                        user.has_password = true;
                        if (passwordSectionInfo) passwordSectionInfo.style.display = 'none';
                        if (currentPasswordField) currentPasswordField.style.display = '';
                    }
                    document.getElementById('set-new-password').value = '';
                    document.getElementById('set-new-password-confirm').value = '';
                }

                user.username = username.trim();
                user.bio = bio;
                user.owned_consoles = owned_consoles;
                user.email = email.trim().toLowerCase();
                document.getElementById('set-current-password').value = '';
                showSettingsMessage('Settings updated successfully.', true);
            });

            const showConfirmDialog = ({
                title,
                message,
                confirmLabel = 'Confirma',
                cancelLabel = 'Cancel',
                withPassword = false,
                withTextInput = false
            }) => {
                const modal = document.getElementById('confirm-modal');
                const titleEl = document.getElementById('confirm-modal-title');
                const textEl = document.getElementById('confirm-modal-text');
                const okBtn = document.getElementById('confirm-modal-ok');
                const cancelBtn = document.getElementById('confirm-modal-cancel');
                const cancelBackdrop = modal.querySelector('[data-modal-cancel]');
                const actionsEl = modal.querySelector('.app-modal__actions');

                const existingInputWrap = modal.querySelector('.app-modal__input-wrap');
                if (existingInputWrap) existingInputWrap.remove();

                let modalInput = null;
                if (withPassword || withTextInput) {
                    const wrap = document.createElement('div');
                    wrap.className = 'app-modal__input-wrap';
                    wrap.style.margin = '12px 0 2px';
                    if (withPassword) {
                        wrap.innerHTML = `
                            <label for="confirm-modal-input" style="display:block;font-size:0.82rem;color:var(--text-muted,#a89880);margin-bottom:6px;">Password</label>
                            <input id="confirm-modal-input" type="password" autocomplete="current-password" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.2);color:var(--text-light,#f5eee6);outline:none;" />
                        `;
                    } else {
                        wrap.innerHTML = `
                            <label for="confirm-modal-input" style="display:block;font-size:0.82rem;color:var(--text-muted,#a89880);margin-bottom:6px;">Type DELETE to confirm</label>
                            <input id="confirm-modal-input" type="text" autocomplete="off" placeholder="DELETE" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.2);color:var(--text-light,#f5eee6);outline:none;text-transform:uppercase;letter-spacing:0.1em;" />
                        `;
                    }
                    modal.querySelector('.app-modal__dialog').insertBefore(wrap, actionsEl);
                    modalInput = wrap.querySelector('#confirm-modal-input');
                }

                titleEl.textContent = title;
                textEl.textContent = message;
                okBtn.textContent = confirmLabel;
                cancelBtn.textContent = cancelLabel;

                modal.hidden = false;
                document.body.classList.add('modal-open');
                setTimeout(() => {
                    if (modalInput) {
                        modalInput.focus();
                    } else {
                        okBtn.focus();
                    }
                }, 0);

                return new Promise((resolve) => {
                    const close = (value) => {
                        modal.hidden = true;
                        document.body.classList.remove('modal-open');
                        okBtn.removeEventListener('click', onOk);
                        cancelBtn.removeEventListener('click', onCancel);
                        cancelBackdrop.removeEventListener('click', onCancel);
                        document.removeEventListener('keydown', onKeydown);
                        const cleanup = modal.querySelector('.app-modal__input-wrap');
                        if (cleanup) cleanup.remove();
                        resolve(value);
                    };

                    const onOk = () => {
                        if (withPassword) {
                            const password = (modalInput?.value || '').trim();
                            close({ confirmed: true, password });
                        } else if (withTextInput) {
                            const textValue = (modalInput?.value || '').trim();
                            close({ confirmed: true, textValue });
                        } else {
                            close(true);
                        }
                    };
                    const onCancel = () => {
                        if (withPassword || withTextInput) {
                            close({ confirmed: false });
                        } else {
                            close(false);
                        }
                    };
                    const onKeydown = (event) => {
                        if (event.key === 'Escape') onCancel();
                        if ((withPassword || withTextInput) && event.key === 'Enter') onOk();
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
                    message: 'Course progress, achievements, and quiz history will be deleted. Do you want to continue?',
                    confirmLabel: 'Yes, reset',
                    cancelLabel: 'Cancel'
                });
                if (!confirmed) return;

                ProgressModule.resetUserProgress(user.id);
                AchievementsModule.resetUserAchievements(user.id);
                AchievementsModule.resetUserQuizStats(user.id);
                AchievementsModule.resetVisitedConsoles();
                localStorage.removeItem('cn_lesson_visits');

                renderCourses();
                renderAchievements();

                showSettingsMessage('Reset complete.', true);
            });

            const resendVerificationBtn = document.getElementById('resend-verification-btn');
            if (resendVerificationBtn) {
                resendVerificationBtn.addEventListener('click', async () => {
                    resendVerificationBtn.disabled = true;
                    resendVerificationBtn.textContent = 'Se trimite...';
                    try {
                        const result = await fetch(API_BASE_URL + '/resend-verification', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(localStorage.getItem('cn_token') ? { Authorization: 'Bearer ' + localStorage.getItem('cn_token') } : {})
                            },
                            credentials: 'include'
                        });
                        const data = await result.json();
                        showSettingsMessage(data.message || 'Emailul de verificare a fost retrimis.', !!data.success);
                    } catch {
                        showSettingsMessage('Could not resend verification email.', false);
                    } finally {
                        resendVerificationBtn.disabled = false;
                        resendVerificationBtn.textContent = 'Retrimite emailul de verificare';
                    }
                });
            }

            // ─── Google Link/Unlink handlers ────────────────
            const googleLinkBtn = document.getElementById('google-link-btn');
            if (googleLinkBtn) {
                googleLinkBtn.addEventListener('click', () => {
                    AuthModule.linkGoogle();
                });
            }

            const googleUnlinkBtn = document.getElementById('google-unlink-btn');
            if (googleUnlinkBtn) {
                googleUnlinkBtn.addEventListener('click', async () => {
                    const confirmed = await showConfirmDialog({
                        title: 'Disconnect Google',
                        message: 'Are you sure you want to disconnect your Google account?',
                        confirmLabel: 'Disconnect',
                        cancelLabel: 'Cancel'
                    });
                    if (!confirmed) return;

                    const result = await AuthModule.unlinkGoogle();
                    if (result.success) {
                        showSettingsMessage('Google has been disconnected.', true);
                        const card = document.getElementById('google-account-card');
                        if (card) card.remove();
                    } else {
                        showSettingsMessage(result.error || 'Eroare.', false);
                    }
                });
            }

            // ─── 2FA handlers ───────────────────────────────
            const refreshTwoFactorCard = () => {
                const card = document.getElementById('two-factor-card');
                if (card) card.remove();
                // Re-run initProfile would be heavy; just reload the page settings tab
                window.location.hash = 'setari';
                window.location.reload();
            };

            const setupEmail2faBtn = document.getElementById('setup-email-2fa-btn');
            if (setupEmail2faBtn) {
                setupEmail2faBtn.addEventListener('click', async () => {
                    const confirmed = await showConfirmDialog({
                        title: 'Enable Email 2FA',
                        message: 'You will receive a code by email on each login. Continue?',
                        confirmLabel: 'Enable',
                        cancelLabel: 'Cancel'
                    });
                    if (!confirmed) return;

                    const result = await AuthModule.enableEmailTwoFactor();
                    if (result.success) {
                        showSettingsMessage('2FA prin email a fost activat!', true);
                        refreshTwoFactorCard();
                    } else {
                        showSettingsMessage(result.error || 'Eroare.', false);
                    }
                });
            }

            const setupTotp2faBtn = document.getElementById('setup-totp-2fa-btn');
            if (setupTotp2faBtn) {
                setupTotp2faBtn.addEventListener('click', async () => {
                    const result = await AuthModule.setupTOTP();
                    if (!result.success) {
                        showSettingsMessage(result.error || 'Eroare la generarea codului QR.', false);
                        return;
                    }
                    const area = document.getElementById('totp-setup-area');
                    const qrContainer = document.getElementById('totp-qr-container');
                    const secretDisplay = document.getElementById('totp-secret-display');
                    qrContainer.innerHTML = '<img src="' + result.qrCode + '" alt="QR Code" style="max-width:200px;border-radius:8px;">';
                    secretDisplay.textContent = 'Cheie manuala: ' + result.secret;
                    area.style.display = 'block';
                    area.dataset.secret = result.secret;
                });
            }

            const totpConfirmBtn = document.getElementById('totp-confirm-btn');
            if (totpConfirmBtn) {
                totpConfirmBtn.addEventListener('click', async () => {
                    const code = document.getElementById('totp-confirm-code').value.trim();
                    const secret = document.getElementById('totp-setup-area').dataset.secret;
                    if (!code || code.length !== 6) {
                        showSettingsMessage('Introdu codul de 6 cifre.', false);
                        return;
                    }
                    const result = await AuthModule.confirmTOTP(code, secret);
                    if (result.success) {
                        showSettingsMessage('2FA prin aplicatie a fost activat!', true);
                        refreshTwoFactorCard();
                    } else {
                        showSettingsMessage(result.error || 'Cod invalid.', false);
                    }
                });
            }

            const disable2faHandler = async (method, label) => {
                const dialogResult = await showConfirmDialog({
                    title: 'Disable 2FA via ' + label,
                    message: 'Enter your password to disable 2FA via ' + label + '.',
                    confirmLabel: 'Disable',
                    cancelLabel: 'Cancel',
                    withPassword: true
                });
                if (!dialogResult || !dialogResult.confirmed) return;
                if (!dialogResult.password) {
                    showSettingsMessage('Enter your password to confirm.', false);
                    return;
                }

                const result = await AuthModule.disableTwoFactor(dialogResult.password, method);
                if (result.success) {
                    showSettingsMessage(result.message || '2FA a fost dezactivat.', true);
                    refreshTwoFactorCard();
                } else {
                    showSettingsMessage(result.error || 'Eroare.', false);
                }
            };

            const disableTotpBtn = document.getElementById('disable-totp-btn');
            if (disableTotpBtn) {
                disableTotpBtn.addEventListener('click', () => disable2faHandler('totp', 'aplicatie'));
            }

            const disableEmailBtn = document.getElementById('disable-email-btn');
            if (disableEmailBtn) {
                disableEmailBtn.addEventListener('click', () => disable2faHandler('email', 'email'));
            }

            // ─── Google link success from URL params ────────
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('google_linked') === '1') {
                showSettingsMessage('Contul Google a fost conectat cu succes!', true);
                history.replaceState(null, '', window.location.pathname + window.location.hash);
            }
            if (urlParams.get('error') === 'google_already_linked') {
                showSettingsMessage('Acest cont Google este deja folosit de alt utilizator.', false);
                history.replaceState(null, '', window.location.pathname + window.location.hash);
            }

            const deleteAccountBtn = document.getElementById('delete-account-btn');
            if (deleteAccountBtn) {
                deleteAccountBtn.addEventListener('click', async () => {
                    let result;

                    if (user.has_password) {
                        const dialogResult = await showConfirmDialog({
                            title: 'Delete account',
                            message: 'This action is permanent. Enter your password to confirm.',
                            confirmLabel: 'Delete account',
                            cancelLabel: 'Cancel',
                            withPassword: true
                        });
                        if (!dialogResult || !dialogResult.confirmed) return;
                        if (!dialogResult.password) {
                            showSettingsMessage('Enter your password to confirm.', false);
                            return;
                        }
                        result = await AuthModule.deleteAccount({ password: dialogResult.password });
                    } else {
                        const dialogResult = await showConfirmDialog({
                            title: 'Sterge contul',
                            message: 'Your account is connected only via Google and has no password. Type DELETE to confirm permanent account deletion.',
                            confirmLabel: 'Delete account',
                            cancelLabel: 'Cancel',
                            withTextInput: true
                        });
                        if (!dialogResult || !dialogResult.confirmed) return;
                        if (!dialogResult.textValue) {
                            showSettingsMessage('Scrie STERGE pentru a confirma.', false);
                            return;
                        }
                        result = await AuthModule.deleteAccount({ confirmText: dialogResult.textValue });
                    }

                    if (!result.success) {
                        showSettingsMessage(result.error || 'Could not delete the account.', false);
                        return;
                    }

                    await AuthModule.logout();
                    window.location.href = '/html/pages/index.html';
                });
            }

            // ─── Active Sessions ────────────────────────────
            /** Fetch and render active login sessions table */
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
                        const logoutBtn = `<button class="session-logout-btn" data-session-id="${s.id}" data-is-current="${s.is_current ? '1' : '0'}" style="background:none;border:1px solid rgba(229,115,115,0.4);color:#e57373;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;margin-top:6px;">Deconectare</button>`;

                        return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;">
                            <div style="font-size:0.9rem;color:var(--text-light);">${icon} ${escapeHtml(s.browser)} pe ${escapeHtml(s.operating_system)}${current}</div>
                            <div style="font-size:0.78rem;color:var(--text-muted,#a89880);margin-top:4px;">IP: ${escapeHtml(s.ip_address)} · Ultima activitate: ${ago}</div>
                            ${logoutBtn}
                        </div>`;
                    }).join('');

                    // Show bulk logout button when at least one session exists
                    logoutOthersBtn.hidden = sessions.length === 0;

                    // Bind individual session logout buttons
                    container.querySelectorAll('.session-logout-btn').forEach(btn => {
                        btn.addEventListener('click', async () => {
                            const sid = parseInt(btn.dataset.sessionId, 10);
                            const isCurrent = btn.dataset.isCurrent === '1';
                            const result = await AuthModule.terminateSession(sid);
                            if (!result.success) return;

                            if (isCurrent) {
                                await AuthModule.logout();
                                window.location.href = '/html/pages/login.html';
                                return;
                            }

                            loadSessions();
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
                const result = await AuthModule.terminateAllSessions();
                if (result.success) {
                    window.location.href = '/html/pages/login.html';
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

            // Load my marketplace listings
            loadMyListings();

            // Load favorite listings
            loadFavorites();
        }

        // ─── Friend Search ──────────────────────────────────

        /** Initialize friend search with debounced user lookup */
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

        /** Fetch and display incoming/outgoing friend requests */
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

        /** Fetch and display accepted friends list */
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

        /** Render the overview dashboard: progress, favorites, ratings summary */
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

        /** Fetch and display user's console ratings as star cards */
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

        /** Render course progress bars from localStorage data */
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

        /** Render earned achievement badges */
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

        /** Initialize the owned-consoles multi-select dropdown */
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
                const normalizedFilter = String(filter || '').trim().toLowerCase();
                const filtered = filter
                    ? allConsoles.filter(c => {
                        const idText = String(c.id || '').toLowerCase();
                        const nameText = formatConsoleDisplayName(c.name || c.id || '').toLowerCase();
                        return idText.includes(normalizedFilter) || nameText.includes(normalizedFilter);
                    })
                    : allConsoles;

                if (filtered.length === 0) {
                    listEl.innerHTML = '<p style="color:var(--text-gray);font-size:0.85rem;padding:8px;">Nicio consolă găsită.</p>';
                    return;
                }

                listEl.innerHTML = filtered.map(c => {
                    const checked = selectedIds.has(c.id);
                    const displayName = formatConsoleDisplayName(c.name || c.id);
                    return `<label class="owned-console-item${checked ? ' checked' : ''}">
                        <input type="checkbox" value="${escapeHtml(c.id)}" ${checked ? 'checked' : ''}>
                        <span class="owned-console-check">${checked ? '☑' : '☐'}</span>
                        <span class="owned-console-name">${escapeHtml(displayName)}</span>
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

        // ─── My Listings ("Anunțurile mele") ─────────────────

        const LISTING_CONDITIONS = { new: 'Nou', like_new: 'Ca nou', good: 'Bun', fair: 'Acceptabil', parts: 'Piese' };
        const LISTING_CATEGORIES = { consoles: 'Console', games: 'Jocuri', accessories: 'Accesorii', parts: 'Piese / Reparații' };

        /** Authenticated API helper for marketplace calls */
        async function mpApi(method, path, body) {
            const token = localStorage.getItem('cn_token');
            const opts = { method, headers: {}, credentials: 'include' };
            if (token) opts.headers['Authorization'] = 'Bearer ' + token;
            if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
            const res = await fetch(API_BASE_URL + path, opts);
            return res.json();
        }

        // Bind action buttons ONCE (event delegation)
        (function bindMyListingsActions() {
            const container = document.getElementById('my-listings-container');
            if (!container) return;
            container.addEventListener('click', async e => {
                const btn = e.target.closest('.my-listing-action');
                if (btn) {
                    const id = parseInt(btn.dataset.id, 10);
                    const action = btn.dataset.action;

                    if (action === 'deactivate') {
                        await mpApi('PATCH', `/marketplace/listings/${id}/status`, { status: 'inactive' });
                        loadMyListings();
                    } else if (action === 'activate') {
                        await mpApi('PATCH', `/marketplace/listings/${id}/status`, { status: 'active' });
                        loadMyListings();
                    } else if (action === 'sold') {
                        await mpApi('PATCH', `/marketplace/listings/${id}/sold`);
                        loadMyListings();
                    } else if (action === 'delete') {
                        if (!(await confirmModal('Sigur vrei să ștergi acest anunț? Acțiunea este permanentă.'))) return;
                        await mpApi('DELETE', `/marketplace/listings/${id}`);
                        loadMyListings();
                    } else if (action === 'edit') {
                        openEditListingModal(id);
                    }
                    return;
                }

                // Click on the listing row itself → navigate to listing detail
                const row = e.target.closest('.my-listing-row');
                if (row) {
                    const id = row.dataset.listingId;
                    if (id) window.location.href = `community.html#listing-${id}`;
                }
            });
        })();

        /** Fetch and render the user's own marketplace listings */
        async function loadMyListings() {
            const container = document.getElementById('my-listings-container');
            if (!container) return;

            try {
                const data = await mpApi('GET', '/marketplace/listings/mine');
                if (!data.success) throw 0;
                const listings = data.listings || [];

                if (!listings.length) {
                    container.innerHTML = '<div class="my-listings-empty"><div class="my-listings-empty__icon">📦</div><p>Nu ai niciun anunț postat.</p><button class="hub-btn hub-btn--primary hub-btn--sm" id="btn-create-listing-empty" style="margin-top:12px">Publică primul anunț</button></div>';
                    document.getElementById('btn-create-listing-empty')?.addEventListener('click', openCreateListingModal);
                    return;
                }

                container.innerHTML = listings.map(l => {
                    const imgs = Array.isArray(l.images) ? l.images : [];
                    const statusMap = { active: { label: 'Activ', cls: 'active' }, inactive: { label: 'Dezactivat', cls: 'inactive' }, sold: { label: 'Vândut', cls: 'sold' } };
                    const st = statusMap[l.status] || statusMap.active;
                    const date = new Date(l.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

                    return `<div class="my-listing-row" data-listing-id="${l.id}">
                        <div class="my-listing-row__thumb">
                            ${imgs[0] ? `<img src="${escapeHtml(imgs[0])}" alt="">` : '<img src="/assets/images/graphics/no-image-placeholder.jpg" alt="">'}
                        </div>
                        <div class="my-listing-row__info">
                            <div class="my-listing-row__title">${escapeHtml(l.title)}</div>
                            <div class="my-listing-row__meta">
                                <span class="my-listing-status my-listing-status--${st.cls}">${st.label}</span>
                                <span class="my-listing-row__price">${Number(l.price).toFixed(0)} RON</span>
                                <span class="my-listing-row__cat">${LISTING_CATEGORIES[l.category] || l.category}</span>
                            </div>
                            <div class="my-listing-row__stats">
                                <span>👁 ${l.views || 0}</span>
                                <span>❤️ ${l.favorites_count || 0}</span>
                                <span>📅 ${date}</span>
                            </div>
                        </div>
                        <div class="my-listing-row__actions">
                            ${l.status === 'active' ? `<button class="my-listing-action my-listing-action--deactivate" data-action="deactivate" data-id="${l.id}" title="Dezactivează">⏸️</button>` : ''}
                            ${l.status === 'inactive' ? `<button class="my-listing-action my-listing-action--activate" data-action="activate" data-id="${l.id}" title="Activează">▶️</button>` : ''}
                            ${l.status === 'active' ? `<button class="my-listing-action my-listing-action--sold" data-action="sold" data-id="${l.id}" title="Marchează vândut">✓</button>` : ''}
                            <button class="my-listing-action my-listing-action--edit" data-action="edit" data-id="${l.id}" title="Editează">✏️</button>
                            <button class="my-listing-action my-listing-action--delete" data-action="delete" data-id="${l.id}" title="Șterge">🗑️</button>
                        </div>
                    </div>`;
                }).join('');
            } catch {
                container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca anunțurile.</p>';
            }
        }

        // ─── Favorite Listings ("Anunțuri apreciate") ────────

        async function loadFavorites() {
            const container = document.getElementById('favorites-container');
            if (!container) return;

            try {
                const data = await mpApi('GET', '/marketplace/favorites');
                if (!data.success) throw 0;
                const listings = data.listings || [];

                if (!listings.length) {
                    container.innerHTML = `<div class="my-listings-empty">
                        <div class="my-listings-empty__icon">❤️</div>
                        <p>Nu ai niciun anunț apreciat încă.</p>
                        <p style="color:var(--text-gray);font-size:0.82rem;margin-top:4px">Explorează Marketplace-ul și salvează ce îți place.</p>
                        <a href="community.html" class="hub-btn hub-btn--primary hub-btn--sm" style="margin-top:12px">→ Mergi la Marketplace</a>
                    </div>`;
                    return;
                }

                container.innerHTML = listings.map(l => {
                    const imgs = Array.isArray(l.images) ? l.images : [];
                    const date = new Date(l.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
                    return `<div class="my-listing-row" data-listing-id="${l.id}">
                        <div class="my-listing-row__thumb">
                            ${imgs[0] ? `<img src="${escapeHtml(imgs[0])}" alt="">` : '<img src="/assets/images/graphics/no-image-placeholder.jpg" alt="">'}
                        </div>
                        <div class="my-listing-row__info">
                            <div class="my-listing-row__title">${escapeHtml(l.title)}</div>
                            <div class="my-listing-row__meta">
                                <span class="my-listing-row__price">${Number(l.price).toFixed(0)} RON</span>
                                <span class="my-listing-row__cat">${LISTING_CATEGORIES[l.category] || l.category}</span>
                            </div>
                            <div class="my-listing-row__stats">
                                <span>🏪 ${escapeHtml(l.seller_name)}</span>
                                <span>📅 ${date}</span>
                            </div>
                        </div>
                        <div class="my-listing-row__actions">
                            <button class="my-listing-action" data-action="unfav" data-id="${l.id}" title="Elimină din favorite">❤️</button>
                        </div>
                    </div>`;
                }).join('');

                container.addEventListener('click', async e => {
                    const btn = e.target.closest('[data-action="unfav"]');
                    if (btn) {
                        const id = parseInt(btn.dataset.id, 10);
                        await mpApi('POST', `/marketplace/listings/${id}/favorite`);
                        loadFavorites();
                        return;
                    }
                    const row = e.target.closest('.my-listing-row');
                    if (row && row.dataset.listingId) {
                        window.location.href = `community.html#listing-${row.dataset.listingId}`;
                    }
                });
            } catch {
                container.innerHTML = '<p style="color:#e57373;font-size:0.85rem;">Nu s-au putut încărca favoritele.</p>';
            }
        }

        /** Open a modal pre-filled with listing data for editing */
        async function openEditListingModal(id) {
            try {
                const data = await mpApi('GET', `/marketplace/listings/${id}`);
                if (!data.success) { alert('Could not load the listing.'); return; }
                const l = data.listing;

                document.querySelector('.edit-listing-overlay')?.remove();
                const overlay = document.createElement('div');
                overlay.className = 'hub-modal-overlay edit-listing-overlay';
                overlay.innerHTML = `
                    <div class="hub-modal">
                        <div class="hub-modal__header">
                            <span class="hub-modal__title">Editează anunțul</span>
                            <button class="hub-modal__close">&times;</button>
                        </div>
                        <form class="hub-modal__body" id="edit-listing-form">
                            <div class="hub-form-group"><label class="hub-form-label">Titlu</label><input class="hub-form-input" name="title" maxlength="100" required value="${escapeHtml(l.title)}"></div>
                            <div class="hub-form-row">
                                <div class="hub-form-group"><label class="hub-form-label">Preț (RON)</label><input class="hub-form-input" name="price" type="number" min="0" step="1" required value="${l.price}"></div>
                                <div class="hub-form-group"><label class="hub-form-label">Stare</label><select class="hub-form-select" name="condition">${Object.entries(LISTING_CONDITIONS).map(([k, v]) => `<option value="${k}"${k === l.condition ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
                            </div>
                            <div class="hub-form-group"><label class="hub-form-label">Categorie</label><select class="hub-form-select" name="category">${Object.entries(LISTING_CATEGORIES).map(([k, v]) => `<option value="${k}"${k === l.category ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
                            <div class="hub-form-group"><label class="hub-form-label">Consolă</label><select class="hub-form-select" name="console_type"><option value="">— Alege consola —</option>${(window.CONSOLES_DATA || []).slice().sort((a, b) => a.nume.localeCompare(b.nume)).map(c => `<option value="${c.id}"${c.id === (l.console_type || '') ? ' selected' : ''}>${c.nume}</option>`).join('')}</select></div>
                            <div class="hub-form-group"><label class="hub-form-label">Descriere</label><textarea class="hub-form-textarea" name="description" maxlength="3000" required rows="4">${escapeHtml(l.description)}</textarea></div>
                            <div class="hub-form-row">
                            <div class="hub-form-group">
                                <label class="hub-form-label">Țară</label>
                                <select class="hub-form-select" name="country" required>
                                    <option value="">— Alege țara —</option>
                                    ${window.LOCATION_DATA.countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="hub-form-group">
                                <label class="hub-form-label">Oraș</label>
                                <select class="hub-form-select" name="location" required disabled>
                                    <option value="">— Alege mai întâi țara —</option>
                                </select>
                            </div>
                            </div>
                            <div class="hub-form-group"><label class="hub-form-label">Telefon</label><input class="hub-form-input" name="phone" maxlength="20" required value="${escapeHtml(l.phone || '')}"></div>
                            <div class="hub-form-group"><label class="hub-form-label">Link OLX (opțional)</label><input class="hub-form-input" name="olx_url" type="url" value="${escapeHtml(l.olx_url || '')}"></div>
                            <div class="hub-modal__footer" style="padding:0;border:none">
                                <button type="button" class="hub-btn hub-btn--secondary edit-listing-cancel">Anulează</button>
                                <button type="submit" class="hub-btn hub-btn--primary">Salvează</button>
                            </div>
                        </form>
                    </div>`;
                document.body.appendChild(overlay);

                const close = () => overlay.remove();
                overlay.querySelector('.hub-modal__close').addEventListener('click', close);
                overlay.querySelector('.edit-listing-cancel').addEventListener('click', close);
                overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
                overlay.querySelector('[name="country"]').addEventListener('change', e => {
                const citySelect = overlay.querySelector('[name="location"]');
                const country = window.LOCATION_DATA.countries.find(c => c.code === e.target.value);
                citySelect.innerHTML = '<option value="">— Alege orașul —</option>' +
                    (country?.cities || []).map(c => `<option value="${c}">${c}</option>`).join('');
                citySelect.disabled = !e.target.value;
                });

                overlay.querySelector('#edit-listing-form').addEventListener('submit', async e => {
                    e.preventDefault();
                    const f = e.target, btn = f.querySelector('[type="submit"]');
                    btn.disabled = true; btn.textContent = 'Se salvează…';
                    const res = await mpApi('PUT', `/marketplace/listings/${id}`, {
                        title: f.title.value.trim(),
                        description: f.description.value.trim(),
                        price: parseFloat(f.price.value),
                        condition: f.condition.value,
                        category: f.category.value,
                        location: f.location.value.trim(),
                        country: f.country.value.trim(),
                        phone: f.phone.value.trim(),
                        olx_url: f.olx_url.value.trim(),
                    });
                    if (res.success) { close(); loadMyListings(); }
                    else { btn.disabled = false; btn.textContent = 'Salvează'; alert(res.error || 'Eroare.'); }
                });
            } catch { alert('Eroare la încărcarea anunțului.'); }
        }

        /** Open a modal to create a brand-new listing from the profile page */
        function openCreateListingModal() {
            const MAX_IMAGES = 8;
            let selectedFiles = [];

            document.querySelector('.create-listing-overlay')?.remove();
            const overlay = document.createElement('div');
            overlay.className = 'hub-modal-overlay create-listing-overlay';
            overlay.innerHTML = `
                <div class="hub-modal">
                    <div class="hub-modal__header">
                        <span class="hub-modal__title">Publică un anunț</span>
                        <button class="hub-modal__close">&times;</button>
                    </div>
                    <form class="hub-modal__body" id="create-listing-form">
                        <div class="hub-form-group"><label class="hub-form-label">Titlu</label><input class="hub-form-input" name="title" maxlength="100" required placeholder="ex: PlayStation 4 Slim 500GB"></div>
                        <div class="hub-form-row">
                            <div class="hub-form-group"><label class="hub-form-label">Preț (RON)</label><input class="hub-form-input" name="price" type="number" min="0" step="1" required placeholder="0"></div>
                            <div class="hub-form-group"><label class="hub-form-label">Stare</label><select class="hub-form-select" name="condition">${Object.entries(LISTING_CONDITIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
                        </div>
                        <div class="hub-form-group"><label class="hub-form-label">Categorie</label><select class="hub-form-select" name="category">${Object.entries(LISTING_CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
                        <div class="hub-form-group"><label class="hub-form-label">Descriere</label><textarea class="hub-form-textarea" name="description" maxlength="3000" required rows="4" placeholder="Descrie produsul…"></textarea></div>
                        <div class="hub-form-row">
                            <div class="hub-form-group">
                                <label class="hub-form-label">Țară</label>
                                <select class="hub-form-select" name="country" required>
                                    <option value="">— Alege țara —</option>
                                    ${window.LOCATION_DATA.countries.map(c => `<option value="${c.code}">${c.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="hub-form-group">
                                <label class="hub-form-label">Oraș</label>
                                <select class="hub-form-select" name="location" required disabled>
                                    <option value="">— Alege mai întâi țara —</option>
                                </select>
                            </div>
                        </div>
                        <div class="hub-form-group"><label class="hub-form-label">Telefon</label><input class="hub-form-input" name="phone" maxlength="20" required placeholder="+40…"></div>
                        <div class="hub-form-group"><label class="hub-form-label">Link OLX (opțional)</label><input class="hub-form-input" name="olx_url" type="url" placeholder="https://www.olx.ro/…"></div>
                        <div class="hub-form-group">
                            <label class="hub-form-label">Imagini (max ${MAX_IMAGES} fotografii)</label>
                            <div class="hub-upload-zone" id="create-upload-zone">
                                <input type="file" id="create-upload-input" accept="image/jpeg,image/png,image/webp" multiple hidden>
                                <span class="hub-upload-zone__icon">📁</span>
                                <span class="hub-upload-zone__text">Trage fotografiile aici sau click pentru a alege</span>
                            </div>
                            <div class="hub-upload-counter" id="create-upload-counter">0 / ${MAX_IMAGES} imagini selectate</div>
                            <div class="hub-upload-grid" id="create-upload-grid"></div>
                        </div>
                        <div class="hub-modal__footer" style="padding:0;border:none">
                            <button type="button" class="hub-btn hub-btn--secondary create-listing-cancel">Anulează</button>
                            <button type="submit" class="hub-btn hub-btn--primary">Publică</button>
                        </div>
                    </form>
                </div>`;
            document.body.appendChild(overlay);

            const close = () => overlay.remove();
            overlay.querySelector('.hub-modal__close').addEventListener('click', close);
            overlay.querySelector('.create-listing-cancel').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            overlay.querySelector('[name="country"]').addEventListener('change', e => {
                const citySelect = overlay.querySelector('[name="location"]');
                const country = window.LOCATION_DATA.countries.find(c => c.code === e.target.value);
                citySelect.innerHTML = '<option value="">— Alege orașul —</option>' +
                    (country?.cities || []).map(c => `<option value="${c}">${c}</option>`).join('');
                citySelect.disabled = !e.target.value;
            });

            const uploadZone = overlay.querySelector('#create-upload-zone');
            const uploadInput = overlay.querySelector('#create-upload-input');
            const uploadGrid = overlay.querySelector('#create-upload-grid');
            const uploadCounter = overlay.querySelector('#create-upload-counter');

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
                selectedFiles.splice(parseInt(btn.dataset.idx, 10), 1);
                updatePreviews();
            });

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

            overlay.querySelector('#create-listing-form').addEventListener('submit', async e => {
                e.preventDefault();
                const f = e.target, btn = f.querySelector('[type="submit"]');
                btn.disabled = true; btn.textContent = 'Se publică…';
                const imageUrls = await Promise.all(selectedFiles.map(resizeImage));
                const res = await mpApi('POST', '/marketplace/listings', {
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
                if (res.success) { close(); loadMyListings(); }
                else { btn.disabled = false; btn.textContent = 'Publică'; alert(res.error || 'Eroare.'); }
            });
        }

        // Bind header "+ Anunț nou" button
        document.getElementById('btn-create-listing')?.addEventListener('click', openCreateListingModal);

        initProfile();