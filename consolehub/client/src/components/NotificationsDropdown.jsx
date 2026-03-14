import { useState, useEffect } from 'react';
import { api } from '../api';

export default function NotificationsDropdown({ onClose, onNavigate }) {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getNotifications().then(setNotifs).catch(() => {}).finally(() => setLoading(false));
    }, []);

    async function markRead(n) {
        if (!n.read) {
            await api.markNotifRead(n._id).catch(() => {});
            setNotifs(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
        }
    }

    async function markAllRead() {
        await api.markAllNotifsRead().catch(() => {});
        setNotifs(prev => prev.map(x => ({ ...x, read: true })));
    }

    const icons = {
        forum_reply: '💬', repair_accepted: '🔧', listing_interest: '📦',
        listing_sold: '✅', new_dm: '✉️', upvote: '👍',
    };

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="absolute right-0 top-full mt-1 w-80 bg-raised border border-white/10 rounded-xl shadow-2xl z-50 animate-scaleIn overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                    <h3 className="text-white font-heading font-semibold text-sm">Notifications</h3>
                    <button onClick={markAllRead} className="text-accent text-xs hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
                    {!loading && notifs.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No notifications yet</p>}
                    {notifs.map(n => (
                        <button key={n._id} onClick={() => { markRead(n); onClose(); }}
                            className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-white/5 transition border-b border-white/5 last:border-0 ${n.read ? 'opacity-50' : ''}`}>
                            <span className="text-lg shrink-0 mt-0.5">{icons[n.type] || '🔔'}</span>
                            <div className="min-w-0">
                                <p className="text-gray-200 text-sm leading-snug line-clamp-2">{n.message}</p>
                                <p className="text-gray-500 text-xs mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2 ml-auto" />}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
