import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import NotificationsDropdown from './NotificationsDropdown';

export default function TopBar({ onNavigate }) {
    const { user, logout } = useAuth();
    const [unreadDM, setUnreadDM] = useState(0);
    const [showNotifs, setShowNotifs] = useState(false);
    const [showUser, setShowUser] = useState(false);

    useEffect(() => {
        api.getUnreadDMs().then(d => setUnreadDM(d.count)).catch(() => {});
        const iv = setInterval(() => api.getUnreadDMs().then(d => setUnreadDM(d.count)).catch(() => {}), 15000);
        return () => clearInterval(iv);
    }, []);

    return (
        <header className="h-12 bg-deep border-b border-white/5 flex items-center px-4 gap-3 shrink-0 z-30">
            <button onClick={() => onNavigate({ type: 'chat', channel: 'general' })}
                className="font-heading font-bold text-white text-lg mr-auto flex items-center gap-1.5 hover:opacity-80 transition">
                <span className="text-accent">C:</span>Note
            </button>

            {/* DM Inbox */}
            <button onClick={() => onNavigate({ type: 'dm-inbox' })}
                className="relative text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadDM > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadDM > 9 ? '9+' : unreadDM}
                    </span>
                )}
            </button>

            {/* Notifications */}
            <div className="relative">
                <button onClick={() => setShowNotifs(!showNotifs)}
                    className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </button>
                {showNotifs && <NotificationsDropdown onClose={() => setShowNotifs(false)} onNavigate={onNavigate} />}
            </div>

            {/* User */}
            <div className="relative">
                <button onClick={() => setShowUser(!showUser)}
                    className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-2 py-1 transition">
                    <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase">
                        {user.username[0]}
                    </div>
                    <span className="text-sm text-gray-300 hidden sm:inline">{user.username}</span>
                </button>
                {showUser && (
                    <div className="absolute right-0 top-full mt-1 bg-raised border border-white/10 rounded-lg shadow-xl py-1 w-40 animate-scaleIn z-50">
                        <div className="px-3 py-2 border-b border-white/5">
                            <p className="text-white text-sm font-medium">{user.username}</p>
                            <p className="text-gray-500 text-xs capitalize">{user.role}</p>
                        </div>
                        <button onClick={() => { setShowUser(false); logout(); }}
                            className="w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 text-sm">
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}
