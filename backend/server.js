const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

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

app.set('JWT_SECRET', JWT_SECRET);

function getMissingEnvVars(required) {
	return required.filter((name) => {
		const value = process.env[name];
		return !value || String(value).trim().length === 0;
	});
}

function normalizeOrigin(value) {
	return String(value || '').trim().replace(/\/$/, '');
}

function getOriginHost(value) {
	try {
		return new URL(normalizeOrigin(value)).host.toLowerCase();
	} catch {
		return '';
	}
}

// Only DATABASE_URL is strictly required — server cannot function without DB.
// FRONTEND_URL, BASE_URL, etc. are optional CORS helpers.
const requiredEnv = ['DATABASE_URL'];

const missingEnv = getMissingEnvVars(requiredEnv);
if (missingEnv.length > 0) {
	console.error('Missing required environment variables: ' + missingEnv.join(', '));
	process.exit(1);
}

// Warn about missing optional but important vars
const optionalEnv = ['NODE_ENV', 'FRONTEND_URL', 'BASE_URL', 'JWT_SECRET'];
optionalEnv.forEach(name => {
	if (!process.env[name]) console.warn(`Warning: ${name} is not set — using default.`);
});

app.set('trust proxy', 1);

app.use(helmet({
	contentSecurityPolicy: false,
	crossOriginEmbedderPolicy: false
}));

const allowedOrigins = [
	'http://localhost:3000',
	'http://localhost:5173',
	normalizeOrigin(process.env.FRONTEND_URL),
	normalizeOrigin(process.env.BASE_URL)
].filter(Boolean);

const allowedOriginHosts = allowedOrigins.map(getOriginHost).filter(Boolean);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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

app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api', userRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/src/*', (req, res) => {
	const target = req.originalUrl.replace(/^\/src\//, '/');
	res.redirect(301, target);
});

const FRONTEND_ROOT = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_ROOT));

app.get('/', (req, res) => {
	res.redirect(302, '/html/pages/');
});

app.get('/user/:username', (req, res) => {
	res.sendFile(path.join(FRONTEND_ROOT, 'html', 'pages', 'user-profile.html'));
});

app.use((err, req, res, next) => {
	console.error('Unhandled server error:', err);
	res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
	console.log('Server running on port:', PORT);
	console.log('Database: PostgreSQL (Supabase)');
	console.log('Allowed CORS origins:', allowedOrigins.join(', '));
	console.log(`Serving static files from: ${FRONTEND_ROOT}`);
	console.log(`API available at http://localhost:${PORT}/api`);
});
