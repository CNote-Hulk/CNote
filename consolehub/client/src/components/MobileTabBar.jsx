const TABS = [
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'forum', label: 'Forum', icon: '📋' },
    { key: 'marketplace', label: 'Market', icon: '🏪' },
    { key: 'dm-inbox', label: 'DMs', icon: '✉️' },
];

export default function MobileTabBar({ activeView, onNavigate }) {
    return (
        <nav className="md:hidden flex items-center justify-around bg-deep border-t border-white/5 h-14 shrink-0 z-30">
            {TABS.map(t => (
                <button key={t.key}
                    onClick={() => {
                        if (t.key === 'dm-inbox') onNavigate({ type: 'dm-inbox' });
                        else if (t.key === 'forum') onNavigate({ type: 'forum', console: 'playstation' });
                        else onNavigate({ type: t.key, channel: 'general' });
                    }}
                    className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${activeView === t.key || (t.key === 'chat' && activeView === 'chat') ? 'text-accent' : 'text-gray-500'}`}>
                    <span className="text-lg">{t.icon}</span>
                    <span className="text-[10px]">{t.label}</span>
                </button>
            ))}
        </nav>
    );
}
