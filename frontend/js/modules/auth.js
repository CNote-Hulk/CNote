/**
 * Authentication Module
 * Communicates with the backend API (POST /login, /register, etc.)
 * Falls back to localStorage for offline/file:// usage.
 *
 * All async methods that hit the API return Promises.
 * Synchronous helpers (getCurrentUser, isLoggedIn) read from the local session cache.
 */

import { API_BASE_URL } from '../config.js';

export const AuthModule = {
    SESSION_KEY: 'cn_session',

    /** Base URL for API calls, configurable for production deployments */
    _apiBase: API_BASE_URL,

    // ─── Internal helpers ───────────────────────────────

    /** Cache user data locally so synchronous reads still work */
    _setSession(user) {
        const session = {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar || '',
            bio: user.bio || '',
            email_verified: user.email_verified,
            created_at: user.created_at
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    },

    /** Get current user from local cache */
    getCurrentUser() {
        try {
            const s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
            return s && s.id ? s : null;
        } catch { return null; }
    },

    /** Check if logged in (synchronous, reads local cache) */
    isLoggedIn() {
        return !!this.getCurrentUser();
    },

    /** Generic API call */
    async _api(method, path, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'          // send cookies
        };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const res = await fetch(this._apiBase + path, opts);
        return res.json();
    },

    // ─── Register ───────────────────────────────────────

    /**
     * Register a new user.
     * After registration the user must verify their email before logging in.
     * @returns {Promise<{success, error?, user?, message?}>}
     */
    async register(username, email, password) {
        if (!username || String(username).trim().length < 1)
            return { success: false, error: 'Numele de utilizator este obligatoriu.' };
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return { success: false, error: 'Adresa de email nu este validă.' };
        if (!password || password.length < 6)
            return { success: false, error: 'Parola trebuie să aibă minim 6 caractere.' };

        try {
            const data = await this._api('POST', '/register', { username, email, password });
            // Do NOT set session — the user must verify email first
            return data;
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Login ──────────────────────────────────────────

    /**
     * Login — creates server session + caches user locally.
     * @returns {Promise<{success, error?, user?, email_not_verified?}>}
     */
    async login(email, password) {
        if (!email || !password)
            return { success: false, error: 'Completează toate câmpurile.' };

        try {
            const data = await this._api('POST', '/login', { email, password });
            if (data.success && data.user) {
                this._setSession(data.user);
            }
            return data;
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Logout ─────────────────────────────────────────

    async logout() {
        try {
            await this._api('POST', '/logout');
        } catch { /* ignore network errors on logout */ }
        localStorage.removeItem(this.SESSION_KEY);
    },

    // ─── Refresh session from server ────────────────────

    /** Fetch fresh user data from backend and update local cache */
    async refreshSession() {
        try {
            const data = await this._api('GET', '/me');
            if (data.success && data.user) {
                this._setSession(data.user);
                return data.user;
            }
            // Session invalid on server — clear local cache
            localStorage.removeItem(this.SESSION_KEY);
            return null;
        } catch {
            return null;
        }
    },

    // ─── Update profile (username, bio, avatar) ─────────

    async updateProfile(fields) {
        const cur = this.getCurrentUser();
        if (!cur) return false;

        try {
            const data = await this._api('PUT', '/me', fields);
            if (data.success && data.user) {
                this._setSession(data.user);
            }
            return data.success;
        } catch {
            return false;
        }
    },

    // ─── Update email ───────────────────────────────────

    async updateEmail(newEmail, currentPassword) {
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
            return { success: false, error: 'Adresa de email nu este validă.' };
        if (!currentPassword)
            return { success: false, error: 'Introdu parola curentă pentru schimbarea emailului.' };

        try {
            const data = await this._api('PUT', '/me/email', { newEmail, currentPassword });
            if (data.success && data.user) {
                this._setSession(data.user);
            }
            return data;
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Update password ────────────────────────────────

    async updatePassword(currentPassword, newPassword) {
        if (!currentPassword)
            return { success: false, error: 'Introdu parola curentă.' };
        if (!newPassword || newPassword.length < 6)
            return { success: false, error: 'Parola nouă trebuie să aibă minim 6 caractere.' };

        try {
            const data = await this._api('PUT', '/me/password', { currentPassword, newPassword });
            return data;
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Session management ─────────────────────────────

    /** Get all active sessions for the current user */
    async getSessions() {
        try {
            const data = await this._api('GET', '/sessions');
            return data.success ? data.sessions : [];
        } catch {
            return [];
        }
    },

    /** Terminate a specific session by id */
    async terminateSession(sessionId) {
        try {
            return await this._api('DELETE', '/sessions/' + sessionId);
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    /** Terminate all sessions except current */
    async terminateOtherSessions() {
        try {
            return await this._api('DELETE', '/sessions');
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Resend verification email ──────────────────────

    async resendVerification(email) {
        try {
            return await this._api('POST', '/resend-verification', { email });
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    }
};
