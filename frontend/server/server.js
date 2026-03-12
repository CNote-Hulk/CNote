/**
 * Console Notebook â€” Backend Server
 *
 * Serves the static frontend AND exposes API routes for authentication,
 * email verification, password reset, and session management.
 *
 * Usage:
 *   cd server && npm install && npm start
 *
 * Environment variables (optional):
 *   PORT           â€” Server port (default: 3000)
 *   BASE_URL       â€” Public URL for email links (default: http://localhost:3000)
 *   SMTP_HOST      â€” SMTP server host
 *   SMTP_PORT      â€” SMTP server port (default: 587)
 *   SMTP_USER      â€” SMTP username
 *   SMTP_PASS      â€” SMTP password
 *   SMTP_FROM      â€” Sender address (default: Console Notebook <console.notebook.app@gmail.com>)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 3000;

function getMissingEnvVars(required) {
    return required.filter((name) => {
        const value = process.env[name];
        return !value || String(value).trim().length === 0;
    });
}

const baseRequiredEnv = ['NODE_ENV', 'FRONTEND_URL', 'BASE_URL'];
const productionRequiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
const requiredEnv = process.env.NODE_ENV === 'production'
    ? baseRequiredEnv.concat(productionRequiredEnv)
    : baseRequiredEnv;

const missingEnv = getMissingEnvVars(requiredEnv);
if (missingEnv.length > 0) {
    console.error('Missing required environment variables: ' + missingEnv.join(', '));
    process.exit(1);
}

// Render runs behind a reverse proxy.
app.set('trust proxy', 1);

// â”€â”€â”€ Security headers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use(helmet({
    contentSecurityPolicy: false,   // Let the static site handle CSP
    crossOriginEmbedderPolicy: false
}));

// â”€â”€â”€ CORS (allow same-origin, needed if frontend runs separately) â”€â”€

app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// â”€â”€â”€ Body parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use(express.json({ limit: '2mb' }));  // avatar uploads can be large data-URLs
app.use(express.urlencoded({ extended: false }));

// â”€â”€â”€ Cookie parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ API routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);

// â”€â”€â”€ Static files (frontend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Serve the entire project root so paths like /src/html/pages/login.html work
const ROOT = path.resolve(__dirname, '..');
app.use(express.static(ROOT));

// â”€â”€â”€ Fallback to index â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});

// â”€â”€â”€ Start server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
    console.log(`\n  âœ…  Console Notebook server running at http://localhost:${PORT}`);
    console.log(`  ðŸ“  Serving static files from: ${ROOT}`);
    console.log(`  ðŸ”‘  API available at http://localhost:${PORT}/api\n`);
});

