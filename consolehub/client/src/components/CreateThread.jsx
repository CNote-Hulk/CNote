import { useState } from 'react';
import { api } from '../api';

const TAGS = ['Help', 'Fix', 'Showcase', 'Buy&Sell', 'General'];

export default function CreateThread({ consoleKey, onClose, onCreated }) {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [tag, setTag] = useState('General');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const thread = await api.createThread(consoleKey, { title, body, tag });
            onCreated(thread);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <form onClick={e => e.stopPropagation()} onSubmit={submit}
                className="bg-surface rounded-xl border border-white/10 w-full max-w-lg animate-scaleIn p-6 space-y-4">
                <h2 className="text-white font-heading font-bold text-lg">New Thread</h2>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)}
                        className="w-full mt-1 bg-deep border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition"
                        placeholder="Thread title" required maxLength={120} />
                </div>
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Tag</label>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {TAGS.map(t => (
                            <button key={t} type="button" onClick={() => setTag(t)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition ${tag === t ? 'bg-accent text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Description</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
                        className="w-full mt-1 bg-deep border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition resize-none"
                        placeholder="Describe your topic..." required />
                </div>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-sm transition">Cancel</button>
                    <button type="submit" disabled={loading}
                        className="bg-accent hover:bg-accent/80 text-white font-medium px-5 py-2 rounded-lg transition disabled:opacity-50">
                        {loading ? 'Posting...' : 'Post Thread'}
                    </button>
                </div>
            </form>
        </div>
    );
}
