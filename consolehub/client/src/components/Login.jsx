import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) await login(username, password);
            else await register(username, password, email);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-void p-4">
            <div className="w-full max-w-sm animate-fadeSlide">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-heading font-bold text-white flex items-center justify-center gap-2">
                        <span className="text-accent">C:</span>Note
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Console Community Hub</p>
                </div>
                <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-6 space-y-4 border border-white/5">
                    <h2 className="text-lg font-heading font-semibold text-white">
                        {isLogin ? 'Welcome back' : 'Create account'}
                    </h2>
                    {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider">Username</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                            className="w-full mt-1 bg-deep border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition"
                            placeholder="Enter username" required minLength={3} maxLength={20} autoFocus />
                    </div>
                    {!isLogin && (
                        <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full mt-1 bg-deep border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition"
                                placeholder="your@email.com" required />
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-gray-400 uppercase tracking-wider">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full mt-1 bg-deep border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent transition"
                            placeholder="Enter password" required minLength={6} />
                    </div>
                    <button type="submit" disabled={loading}
                        className="w-full bg-accent hover:bg-accent/80 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50">
                        {loading ? '...' : isLogin ? 'Log In' : 'Sign Up'}
                    </button>
                    <p className="text-center text-gray-500 text-sm">
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-accent hover:underline">{isLogin ? 'Sign Up' : 'Log In'}</button>
                    </p>
                </form>
            </div>
        </div>
    );
}
