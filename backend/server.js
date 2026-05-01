/* ─────────────────────────────────────────
   FILE: server.js
   DESCRIPTION: Express application entry point. Configures
   middleware, CORS, mounts all API routes, and serves
   static frontend files. Uses PostgreSQL via Supabase.
   ───────────────────────────────────────── */

/* ── REQUIRED IMPORTS — DO NOT REMOVE ──────
   If you add a new package:
     1. require() it here
     2. Add it to package.json dependencies
   ────────────────────────────────────────── */
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const http = require('http');
const socketio = require('socket.io');
const rateLimit = require('express-rate-limit');
const app = express();

/* ── Route imports ── */
const resetProgressRoutes = require('./routes/reset-progress');
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const chatRoutes = require('./routes/chat');
const ratingRoutes = require('./routes/ratings');
const favoriteRoutes = require('./routes/favorites');
const friendRoutes = require('./routes/friends');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contact');
const googleAuthRoutes = require('./routes/google-auth');
const forumRoutes = require('./routes/forum');
const forumLikedRoutes = require('./routes/forum-liked');
const forumMyPostsRoutes = require('./routes/forum-my-posts');
const marketplaceRoutes = require('./routes/marketplace');
const repairRoutes = require('./routes/repair');
const dmRoutes = require('./routes/dm');
const notificationRoutes = require('./routes/notifications');
const consolesRoutes = require('./routes/consoles');
const achievementsRoutes = require('./routes/achievements');

const ownedConsolesRoutes = require('./routes/owned-consoles');
const progressRoutes = require('./routes/progress');
const coursesRoutes = require('./routes/courses');

/* ── Environment validation ── */

/**
 * getMissingEnvVars
 * @description Returns names of required env vars that are empty or unset.
 */
function getMissingEnvVars(required) {
	return required.filter((name) => {
		const value = process.env[name];
		return !value || String(value).trim().length === 0;
	});
}

/**
 * normalizeOrigin
 * @description Trims and strips trailing slash from an origin URL.
 */
function normalizeOrigin(value) {
	return String(value || '').trim().replace(/\/$/, '');
}

/**
 * getOriginHost
 * @description Extracts lowercase hostname from a URL string.
 */
function getOriginHost(value) {
	try {
		return new URL(normalizeOrigin(value)).host.toLowerCase();
	} catch {
		return '';
	}
}

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];

const missingEnv = getMissingEnvVars(requiredEnv);
if (missingEnv.length > 0) {
	console.error('Missing required environment variables: ' + missingEnv.join(', '));
	process.exit(1);
}

app.set('JWT_SECRET', process.env.JWT_SECRET);

// Warn about missing optional vars
const optionalEnv = ['NODE_ENV', 'FRONTEND_URL', 'BASE_URL'];
optionalEnv.forEach(name => {
	if (!process.env[name]) console.warn(`Warning: ${name} is not set — using default.`);
});

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});

app.use(helmet({
	contentSecurityPolicy: false,
	crossOriginEmbedderPolicy: false,
	referrerPolicy: { policy: 'no-referrer-when-downgrade' }
}));

/* ── CORS configuration ── */

const allowedOrigins = [
	'http://localhost:3000',
	'http://localhost:5173',
	normalizeOrigin(process.env.FRONTEND_URL),
	normalizeOrigin(process.env.BASE_URL)
].filter(Boolean);

const allowedOriginHosts = allowedOrigins.map(getOriginHost).filter(Boolean);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(passport.initialize());

// CORS middleware: allow same-host, configured origins, and localhost dev
app.use('/api', (req, res, next) => {
	const requestHost = String(req.get('host') || '').toLowerCase();
	return cors({
		origin: function(origin, callback) {
			const normalizedOrigin = normalizeOrigin(origin);
			const originHost = getOriginHost(origin);
			if (!origin || normalizedOrigin === normalizeOrigin(process.env.BASE_URL) || normalizedOrigin === normalizeOrigin(process.env.FRONTEND_URL) || originHost === requestHost || allowedOrigins.includes(normalizedOrigin) || allowedOriginHosts.includes(originHost)) {
				callback(null, true);
			} else {
				callback(null, false);
			}
		},
		credentials: true
	})(req, res, next);
});

/* ── Rate limiters ── */
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 15,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, error: 'Too many attempts, please try again later.' }
});

const twoFactorLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, error: 'Too many 2FA attempts, please try again later.' }
});

const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, error: 'Too many registrations from this IP, please try again later.' }
});

app.post('/api/login', authLimiter);
app.post('/api/register', registerLimiter);
app.post('/api/request-reset', authLimiter);
app.post('/api/reset-password', authLimiter);
app.post('/api/2fa/verify', twoFactorLimiter);
app.post('/api/2fa/email-fallback', twoFactorLimiter);

/* ── Route mounting ── */
app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api', userRoutes);
app.use('/api', contactRoutes);
app.use('/api/auth', googleAuthRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/forum/liked', forumLikedRoutes);
app.use('/api/forum/my-posts', forumMyPostsRoutes);
app.use('/api/marketplace', express.json({ limit: '10mb' }), marketplaceRoutes);
app.use('/api/repair', repairRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/api/owned-consoles', ownedConsolesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api', resetProgressRoutes);

app.use('/api/consoles', consolesRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api', coursesRoutes);

/* ── Static files & redirects ── */

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Legacy /src/* redirect for old bookmark support
app.get('/src/*', (req, res) => {
	const target = req.originalUrl.replace(/^\/src\//, '/');
	res.redirect(301, target);
});

const FRONTEND_ROOT = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_ROOT));

app.get('/', (req, res) => {
	res.redirect(302, '/html/pages/');
});

// Catch-all for /user/:username → serve user-profile.html (SPA-style route)
app.get('/user/:username', (req, res) => {
	res.sendFile(path.join(FRONTEND_ROOT, 'html', 'pages', 'user-profile.html'));
});

// Global error handler
app.use((err, req, res, next) => {
	console.error('Unhandled server error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

// === SOCKET.IO SETUP (pentru notificări real-time) ===
const httpServer = http.createServer(app);
const io = socketio(httpServer, { cors: { origin: allowedOrigins, credentials: true } });
app.set('io', io);

const { authRequired: _authReq } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const pool = require('./db');

io.on('connection', (socket) => {
  socket.on('register', async (token) => {
    if (!token || typeof token !== 'string') return;
    try {
      const JWT_SECRET = app.get('JWT_SECRET');
      let userId;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch {
        const { createHash } = require('crypto');
        const result = await pool.query(
          'SELECT user_id FROM user_sessions WHERE session_token = $1 AND is_active = true',
          [createHash('sha256').update(token).digest('hex')]
        );
        if (!result.rows[0]) return;
        userId = result.rows[0].user_id;
      }
      if (userId) socket.join(String(userId));
    } catch {}
  });
});

// === PORNEȘTE SERVERUL PE httpServer, NU pe app direct ===
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server + Socket.io running on port ${PORT}`);
});
