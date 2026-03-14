import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api';

const ROLE_COLORS = { admin: 'text-red-400', moderator: 'text-yellow-400', technician: 'text-green-400', member: 'text-gray-300' };
const ROLE_BADGES = { admin: '👑', moderator: '🛡️', technician: '🔧' };

export default function Chat({ channel }) {
    const { user } = useAuth();
    const socket = useSocket();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [typing, setTyping] = useState([]);
    const [onlineCount, setOnlineCount] = useState(0);
    const bottomRef = useRef(null);
    const typingTimeout = useRef(null);

    useEffect(() => {
        setMessages([]);
        api.getMessages(channel).then(setMessages).catch(() => {});
    }, [channel]);

    useEffect(() => {
        if (!socket) return;
        socket.emit('join-room', channel);

        const onMsg = (msg) => {
            setMessages(prev => [...prev, msg]);
            setTyping(prev => prev.filter(u => u !== msg.username));
        };
        const onTyping = ({ username: u }) => {
            if (u === user.username) return;
            setTyping(prev => prev.includes(u) ? prev : [...prev, u]);
            setTimeout(() => setTyping(prev => prev.filter(x => x !== u)), 3000);
        };
        const onOnline = (count) => setOnlineCount(count);

        socket.on('chat-message', onMsg);
        socket.on('user-typing', onTyping);
        socket.on('online-count', onOnline);
        return () => {
            socket.off('chat-message', onMsg);
            socket.off('user-typing', onTyping);
            socket.off('online-count', onOnline);
        };
    }, [socket, channel, user.username]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function send(e) {
        e.preventDefault();
        if (!text.trim() || !socket) return;
        socket.emit('chat-message', { roomId: channel, content: text.trim() });
        setText('');
    }

    function handleTyping() {
        if (!socket) return;
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => socket.emit('typing', { roomId: channel }), 300);
    }

    let lastDate = '';

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="h-12 px-4 flex items-center border-b border-white/5 shrink-0 gap-3">
                <span className="text-gray-400 text-lg">#</span>
                <span className="text-white font-medium">{channel}</span>
                <span className="text-gray-600 text-xs ml-auto">{onlineCount} online</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
                {messages.map((m, i) => {
                    const d = new Date(m.createdAt).toLocaleDateString();
                    const showDate = d !== lastDate;
                    lastDate = d;
                    return (
                        <div key={m._id || i}>
                            {showDate && (
                                <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-white/5" />
                                    <span className="text-gray-500 text-xs">{d}</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>
                            )}
                            <div className="flex gap-3 py-1 hover:bg-white/[0.02] rounded-md px-2 -mx-2 group">
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold uppercase shrink-0 mt-0.5">
                                    {m.username?.[0]}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className={`text-sm font-semibold ${ROLE_COLORS[m.role] || 'text-gray-300'}`}>
                                            {ROLE_BADGES[m.role] && <span className="mr-1">{ROLE_BADGES[m.role]}</span>}
                                            {m.username}
                                        </span>
                                        <span className="text-gray-600 text-[10px] font-mono">
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-gray-200 text-sm break-words">{m.content}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Typing */}
            {typing.length > 0 && (
                <div className="px-4 pb-1 text-xs text-gray-500 animate-pulse">
                    {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
                </div>
            )}

            {/* Input */}
            <form onSubmit={send} className="px-4 pb-4">
                <div className="flex bg-surface border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/50 transition">
                    <input value={text} onChange={e => { setText(e.target.value); handleTyping(); }}
                        placeholder={`Message #${channel}`}
                        className="flex-1 bg-transparent px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none" />
                    <button type="submit" className="px-4 text-accent hover:text-white transition disabled:opacity-30" disabled={!text.trim()}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
}
