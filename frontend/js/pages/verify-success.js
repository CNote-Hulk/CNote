/**
 * Verify Email Success Page Script
 * Verifies email token from URL, shows result, handles resend.
 */
import { API_BASE_URL } from '../config.js';

(async function() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const loadingEl = document.getElementById('verify-loading');
    const successEl = document.getElementById('verify-success');
    const errorEl = document.getElementById('verify-error');
    const resendBtn = document.getElementById('verify-resend-btn');

    if (!token) {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        document.getElementById('verify-error-msg').textContent = 'Link invalid — lipsește tokenul de verificare.';
        return;
    }

    try {
        const res = await fetch(API_BASE_URL + '/verify-email?token=' + encodeURIComponent(token));
        const data = await res.json();

        loadingEl.hidden = true;
        if (data.success) {
            successEl.hidden = false;
            document.getElementById('verify-success-msg').textContent = data.message || 'Emailul tău a fost verificat cu succes!';
        } else {
            errorEl.hidden = false;
            document.getElementById('verify-error-msg').textContent = data.error || 'Verificarea a eșuat.';
        }
    } catch {
        loadingEl.hidden = true;
        errorEl.hidden = false;
        document.getElementById('verify-error-msg').textContent = 'Nu s-a putut contacta serverul. Încearcă din nou.';
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            const email = window.prompt('Introdu adresa de email pentru retrimiterea linkului de verificare:');
            if (!email) return;

            resendBtn.disabled = true;
            resendBtn.textContent = 'Se trimite...';

            try {
                const res = await fetch(API_BASE_URL + '/resend-verification-public', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                document.getElementById('verify-error-msg').textContent = data.success
                    ? 'Dacă există un cont neverificat cu acest email, am retrimis linkul de verificare.'
                    : (data.error || 'Nu s-a putut retrimite emailul.');
            } catch {
                document.getElementById('verify-error-msg').textContent = 'Nu s-a putut retrimite emailul de verificare.';
            } finally {
                resendBtn.disabled = false;
                resendBtn.textContent = 'Retrimite emailul de verificare';
            }
        });
    }
})();
