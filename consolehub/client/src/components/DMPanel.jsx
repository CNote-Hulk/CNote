import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api';

export default function DMPanel({ target, onClose }) {
    const { user } = useAuth();
    const socket = useSocket();
    const [conversations, setConversations] = useState([]);
    const [activePartner, setActivePartner] = useState(target?.userId || null);
    const [activeUsername, setActiveUsername] = useState(target?.username || '');
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);

    // Load conversations list
    useEffect(() => {
        api.getConversations().then(setConversations).catch(() => {}).finally(() => setLoading(false));
    }, []);

    // Load messages when partner changes
    useEffect(() => {
        if (!activePartner) { setMessages([]); return; }
        api.getDMs(activePartner).then(setMessages).catch(() => {});
    }, [activePartner]);

    // Real-time DM
    useEffect(() => {
        if (!socket) return;
        const onDM = (msg) => {
            if (msg.senderId === activePartner || msg.receiverId === activePartner) {
                setMessages(prev => [...prev, msg]);
            }
            // Refresh conversations
            api.getConversations().then(setConversations).catch(() => {});
        };
        socket.on('dm', onDM);
        return () => socket.off('dm', onDM);
    }, [socket, activePartner]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function send(e) {
        e.preventDefault();
        if (!text.trim() || !socket || !activePartner) return;
        socket.emit('dm', {
            to: activePartner,
            content: text.trim(),
            listingRef: target?.listingRef || null,
        });
        setText('');
    }

    return (
        <div className="w-[340px] bg-deep border-l border-white/5 flex flex-col h-full shrink-0 animate-slideRight z-20">
            {/* Header */}
            <div className="h-12 px-4 flex items-center border-b border-white/5 shrink-0 gap-2">
                {activePartner ? (
                    <>
                        <button onClick={() => { setActivePartner(null); setActiveUsername(''); }}
                            className="text-gray-400 hover:text-white transition text-sm">←</button>
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase">
                            {activeUsername?.[0]}
                        </div>
                        <span className="text-white text-sm font-medium truncate">{activeUsername}</span>
                    </>
                ) : (
                    <span className="text-white font-heading font-semibold text-sm">Direct Messages</span>
                )}
                <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition text-lg">×</button>
            </div>

            {/* Conversation List or Messages */}
            {!activePartner ? (
                <div className="flex-1 overflow-y-auto">
                    {loading && <p className="text-gray-500 text-center text-sm py-8">Loading...</p>}
                    {!loading && conversations.length === 0 && <p className="text-gray-500 text-center text-sm py-8">No conversations yet</p>}
                    {conversations.map(c => (
                        <button key={c.partnerId} onClick={() => { setActivePartner(c.partnerId); setActiveUsername(c.partnerName); }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition border-b border-white/5">
                            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase shrink-0">
                                {c.partnerName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-white text-sm font-medium truncate">{c.partnerName}</span>
                                    {c.unread > 0 && (
                                        <span className="bg-accent text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                            {c.unread}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-xs truncate">{c.lastMessage}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                        {messages.map((m, i) => {
                            const mine = m.senderId === user._id;
                            return (
                                <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${mine
                                        ? 'bg-accent text-white rounded-br-sm'
                                        : 'bg-surface text-gray-200 rounded-bl-sm'}`}>
                                        {m.content}
                                        <div className={`text-[10px] mt-0.5 ${mine ? 'text-white/60' : 'text-gray-500'}`}>
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                    <form onSubmit={send} className="px-3 pb-3 shrink-0">
                        <div className="flex bg-surface border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/50 transition">
                            <input value={text} onChange={e => setText(e.target.value)}
                                placeholder="Message..."
                                className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
                            <button type="submit" disabled={!text.trim()}
                                className="px-3 text-accent hover:text-white transition disabled:opacity-30 text-sm">
                                Send
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
