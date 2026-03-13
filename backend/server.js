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

app.set('trust proxy', 1);

app.use(helmet({
	contentSecurityPolicy: false,
	crossOriginEmbedderPolicy: false
}));

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

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api', userRoutes);

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
