import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MobileTabBar from './components/MobileTabBar';
import Chat from './components/Chat';
import Forum from './components/Forum';
import ThreadView from './components/ThreadView';
import RepairWizard from './components/RepairWizard';
import Marketplace from './components/Marketplace';
import ListingDetail from './components/ListingDetail';
import AddListing from './components/AddListing';
import DMPanel from './components/DMPanel';

export default function App() {
    const { user, token } = useAuth();
    const [view, setView] = useState('chat');
    const [channel, setChannel] = useState('general');
    const [activeConsole, setActiveConsole] = useState(null);
    const [threadId, setThreadId] = useState(null);
    const [listingId, setListingId] = useState(null);
    const [showAddListing, setShowAddListing] = useState(false);
    const [dmTarget, setDmTarget] = useState(null); // { userId, username, listingRef? }
    const [showDM, setShowDM] = useState(false);
    const [marketplaceCategory, setMarketplaceCategory] = useState(null);

    if (!user) return <Login />;

    const nav = (action) => {
        switch (action.type) {
            case 'chat':
                setView('chat');
                setChannel(action.channel || 'general');
                break;
            case 'forum':
                setView('forum');
                setActiveConsole(action.console);
                break;
            case 'repair':
                setView('repair');
                setActiveConsole(action.console);
                break;
            case 'thread':
                setView('thread');
                setThreadId(action.threadId);
                setActiveConsole(action.console);
                break;
            case 'marketplace':
                setView('marketplace');
                setMarketplaceCategory(action.category || null);
                break;
            case 'listing':
                setView('listing');
                setListingId(action.listingId);
                break;
            case 'add-listing':
                setShowAddListing(true);
                break;
            case 'dm':
                setDmTarget(action.target);
                setShowDM(true);
                break;
            case 'dm-inbox':
                setDmTarget(null);
                setShowDM(true);
                break;
        }
    };

    return (
        <SocketProvider token={token}>
            <div className="flex flex-col h-screen bg-void">
                <TopBar onNavigate={nav} />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar activeView={view} activeChannel={channel} activeConsole={activeConsole} marketplaceCategory={marketplaceCategory} onNavigate={nav} />
                    <main className="flex-1 flex flex-col overflow-hidden relative">
                        {view === 'chat' && <Chat channel={channel} />}
                        {view === 'forum' && <Forum console={activeConsole} onNavigate={nav} />}
                        {view === 'thread' && <ThreadView threadId={threadId} console={activeConsole} onBack={() => nav({ type: 'forum', console: activeConsole })} />}
                        {view === 'repair' && <RepairWizard console={activeConsole} onNavigate={nav} />}
                        {view === 'marketplace' && <Marketplace category={marketplaceCategory} onNavigate={nav} />}
                        {view === 'listing' && <ListingDetail id={listingId} onNavigate={nav} />}
                    </main>
                    {showDM && <DMPanel target={dmTarget} onClose={() => { setShowDM(false); setDmTarget(null); }} />}
                </div>
                <MobileTabBar activeView={view} onNavigate={nav} />
                {showAddListing && <AddListing onClose={() => setShowAddListing(false)} onCreated={(l) => { setShowAddListing(false); nav({ type: 'listing', listingId: l._id }); }} />}
            </div>
        </SocketProvider>
    );
}
