import { useState } from 'react';
import { api } from '../api';

const CATEGORIES = [
    { value: 'consoles', label: 'Consoles' },
    { value: 'games', label: 'Games' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'parts', label: 'Parts' },
];
const CONDITIONS = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'used', label: 'Used' },
    { value: 'for_parts', label: 'For Parts' },
];

export default function AddListing({ onClose, onCreated }) {
    const [form, setForm] = useState({
        title: '', category: 'consoles', condition: 'good',
        price: '', description: '', location: '', contact: '', olxLink: '',
        images: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function update(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    function addImageUrl() {
        const url = prompt('Paste image URL:');
        if (url?.trim()) update('images', [...form.images, url.trim()]);
    }

    function removeImage(i) {
        update('images', form.images.filter((_, idx) => idx !== i));
    }

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const listing = await api.createListing({
                ...form,
                price: Number(form.price),
            });
            onCreated(listing);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="bg-surface rounded-xl border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scaleIn">
                <div className="sticky top-0 bg-surface border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-white font-heading font-bold text-lg">Sell an Item</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition text-xl">×</button>
                </div>

                <form onSubmit={submit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Form */}
                        <div className="space-y-4">
                            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
                            <Field label="Title">
                                <input value={form.title} onChange={e => update('title', e.target.value)}
                                    className="input-field" placeholder="e.g. PS5 Disc Edition" required maxLength={100} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Category">
                                    <select value={form.category} onChange={e => update('category', e.target.value)} className="input-field">
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Condition">
                                    <select value={form.condition} onChange={e => update('condition', e.target.value)} className="input-field">
                                        {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </Field>
                            </div>
                            <Field label="Price ($)">
                                <input type="number" min="0" step="0.01" value={form.price}
                                    onChange={e => update('price', e.target.value)}
                                    className="input-field" placeholder="0.00" required />
                            </Field>
                            <Field label="Description">
                                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={4}
                                    className="input-field resize-none" placeholder="Describe your item..." required />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Location">
                                    <input value={form.location} onChange={e => update('location', e.target.value)}
                                        className="input-field" placeholder="City" />
                                </Field>
                                <Field label="Phone">
                                    <input value={form.contact} onChange={e => update('contact', e.target.value)}
                                        className="input-field" placeholder="Optional" />
                                </Field>
                            </div>
                            <Field label="OLX Link (optional)">
                                <input value={form.olxLink} onChange={e => update('olxLink', e.target.value)}
                                    className="input-field" placeholder="https://olx.ro/..." />
                            </Field>

                            {/* Images */}
                            <div>
                                <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Images</label>
                                <div className="flex gap-2 flex-wrap">
                                    {form.images.map((img, i) => (
                                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button type="button" onClick={() => removeImage(i)}
                                                className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-lg">×</button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addImageUrl}
                                        className="w-16 h-16 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-gray-500 hover:text-accent hover:border-accent/50 transition text-xl">+</button>
                                </div>
                            </div>
                        </div>

                        {/* Right: Preview */}
                        <div className="hidden md:block">
                            <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Live Preview</h3>
                            <div className="bg-deep rounded-xl border border-white/5 overflow-hidden">
                                <div className="aspect-[4/3] bg-void flex items-center justify-center">
                                    {form.images[0]
                                        ? <img src={form.images[0]} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-4xl opacity-20">📦</span>
                                    }
                                </div>
                                <div className="p-4">
                                    <h3 className="text-white font-medium">{form.title || 'Item title'}</h3>
                                    <p className="text-accent font-bold text-xl mt-1">${form.price || '0'}</p>
                                    <p className="text-gray-500 text-xs mt-2">{form.location || 'Location'} · {form.category}</p>
                                    {form.description && <p className="text-gray-400 text-sm mt-3 line-clamp-3">{form.description}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-sm transition">Cancel</button>
                        <button type="submit" disabled={loading}
                            className="bg-accent hover:bg-accent/80 text-white font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50">
                            {loading ? 'Publishing...' : '🚀 Publish Listing'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
            {children}
        </div>
    );
}
