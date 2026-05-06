/* ─────────────────────────────────────────
   FILE: passwordPolicy.js
   DESCRIPTION: Single source of truth for password strength rules.
   Import this and call validatePassword() everywhere a new password
   is accepted (register, reset, change, set-password).
   ───────────────────────────────────────── */

'use strict';

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// bcrypt silently truncates input at 72 bytes. Reject above that limit
// so users aren't surprised when the 73rd character is quietly ignored.
const BCRYPT_MAX_BYTES = 72;

const STANDARD_ERROR =
    'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

/**
 * Validate a candidate password against the site's password policy.
 *
 * @param {string} pwd        - The candidate password.
 * @param {object} [context]  - Optional: { email, username } to reject
 *                              passwords that equal the user's own credentials.
 * @returns {{ valid: boolean, error: string | null }}
 */
function validatePassword(pwd, context = {}) {
    const str = String(pwd || '');

    if (str.length < 8)                 return { valid: false, error: STANDARD_ERROR };
    if (!/[A-Z]/.test(str))             return { valid: false, error: STANDARD_ERROR };
    if (!/[a-z]/.test(str))             return { valid: false, error: STANDARD_ERROR };
    if (!/[0-9]/.test(str))             return { valid: false, error: STANDARD_ERROR };
    if (!SPECIAL_CHARS.test(str))       return { valid: false, error: STANDARD_ERROR };

    // bcrypt 72-byte hard limit (byte length, not character count)
    if (Buffer.byteLength(str, 'utf8') > BCRYPT_MAX_BYTES) {
        return {
            valid: false,
            error: 'Password is too long. Maximum 72 bytes allowed.',
        };
    }

    // Reject password === email or username (case-insensitive)
    const lower = str.toLowerCase();
    if (context.email && lower === String(context.email).toLowerCase()) {
        return { valid: false, error: 'Password cannot be the same as your email address.' };
    }
    if (context.username && lower === String(context.username).toLowerCase()) {
        return { valid: false, error: 'Password cannot be the same as your username.' };
    }

    return { valid: true, error: null };
}

module.exports = { validatePassword, STANDARD_ERROR };
