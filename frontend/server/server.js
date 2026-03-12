/**
 * Console Notebook — Backend Server
 *
 * Serves the static frontend AND exposes API routes for authentication,
 * email verification, password reset, and session management.
 *
 * Usage:
 *   cd server && npm install && npm start
 *
 * Environment variables (optional):
 *   PORT           — Server port (default: 3000)
 *   BASE_URL       — Public URL for email links (default: http://localhost:3000)
 *   SMTP_HOST      — SMTP server host
 *   SMTP_PORT      — SMTP server port (default: 587)
 *   SMTP_USER      — SMTP username
 *   SMTP_PASS      — SMTP password
 *   SMTP_FROM      — Sender address (default: Console Notebook <noreply@consolenotebook.ro>)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// ─── Security headers ───────────────────────────────────

app.use(helmet({
    contentSecurityPolicy: false,   // Let the static site handle CSP
    crossOriginEmbedderPolicy: false
}));

// ─── CORS (allow same-origin, needed if frontend runs separately) ──

app.use(cors({
    origin: true,
    credentials: true
}));

// ─── Body parsing ───────────────────────────────────────

app.use(express.json({ limit: '2mb' }));  // avatar uploads can be large data-URLs
app.use(express.urlencoded({ extended: false }));

// ─── Cookie parser ──────────────────────────────────────
// Simple cookie parser middleware (avoids adding cookie-parser dependency)
app.use((req, res, next) => {
    const cookieStr = req.headers.cookie || '';
    req.cookies = {};
    cookieStr.split(';').forEach(pair => {
        const [key, ...vals] = pair.trim().split('=');
        if (key) req.cookies[key.trim()] = decodeURIComponent(vals.join('='));
    });

    // Add res.cookie helper if not present
    if (!res.cookie) {
        res.cookie = (name, value, options = {}) => {
            let cookie = `${name}=${encodeURIComponent(value)}`;
            if (options.maxAge) cookie += `; Max-Age=${Math.floor(options.maxAge / 1000)}`;
            if (options.httpOnly) cookie += '; HttpOnly';
            if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
            if (options.path) cookie += `; Path=${options.path}`;
            if (options.secure) cookie += '; Secure';
            res.append('Set-Cookie', cookie);
            return res;
        };
    }

    if (!res.clearCookie) {
        res.clearCookie = (name, options = {}) => {
            res.cookie(name, '', { ...options, maxAge: 0 });
            return res;
        };
    }

    next();
});

// ─── API routes ─────────────────────────────────────────

app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);

// ─── Static files (frontend) ────────────────────────────
// Serve the entire project root so paths like /src/html/pages/login.html work
const ROOT = path.resolve(__dirname, '..');
app.use(express.static(ROOT));

// ─── Fallback to index ──────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});

// ─── Start server ───────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n  ✅  Console Notebook server running at http://localhost:${PORT}`);
    console.log(`  📁  Serving static files from: ${ROOT}`);
    console.log(`  🔑  API available at http://localhost:${PORT}/api\n`);
});
