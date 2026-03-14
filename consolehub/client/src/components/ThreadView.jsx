import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const TAG_COLORS = { Help: 'bg-red-500/20 text-red-400', Fix: 'bg-green-500/20 text-green-400', Showcase: 'bg-purple-500/20 text-purple-400', 'Buy&Sell': 'bg-yellow-500/20 text-yellow-400', General: 'bg-gray-500/20 text-gray-400' };

export default function ThreadView({ threadId, console: consoleKey, onBack }) {
    const { user } = useAuth();
    const [thread, setThread] = useState(null);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        api.getThread(consoleKey, threadId).then(setThread).catch(() => {}).finally(() => setLoading(false));
    }, [consoleKey, threadId]);

    async function submitReply(e) {
        e.preventDefault();
        if (!reply.trim()) return;
        setSending(true);
        try {
            const updated = await api.reply(consoleKey, threadId, { body: reply.trim() });
            setThread(updated);
            setReply('');
        } catch { }
        setSending(false);
    }

    async function upvoteThread() {
        try {
            const updated = await api.upvoteThread(consoleKey, threadId);
            setThread(prev => ({ ...prev, upvotes: updated.upvotes }));
        } catch { }
    }

    async function upvoteReply(replyId) {
        try {
            const updated = await api.upvoteReply(consoleKey, threadId, replyId);
            setThread(prev => ({
                ...prev,
                replies: prev.replies.map(r => r._id === replyId ? { ...r, upvotes: updated.upvotes } : r)
            }));
        } catch { }
    }

    if (loading) return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
    if (!thread) return <div className="flex-1 flex items-center justify-center text-gray-500">Thread not found</div>;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <button onClick={onBack} className="text-accent text-sm hover:underline mb-2 flex items-center gap-1">
                    ← Back to forum
                </button>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[thread.tag] || TAG_COLORS.General}`}>
                        {thread.tag}
                    </span>
                    <h2 className="text-white font-heading font-bold text-lg">{thread.title}</h2>
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-xs">
                    <span>{thread.username}</span>
                    <span>👁 {thread.views}</span>
                    <button onClick={upvoteThread} className="hover:text-accent transition">👍 {thread.upvotes}</button>
                    <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            {/* Body + Replies */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="bg-surface rounded-xl p-4 border border-white/5">
                    <p className="text-gray-200 text-sm whitespace-pre-wrap">{thread.body}</p>
                </div>

                {thread.replies?.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                            {thread.replies.length} {thread.replies.length === 1 ? 'Reply' : 'Replies'}
                        </h3>
                        {thread.replies.map(r => (
                            <div key={r._id} className="bg-surface/50 rounded-lg p-3 border border-white/5">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold uppercase">
                                        {r.username?.[0]}
                                    </div>
                                    <span className="text-sm font-medium text-gray-300">{r.username}</span>
                                    <span className="text-gray-600 text-[10px] font-mono">
                                        {new Date(r.createdAt).toLocaleDateString()}
                                    </span>
                                    <button onClick={() => upvoteReply(r._id)}
                                        className="ml-auto text-gray-500 hover:text-accent text-xs transition">
                                        👍 {r.upvotes || 0}
                                    </button>
                                </div>
                                <p className="text-gray-200 text-sm whitespace-pre-wrap pl-8">{r.body}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reply Input */}
            <form onSubmit={submitReply} className="px-4 pb-4 shrink-0">
                <div className="flex bg-surface border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/50 transition">
                    <input value={reply} onChange={e => setReply(e.target.value)}
                        placeholder="Write a reply..."
                        className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none" />
                    <button type="submit" disabled={sending || !reply.trim()}
                        className="px-4 text-accent hover:text-white transition disabled:opacity-30 text-sm font-medium">
                        Reply
                    </button>
                </div>
            </form>
        </div>
    );
}
