import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cnote_user')); } catch { return null; }
    });
    const [token, setToken] = useState(() => localStorage.getItem('cnote_token'));

    const saveAuth = useCallback((data) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('cnote_token', data.token);
        localStorage.setItem('cnote_user', JSON.stringify(data.user));
    }, []);

    const login = useCallback(async (username, password) => {
        const data = await api.login(username, password);
        saveAuth(data);
        return data;
    }, [saveAuth]);

    const register = useCallback(async (username, password, email) => {
        const data = await api.register(username, password, email);
        saveAuth(data);
        return data;
    }, [saveAuth]);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('cnote_token');
        localStorage.removeItem('cnote_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
