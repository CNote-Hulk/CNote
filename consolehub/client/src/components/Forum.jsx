import { useState, useEffect } from 'react';
import { api } from '../api';
import CreateThread from './CreateThread';

const TAGS = ['All', 'Help', 'Fix', 'Showcase', 'Buy&Sell', 'General'];
const TAG_COLORS = { Help: 'bg-red-500/20 text-red-400', Fix: 'bg-green-500/20 text-green-400', Showcase: 'bg-purple-500/20 text-purple-400', 'Buy&Sell': 'bg-yellow-500/20 text-yellow-400', General: 'bg-gray-500/20 text-gray-400' };

const CONSOLE_LABELS = { playstation: 'PlayStation', xbox: 'Xbox', nintendo: 'Nintendo', 'pc-gaming': 'PC Gaming', retro: 'Retro' };

export default function Forum({ console: consoleKey, onNavigate }) {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (!consoleKey) return;
        setLoading(true);
        api.getThreads(consoleKey).then(setThreads).catch(() => {}).finally(() => setLoading(false));
    }, [consoleKey]);

    const filtered = filter === 'All' ? threads : threads.filter(t => t.tag === filter);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-heading font-bold text-lg">
                        {CONSOLE_LABELS[consoleKey] || consoleKey} Forum
                    </h2>
                    <button onClick={() => setShowCreate(true)}
                        className="bg-accent hover:bg-accent/80 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition">
                        New Thread
                    </button>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {TAGS.map(t => (
                        <button key={t} onClick={() => setFilter(t)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition ${filter === t ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {loading && <p className="text-gray-500 text-center py-12">Loading threads...</p>}
                {!loading && filtered.length === 0 && <p className="text-gray-500 text-center py-12">No threads yet. Start one!</p>}
                {filtered.map(t => (
                    <button key={t._id} onClick={() => onNavigate({ type: 'thread', threadId: t._id, console: consoleKey })}
                        className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition flex gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase shrink-0">
                            {t.username?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[t.tag] || TAG_COLORS.General}`}>
                                    {t.tag}
                                </span>
                                <span className="text-white text-sm font-medium truncate">{t.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500 text-xs">
                                <span>{t.username}</span>
                                <span>💬 {t.replyCount || 0}</span>
                                <span>👁 {t.views || 0}</span>
                                <span>👍 {t.upvotes || 0}</span>
                                <span className="ml-auto">{new Date(t.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {showCreate && <CreateThread consoleKey={consoleKey} onClose={() => setShowCreate(false)}
                onCreated={(t) => { setShowCreate(false); setThreads(prev => [t, ...prev]); }} />}
        </div>
    );
}
