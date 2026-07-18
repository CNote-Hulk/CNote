/**
 * Reset Password Page Script
 * Validates token from URL, handles password reset/set form submission.
 * When ?mode=set is present the copy changes to "Set Password" instead of "Reset Password".
 */
import { API_BASE_URL } from '../config.js';

(async function() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    var isSetMode = params.get('mode') === 'set';

    function showInvalid(msg) {
        document.getElementById('reset-form-section').hidden = true;
        document.getElementById('reset-invalid').hidden = false;
        var msgEl = document.getElementById('reset-invalid-msg');
        if (msgEl && msg) msgEl.textContent = msg;
    }

    // Adapt copy for set-password mode
    if (isSetMode) {
        var subtitle = document.querySelector('[data-i18n="reset_subtitle"]');
        if (subtitle) subtitle.textContent = 'Choose a password for your Console Notebook account.';
        var submitBtn = document.getElementById('reset-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Set Password';
        var successTitle = document.querySelector('[data-i18n="reset_success_title"]');
        if (successTitle) successTitle.textContent = '✅ Password Set';
        var successMsg = document.getElementById('reset-success-msg');
        if (successMsg) successMsg.setAttribute('data-i18n', '');
    }

    if (!token) {
        showInvalid('Reset link is missing or invalid.');
        return;
    }

    // Validate token on load — show expired state immediately if invalid
    try {
        var checkRes = await fetch(API_BASE_URL + '/check-reset-token?token=' + encodeURIComponent(token));
        var checkData = await checkRes.json();
        if (!checkData.valid) {
            showInvalid('This link has expired or is invalid. Please request a new one.');
            return;
        }
    } catch {
        showInvalid('Unable to contact the server. Please try again later.');
        return;
    }

    document.getElementById('reset-password-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        var password = document.getElementById('new-password').value;
        var confirm = document.getElementById('new-password-confirm').value;
        var errorEl = document.getElementById('reset-error');
        var submitBtn = document.getElementById('reset-submit-btn');

        errorEl.classList.remove('visible');

        if (password !== confirm) {
            errorEl.textContent = 'Passwords do not match.';
            errorEl.classList.add('visible');
            return;
        }

        if (password.length < 8 ||
            !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errorEl.textContent = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
            errorEl.classList.add('visible');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = isSetMode ? 'Setting...' : 'Resetting...';

        try {
            var res = await fetch(API_BASE_URL + '/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, newPassword: password })
            });
            var data = await res.json();

            if (data.success) {
                document.getElementById('reset-form-section').hidden = true;
                document.getElementById('reset-success').hidden = false;
                document.getElementById('reset-success-msg').textContent = isSetMode
                    ? 'Your password has been set. You can now log in with your email and password.'
                    : (data.message || 'Password has been reset successfully!');
            } else {
                errorEl.textContent = data.error || 'An error occurred.';
                errorEl.classList.add('visible');
            }
        } catch {
            errorEl.textContent = 'Unable to contact the server. Please try again.';
            errorEl.classList.add('visible');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isSetMode ? 'Set Password' : 'Reset Password';
        }
    });
})();
