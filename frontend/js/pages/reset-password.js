/**
 * Reset Password Page Script
 * Validates token from URL, handles password reset form submission.
 */
import { API_BASE_URL } from '../config.js';

(function() {
    var params = new URLSearchParams(window.location.search);
    var token = params.get('token');

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
            errorEl.textContent = 'Parolele nu coincid.';
            errorEl.classList.add('visible');
            return;
        }

        if (password.length < 6) {
            errorEl.textContent = 'Parola trebuie să aibă minim 6 caractere.';
            errorEl.classList.add('visible');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Se resetează...';

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
                document.getElementById('reset-success-msg').textContent = data.message || 'Parola a fost resetată cu succes!';
            } else {
                errorEl.textContent = data.error || 'A apărut o eroare.';
                errorEl.classList.add('visible');
            }
        } catch {
            errorEl.textContent = 'Nu s-a putut contacta serverul. Încearcă din nou.';
            errorEl.classList.add('visible');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Resetează Parola';
        }
    });
})();
