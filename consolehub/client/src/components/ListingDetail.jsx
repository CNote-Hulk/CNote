import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

const CONDITIONS = { new: 'New', like_new: 'Like New', good: 'Good', used: 'Used', for_parts: 'For Parts' };
const COND_COLORS = { new: 'bg-green-500/20 text-green-400', like_new: 'bg-emerald-500/20 text-emerald-400', good: 'bg-blue-500/20 text-blue-400', used: 'bg-yellow-500/20 text-yellow-400', for_parts: 'bg-red-500/20 text-red-400' };

export default function ListingDetail({ id, onNavigate }) {
    const { user } = useAuth();
    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imgIdx, setImgIdx] = useState(0);

    useEffect(() => {
        api.getListing(id).then(setListing).catch(() => {}).finally(() => setLoading(false));
    }, [id]);

    async function markSold() {
        try {
            await api.markSold(id);
            setListing(prev => ({ ...prev, sold: true }));
        } catch { }
    }

    async function deleteListing() {
        try {
            await api.deleteListing(id);
            onNavigate({ type: 'marketplace' });
        } catch { }
    }

    if (loading) return <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>;
    if (!listing) return <div className="flex-1 flex items-center justify-center text-gray-500">Listing not found</div>;

    const isOwner = listing.sellerId === user._id || listing.seller?._id === user._id;

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                <button onClick={() => onNavigate({ type: 'marketplace' })}
                    className="text-accent text-sm hover:underline flex items-center gap-1">← Back to marketplace</button>
            </div>

            <div className="p-4 max-w-4xl mx-auto w-full animate-fadeSlide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Images */}
                    <div>
                        <div className="aspect-square bg-deep rounded-xl overflow-hidden border border-white/5 mb-2">
                            {listing.images?.[imgIdx]
                                ? <img src={listing.images[imgIdx]} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">📦</div>
                            }
                        </div>
                        {listing.images?.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {listing.images.map((img, i) => (
                                    <button key={i} onClick={() => setImgIdx(i)}
                                        className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 transition ${i === imgIdx ? 'border-accent' : 'border-white/10 hover:border-white/20'}`}>
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${COND_COLORS[listing.condition] || ''}`}>
                                    {CONDITIONS[listing.condition]}
                                </span>
                                {listing.sold && <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">SOLD</span>}
                                {listing.badges?.map(b => (
                                    <span key={b} className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                                        {b.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                            <h1 className="text-white font-heading font-bold text-2xl">{listing.title}</h1>
                            <p className="text-accent font-bold text-3xl mt-2">${listing.price}</p>
                        </div>

                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{listing.description}</p>

                        {listing.location && (
                            <div className="text-gray-500 text-sm flex items-center gap-1">📍 {listing.location}</div>
                        )}

                        {/* Seller Card */}
                        <div className="bg-surface rounded-xl border border-white/5 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold uppercase">
                                    {listing.sellerName?.[0] || listing.seller?.username?.[0]}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{listing.sellerName || listing.seller?.username}</p>
                                    <p className="text-gray-500 text-xs">
                                        {listing.seller?.totalListings || 0} listings
                                        {listing.seller?.badges?.length > 0 && ` · ${listing.seller.badges.join(', ')}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                            {!isOwner && !listing.sold && (
                                <button onClick={() => onNavigate({
                                    type: 'dm',
                                    target: { userId: listing.sellerId || listing.seller?._id, username: listing.sellerName || listing.seller?.username, listingRef: listing._id }
                                })}
                                    className="bg-accent hover:bg-accent/80 text-white font-medium px-5 py-2.5 rounded-lg transition flex-1 text-center">
                                    💬 Message Seller
                                </button>
                            )}
                            {listing.contact && (
                                <a href={`tel:${listing.contact}`}
                                    className="bg-white/5 hover:bg-white/10 text-white font-medium px-5 py-2.5 rounded-lg transition flex-1 text-center">
                                    📞 Call
                                </a>
                            )}
                            {listing.olxLink && (
                                <a href={listing.olxLink} target="_blank" rel="noopener noreferrer"
                                    className="bg-white/5 hover:bg-white/10 text-white font-medium px-5 py-2.5 rounded-lg transition flex-1 text-center">
                                    🔗 OLX Link
                                </a>
                            )}
                        </div>

                        {isOwner && !listing.sold && (
                            <div className="flex gap-2">
                                <button onClick={markSold}
                                    className="bg-green-600 hover:bg-green-500 text-white font-medium px-4 py-2 rounded-lg transition text-sm">
                                    ✅ Mark as Sold
                                </button>
                                <button onClick={deleteListing}
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium px-4 py-2 rounded-lg transition text-sm">
                                    🗑 Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
