/**
 * Reset Password Page Script
 * Validates token from URL, handles password reset/set form submission.
 * When ?mode=set is present the copy changes to "Set Password" instead of "Reset Password".
 */
import { API_BASE_URL } from '../config.js';

(function() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');
    var isSetMode = params.get('mode') === 'set';

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
        document.getElementById('reset-form-section').hidden = true;
        document.getElementById('reset-invalid').hidden = false;
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

        if (password.length < 6) {
            errorEl.textContent = 'Password must be at least 6 characters long.';
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
