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
    TOKEN_KEY: 'cn_token',
    SERVER_SESSION_TOKEN_KEY: 'cn_session_token',
    _sessionEventSource: null,
    _sessionWatchRetryTimer: null,

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
            favorite_consoles: user.favorite_consoles || '',
            owned_consoles: user.owned_consoles || '',
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
        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        const opts = {
            method,
            headers,
            credentials: 'include'
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
     * Login — creates server session + caches user locally + stores JWT.
     * @returns {Promise<{success, error?, user?, token?}>}
     */
    async login(email, password) {
        if (!email || !password)
            return { success: false, error: 'Completează toate câmpurile.' };

        try {
            const data = await this._api('POST', '/login', { email, password });
            if (data.success && data.user) {
                this._setSession(data.user);
                if (data.token) {
                    localStorage.setItem(this.TOKEN_KEY, data.token);
                }
                if (data.session_token) {
                    localStorage.setItem(this.SERVER_SESSION_TOKEN_KEY, data.session_token);
                }
            }
            return data;
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    // ─── Local Login (offline) ──────────────────────────

    /**
     * Create a local-only session (no server needed).
     * Useful for file:// or offline usage.
     */
    localLogin(username) {
        const session = {
            id: 'local_' + Date.now(),
            username: username,
            email: '',
            avatar: '',
            bio: '',
            email_verified: false,
            created_at: new Date().toISOString(),
            local: true
        };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    },

    // ─── Logout ─────────────────────────────────────────

    async logout() {
        this.stopSessionWatch();
        try {
            await this._api('POST', '/logout');
        } catch { /* ignore network errors on logout */ }
        localStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.SERVER_SESSION_TOKEN_KEY);
    },

    // ─── Refresh session from server ────────────────────

    /** Fetch fresh user data from backend and update local cache */
    async refreshSession() {
        try {
            const data = await this._api('GET', '/profile');
            if (data.success && data.user) {
                this._setSession(data.user);
                return data.user;
            }
            // Session invalid on server — clear local cache
            localStorage.removeItem(this.SESSION_KEY);
            localStorage.removeItem(this.TOKEN_KEY);
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

    /** Terminate all sessions, including current, then clear local auth state */
    async terminateAllSessions() {
        try {
            await this._api('DELETE', '/sessions');
        } catch {
            // Continue with local logout even if the API call fails.
        }
        await this.logout();
        return { success: true };
    },

    async deleteAccount(password) {
        if (!password) {
            return { success: false, error: 'Parola este obligatorie.' };
        }
        try {
            return await this._api('DELETE', '/account', { password });
        } catch {
            return { success: false, error: 'Nu s-a putut contacta serverul.' };
        }
    },

    stopSessionWatch() {
        if (this._sessionWatchRetryTimer) {
            clearTimeout(this._sessionWatchRetryTimer);
            this._sessionWatchRetryTimer = null;
        }
        if (this._sessionEventSource) {
            this._sessionEventSource.close();
            this._sessionEventSource = null;
        }
    },

    startSessionWatch() {
        if (window.location.protocol === 'file:') return;

        this.stopSessionWatch();

        const sessionToken = localStorage.getItem(this.SERVER_SESSION_TOKEN_KEY);
        const jwtToken = localStorage.getItem(this.TOKEN_KEY);
        const authToken = sessionToken || jwtToken;
        if (!authToken) return;

        const connect = () => {
            const url = `${this._apiBase}/sessions/events?token=${encodeURIComponent(authToken)}`;
            const source = new EventSource(url);
            this._sessionEventSource = source;

            source.onmessage = async (event) => {
                try {
                    const payload = JSON.parse(event.data || '{}');
                    if (payload.event === 'session_terminated') {
                        this.stopSessionWatch();
                        await this.logout();
                        window.location.href = '/html/pages/login.html';
                    }
                } catch {
                    // Ignore malformed events.
                }
            };

            source.onerror = () => {
                source.close();
                if (this._sessionWatchRetryTimer) clearTimeout(this._sessionWatchRetryTimer);
                this._sessionWatchRetryTimer = setTimeout(() => {
                    this._sessionWatchRetryTimer = null;
                    if (this.getCurrentUser()) connect();
                }, 5000);
            };
        };

        connect();
    },

    // ─── Auto-login (check token on page load) ─────────

    /**
     * Check if a stored JWT token is still valid.
     * Call this on page load to restore the session.
     * @returns {Promise<user|null>}
     */
    async autoLogin() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        if (!token) return null;
        return this.refreshSession();
    }
};
