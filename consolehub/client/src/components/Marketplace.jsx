import { useState, useEffect } from 'react';
import { api } from '../api';

const CONDITIONS = { new: 'New', like_new: 'Like New', good: 'Good', used: 'Used', for_parts: 'For Parts' };
const COND_COLORS = { new: 'bg-green-500/20 text-green-400', like_new: 'bg-emerald-500/20 text-emerald-400', good: 'bg-blue-500/20 text-blue-400', used: 'bg-yellow-500/20 text-yellow-400', for_parts: 'bg-red-500/20 text-red-400' };
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
];

export default function Marketplace({ category, onNavigate }) {
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [condition, setCondition] = useState('');
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        setPage(1);
    }, [category, search, condition, sort]);

    useEffect(() => {
        setLoading(true);
        const params = { page, limit: 12, sort };
        if (category) params.category = category;
        if (search) params.search = search;
        if (condition) params.condition = condition;

        api.getListings(params).then(data => {
            setListings(data.listings || data);
            setTotal(data.total || 0);
        }).catch(() => {}).finally(() => setLoading(false));
    }, [category, search, condition, sort, page]);

    const totalPages = Math.ceil(total / 12);

    return (
        <div className="flex flex-col h-full">
            {/* Header + Filters */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-white font-heading font-bold text-lg">
                        🏪 Marketplace {category && `— ${category.charAt(0).toUpperCase() + category.slice(1)}`}
                    </h2>
                    <button onClick={() => onNavigate({ type: 'add-listing' })}
                        className="bg-accent hover:bg-accent/80 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition">
                        + Sell Item
                    </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search listings..."
                        className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent/50 transition flex-1 min-w-[180px]" />
                    <select value={condition} onChange={e => setCondition(e.target.value)}
                        className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent/50 cursor-pointer">
                        <option value="">All Conditions</option>
                        {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={sort} onChange={e => setSort(e.target.value)}
                        className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-accent/50 cursor-pointer">
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && <p className="text-gray-500 text-center py-12">Loading listings...</p>}
                {!loading && listings.length === 0 && <p className="text-gray-500 text-center py-12">No listings found</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {listings.map(l => (
                        <button key={l._id} onClick={() => onNavigate({ type: 'listing', listingId: l._id })}
                            className="bg-surface border border-white/5 rounded-xl overflow-hidden hover:border-accent/30 transition group text-left">
                            <div className="aspect-[4/3] bg-deep flex items-center justify-center overflow-hidden">
                                {l.images?.[0]
                                    ? <img src={l.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                    : <span className="text-4xl opacity-20">📦</span>
                                }
                                {l.sold && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="bg-red-500 text-white font-bold px-3 py-1 rounded-lg text-sm">SOLD</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${COND_COLORS[l.condition] || ''}`}>
                                        {CONDITIONS[l.condition]}
                                    </span>
                                    {l.badges?.map(b => (
                                        <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                                            {b === 'trusted_seller' ? '⭐' : b === 'verified_repairer' ? '🔧' : '✅'}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-white text-sm font-medium truncate">{l.title}</h3>
                                <p className="text-accent font-bold mt-1">${l.price}</p>
                                <p className="text-gray-500 text-xs mt-1">{l.sellerName} · {l.location || 'N/A'}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button key={i} onClick={() => setPage(i + 1)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === i + 1 ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
