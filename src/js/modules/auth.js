/**
 * Authentication Module
 * Client-side auth using localStorage (static site, no backend)
 */

export const AuthModule = {
    STORAGE_KEY: 'cn_users',
    SESSION_KEY: 'cn_session',

    /** Get all registered users */
    _getUsers() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
        } catch { return []; }
    },

    /** Save users array */
    _saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
    },

    /** Simple hash for password (not cryptographic — demo only) */
    _hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'h_' + Math.abs(hash).toString(36);
    },

    /** Generate unique id */
    _genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    /**
     * Register a new user
     * @returns {{ success: boolean, error?: string, user?: object }}
     */
    register(username, email, password) {
        if (!username || username.trim().length < 1) return { success: false, error: 'Numele de utilizator este obligatoriu.' };
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: false, error: 'Adresa de email nu este validă.' };
        if (!password || password.length < 6) return { success: false, error: 'Parola trebuie să aibă minim 6 caractere.' };

        const users = this._getUsers();
        const emailLower = email.toLowerCase().trim();
        if (users.find(u => u.email === emailLower)) return { success: false, error: 'Există deja un cont cu acest email.' };

        const user = {
            id: this._genId(),
            username: username.trim(),
            email: emailLower,
            password_hash: this._hash(password),
            bio: '',
            avatar: '',
            created_at: new Date().toISOString()
        };

        users.push(user);
        this._saveUsers(users);
        this._setSession(user);
        return { success: true, user };
    },

    /**
     * Login
     * @returns {{ success: boolean, error?: string, user?: object }}
     */
    login(email, password) {
        if (!email || !password) return { success: false, error: 'Completează toate câmpurile.' };
        const users = this._getUsers();
        const user = users.find(u => u.email === email.toLowerCase().trim());
        if (!user) return { success: false, error: 'Email sau parolă incorectă.' };
        if (user.password_hash !== this._hash(password)) return { success: false, error: 'Email sau parolă incorectă.' };
        this._setSession(user);
        return { success: true, user };
    },

    /** Logout */
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
    },

    /** Set current session */
    _setSession(user) {
        const session = { id: user.id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, created_at: user.created_at };
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    },

    /** Get current user or null */
    getCurrentUser() {
        try {
            const s = JSON.parse(localStorage.getItem(this.SESSION_KEY));
            return s && s.id ? s : null;
        } catch { return null; }
    },

    /** Check if logged in */
    isLoggedIn() {
        return !!this.getCurrentUser();
    },

    /** Update profile fields */
    updateProfile(fields) {
        const cur = this.getCurrentUser();
        if (!cur) return false;
        const users = this._getUsers();
        const idx = users.findIndex(u => u.id === cur.id);
        if (idx === -1) return false;
        if (fields.username !== undefined) users[idx].username = fields.username.trim();
        if (fields.bio !== undefined) users[idx].bio = fields.bio;
        if (fields.avatar !== undefined) users[idx].avatar = fields.avatar;
        this._saveUsers(users);
        this._setSession(users[idx]);
        return true;
    }
};
