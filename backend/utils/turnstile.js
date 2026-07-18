/* ─────────────────────────────────────────
   FILE: turnstile.js
   DESCRIPTION: Cloudflare Turnstile (CAPTCHA) server-side verification.
   Used to gate bot-prone public endpoints (registration, contact form).
   ───────────────────────────────────────── */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * verifyTurnstileToken
 * @description Verifies a Turnstile token against Cloudflare's siteverify
 *              endpoint. Fails closed in production if TURNSTILE_SECRET_KEY
 *              isn't configured (misconfiguration should not silently leave
 *              the endpoint unprotected); in development it logs a warning
 *              once and lets the request through, so local work doesn't
 *              require Cloudflare keys.
 * @param {string} token - The `cf-turnstile-response` value from the client.
 * @param {string} [remoteip] - The requester's IP, forwarded for Cloudflare's risk scoring.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
let warnedMissingSecret = false;

async function verifyTurnstileToken(token, remoteip) {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return { success: false, error: 'CAPTCHA is not configured on the server.' };
        }
        if (!warnedMissingSecret) {
            console.warn('[turnstile] TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification (dev only).');
            warnedMissingSecret = true;
        }
        return { success: true };
    }

    if (!token || typeof token !== 'string') {
        return { success: false, error: 'CAPTCHA challenge is missing. Please try again.' };
    }

    try {
        const body = new URLSearchParams({ secret, response: token });
        if (remoteip) body.append('remoteip', remoteip);

        const resp = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        const data = await resp.json();
        if (!data.success) {
            return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
        }
        return { success: true };
    } catch (err) {
        console.error('[turnstile] verification request failed:', err.message || err);
        return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
    }
}

module.exports = { verifyTurnstileToken };
