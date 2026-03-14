const CONSOLES = [
    { key: 'playstation', label: 'PlayStation', color: 'text-ps', emoji: '🎮' },
    { key: 'xbox', label: 'Xbox', color: 'text-xbox', emoji: '🟢' },
    { key: 'nintendo', label: 'Nintendo', color: 'text-nint', emoji: '🍄' },
    { key: 'pc-gaming', label: 'PC Gaming', color: 'text-pcg', emoji: '🖥️' },
    { key: 'retro', label: 'Retro', color: 'text-amber-400', emoji: '👾' },
];

const MARKETPLACE_CATS = [
    { key: 'consoles', label: 'Consoles', emoji: '🕹️' },
    { key: 'games', label: 'Games', emoji: '💿' },
    { key: 'accessories', label: 'Accessories', emoji: '🎧' },
    { key: 'parts', label: 'Parts', emoji: '🔩' },
];

export default function Sidebar({ activeView, activeChannel, activeConsole, marketplaceCategory, onNavigate }) {
    return (
        <aside className="w-[248px] bg-deep border-r border-white/5 flex-col overflow-y-auto hidden md:flex shrink-0">
            {/* Chat Channels */}
            <Section title="CHAT">
                <ChannelBtn active={activeView === 'chat' && activeChannel === 'general'} emoji="#"
                    label="general" onClick={() => onNavigate({ type: 'chat', channel: 'general' })} />
                <ChannelBtn active={activeView === 'chat' && activeChannel === 'off-topic'} emoji="#"
                    label="off-topic" onClick={() => onNavigate({ type: 'chat', channel: 'off-topic' })} />
                <ChannelBtn active={activeView === 'chat' && activeChannel === 'deals'} emoji="#"
                    label="deals" onClick={() => onNavigate({ type: 'chat', channel: 'deals' })} />
            </Section>

            {/* Console Categories */}
            <Section title="CONSOLES">
                {CONSOLES.map(c => (
                    <div key={c.key}>
                        <ChannelBtn active={activeView === 'forum' && activeConsole === c.key}
                            emoji={c.emoji} label={c.label} colorClass={c.color}
                            onClick={() => onNavigate({ type: 'forum', console: c.key })} />
                        {activeConsole === c.key && activeView !== 'repair' && (
                            <button onClick={() => onNavigate({ type: 'repair', console: c.key })}
                                className="ml-9 text-xs text-gray-500 hover:text-accent transition py-1">
                                🔧 Repair Wizard
                            </button>
                        )}
                        {activeConsole === c.key && activeView === 'repair' && (
                            <span className="ml-9 text-xs text-accent py-1 block">🔧 Repair Wizard</span>
                        )}
                    </div>
                ))}
            </Section>

            {/* Marketplace */}
            <Section title="MARKETPLACE">
                <ChannelBtn active={activeView === 'marketplace' && !marketplaceCategory}
                    emoji="🏪" label="All Listings"
                    onClick={() => onNavigate({ type: 'marketplace' })} />
                {MARKETPLACE_CATS.map(c => (
                    <ChannelBtn key={c.key}
                        active={activeView === 'marketplace' && marketplaceCategory === c.key}
                        emoji={c.emoji} label={c.label}
                        onClick={() => onNavigate({ type: 'marketplace', category: c.key })} />
                ))}
                <button onClick={() => onNavigate({ type: 'add-listing' })}
                    className="w-full text-left px-3 py-1.5 text-xs text-accent hover:bg-white/5 rounded-md transition ml-1">
                    + Add Listing
                </button>
            </Section>

            {/* Coming Soon */}
            <Section title="COMING SOON">
                <div className="px-3 py-1.5 text-gray-600 text-xs flex items-center gap-2 cursor-not-allowed">
                    🔒 Tournaments
                </div>
                <div className="px-3 py-1.5 text-gray-600 text-xs flex items-center gap-2 cursor-not-allowed">
                    🔒 Guilds
                </div>
            </Section>
        </aside>
    );
}

function Section({ title, children }) {
    return (
        <div className="py-3 px-2">
            <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase px-2 mb-1">{title}</h3>
            {children}
        </div>
    );
}

function ChannelBtn({ active, emoji, label, colorClass, onClick }) {
    return (
        <button onClick={onClick}
            className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition ${active ? 'bg-accent/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
            <span className={colorClass || ''}>{emoji}</span>
            <span className="truncate">{label}</span>
        </button>
    );
}
