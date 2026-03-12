/**
 * Console Notebook â€” Backend Server
 *
 * Serves the static frontend AND exposes API routes for authentication,
 * password reset, and session management.
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
 *   SMTP_FROM      â€” Sender address (default: Console Notebook <andre.halcu.07@licmarghilomanbz.ro>)
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const chatRoutes = require('./routes/chat');
const ratingRoutes = require('./routes/ratings');
const favoriteRoutes = require('./routes/favorites');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// Share JWT_SECRET with route files via app.locals
app.set('JWT_SECRET', JWT_SECRET);

function getMissingEnvVars(required) {
    return required.filter((name) => {
        const value = process.env[name];
        return !value || String(value).trim().length === 0;
    });
}

const baseRequiredEnv = ['NODE_ENV', 'FRONTEND_URL', 'BASE_URL', 'DATABASE_URL'];
const productionRequiredEnv = [];
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

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
    'https://atestat-info-68by.onrender.com'
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// â”€â”€â”€ Body parsing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use(express.json({ limit: '2mb' }));  // avatar uploads can be large data-URLs
app.use(express.urlencoded({ extended: false }));

// â”€â”€â”€ Cookie parser â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use(cookieParser());

// â”€â”€â”€ API routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api', userRoutes);

// Legacy URL compatibility: redirect old /src/... routes to current root routes.
app.get('/src/*', (req, res) => {
    const target = req.originalUrl.replace(/^\/src\//, '/');
    res.redirect(301, target);
});

// â”€â”€â”€ Static files (frontend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Serve static frontend from /frontend in project root.
const FRONTEND_ROOT = path.join(__dirname, '..');
const FRONTEND_INDEX = path.join(FRONTEND_ROOT, 'html', 'pages', 'index.html');
app.use(express.static(FRONTEND_ROOT));

// â”€â”€â”€ Fallback to index â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/', (req, res) => {
    res.redirect(302, '/html/pages/');
});

// Serve user profile page for /user/:username URLs
app.get('/user/:username', (req, res) => {
    res.sendFile(path.join(FRONTEND_ROOT, 'html', 'pages', 'user-profile.html'));
});

// âââ Global error handler âââââââââââââââââââââââââââââââââ

app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// â”€â”€â”€ Start server â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.listen(PORT, () => {
    console.log('Server running on port:', PORT);
    console.log('Database: PostgreSQL (Supabase)');
    console.log('Allowed CORS origins:', allowedOrigins.join(', '));
    console.log(`Serving static files from: ${FRONTEND_ROOT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});


