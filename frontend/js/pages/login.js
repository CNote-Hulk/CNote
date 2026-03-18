/**
 * Login Page Script
 * Handles server login, local login, Google OAuth, 2FA verification,
 * email fallback, resend verification, and URL error display.
 */
import { AuthModule } from '../modules/auth.js';

// ─── Handle Google OAuth redirect ────────────────
const googleData = AuthModule.handleGoogleRedirect();
if (googleData && googleData.user) {
    window.location.href = 'profil.html';
}

// Auto-login: check if token is still valid
(async () => {
    const user = await AuthModule.autoLogin();
    if (user) {
        window.location.href = 'profil.html';
        return;
    }
})();

// ─── Tab switching ──────────────────────────────
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

// ─── Server login ───────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    errorEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Se conectează...';

    try {
        const result = await AuthModule.login(email, password);
        if (result.twoFactorRequired) {
            // Show 2FA section, hide login form
            document.getElementById('login-form').style.display = 'none';
            document.querySelector('.auth-separator').style.display = 'none';
            document.getElementById('google-login-btn').style.display = 'none';
            document.querySelector('#tab-server > .auth-link:last-child').style.display = 'none';
            const tfSection = document.getElementById('two-factor-section');
            tfSection.style.display = 'block';
            tfSection.dataset.method = result.method || 'totp';
            const tfInfo = document.getElementById('two-factor-info');
            const fallbackEl = document.getElementById('two-factor-fallback');
            if (result.method === 'email') {
                tfInfo.textContent = 'Am trimis un cod de verificare pe email.';
                fallbackEl.style.display = 'none';
            } else {
                tfInfo.textContent = 'Introdu codul din aplicația de autentificare.';
                fallbackEl.style.display = result.canFallbackToEmail ? 'block' : 'none';
            }
            document.getElementById('two-factor-code').focus();
        } else if (result.success) {
            window.location.href = 'profil.html';
        } else if (result.error === 'email_not_verified') {
            errorEl.classList.remove('visible');
            const verifyWarn = document.getElementById('login-verify-warning');
            verifyWarn.style.display = 'block';
            verifyWarn.dataset.email = email;
            document.getElementById('resend-verify-msg').style.display = 'none';
        } else {
            errorEl.textContent = result.error;
            errorEl.classList.add('visible');
        }
    } catch {
        errorEl.textContent = 'Nu s-a putut contacta serverul.';
        errorEl.classList.add('visible');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Conectare';
    }
});

// ─── Local login ────────────────────────────────
document.getElementById('local-login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('local-username').value.trim();
    const errorEl = document.getElementById('local-login-error');

    errorEl.classList.remove('visible');

    if (!username) {
        errorEl.textContent = 'Introdu un nume de utilizator.';
        errorEl.classList.add('visible');
        return;
    }

    AuthModule.localLogin(username);
    window.location.href = 'profil.html';
});

// ─── 2FA verification ───────────────────────────
document.getElementById('two-factor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('two-factor-code').value.trim();
    const errorEl = document.getElementById('two-factor-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const currentMethod = document.getElementById('two-factor-section').dataset.method || 'totp';

    errorEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Se verifică...';

    try {
        const result = await AuthModule.verifyTwoFactor(code, currentMethod);
        if (result.success) {
            window.location.href = 'profil.html';
        } else {
            errorEl.textContent = result.error || 'Cod invalid.';
            errorEl.classList.add('visible');
        }
    } catch {
        errorEl.textContent = 'Nu s-a putut contacta serverul.';
        errorEl.classList.add('visible');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verifică';
    }
});

// ─── 2FA back button ────────────────────────────
document.getElementById('two-factor-back').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('cnote_temp_token');
    document.getElementById('two-factor-section').style.display = 'none';
    document.getElementById('two-factor-fallback').style.display = 'none';
    document.getElementById('login-form').style.display = '';
    document.querySelector('.auth-separator').style.display = '';
    document.getElementById('google-login-btn').style.display = '';
    document.querySelector('#tab-server > .auth-link:last-child').style.display = '';
    document.getElementById('two-factor-code').value = '';
    document.getElementById('two-factor-error').classList.remove('visible');
});

// ─── 2FA fallback to email ──────────────────────
document.getElementById('two-factor-fallback-link').addEventListener('click', async (e) => {
    e.preventDefault();
    const link = e.target;
    const errorEl = document.getElementById('two-factor-error');
    const tfInfo = document.getElementById('two-factor-info');

    link.style.pointerEvents = 'none';
    link.textContent = 'Sending code...';
    errorEl.classList.remove('visible');

    try {
        const result = await AuthModule.requestEmailFallback();
        if (result.success) {
            tfInfo.textContent = 'Am trimis un cod de verificare pe email.';
            document.getElementById('two-factor-section').dataset.method = 'email';
            document.getElementById('two-factor-fallback').style.display = 'none';
            document.getElementById('two-factor-code').value = '';
            document.getElementById('two-factor-code').focus();
        } else {
            errorEl.textContent = result.error || 'Nu s-a putut trimite codul.';
            errorEl.classList.add('visible');
        }
    } catch {
        errorEl.textContent = 'Nu s-a putut contacta serverul.';
        errorEl.classList.add('visible');
    } finally {
        link.style.pointerEvents = '';
        link.textContent = 'Nu ai acces la aplicație? Primește cod pe email';
    }
});

// ─── Google login button ────────────────────────
document.getElementById('google-login-btn').addEventListener('click', () => {
    AuthModule.loginWithGoogle();
});

// ─── Resend verification email ──────────────────
document.getElementById('resend-verify-btn').addEventListener('click', async (e) => {
    const btn = e.target;
    const warn = document.getElementById('login-verify-warning');
    const msgEl = document.getElementById('resend-verify-msg');
    const email = warn.dataset.email;
    if (!email) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';
    msgEl.style.display = 'none';

    try {
        const data = await AuthModule._api('POST', '/resend-verification-public', { email });
        msgEl.textContent = 'Email retrimis! Verifică căsuța de email.';
        msgEl.style.color = 'var(--success, #4ade80)';
        msgEl.style.display = 'block';
    } catch {
        msgEl.textContent = 'Nu s-a putut retrimite emailul.';
        msgEl.style.color = '#e57373';
        msgEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Resend verification email';
    }
});

// ─── Show error from URL params ─────────────────
const urlParams = new URLSearchParams(window.location.search);
const googleError = urlParams.get('error');
if (googleError) {
    const errorEl = document.getElementById('login-error');
    const errorMessages = {
        'google_failed': 'Autentificarea Google a eșuat.',
        'google_auth_failed': 'Eroare la autentificarea cu Google.',
        'google_not_configured': 'Google OAuth nu este configurat.'
    };
    errorEl.textContent = errorMessages[googleError] || 'Eroare la autentificare.';
    errorEl.classList.add('visible');
    history.replaceState(null, '', window.location.pathname);
}
