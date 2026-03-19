/**
 * Database setup - Supabase Postgres via pg (node-postgres)
 * Creates tables on first run and exposes the pool instance.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false
	}
});

/**
 * Create all tables and run schema migrations.
 * Uses IF NOT EXISTS so it is safe to call on every startup.
 */
async function initializeSchema() {
	await pool.query(`
		/* ── Core user & auth tables ── */
		CREATE TABLE IF NOT EXISTS users (
			id              SERIAL PRIMARY KEY,
			username        TEXT    NOT NULL,
			email           TEXT    NOT NULL UNIQUE,
			password_hash   TEXT    DEFAULT NULL,
			bio             TEXT    DEFAULT '',
			avatar          TEXT    DEFAULT '',
			favorite_consoles TEXT  DEFAULT '',
			owned_consoles  TEXT    DEFAULT '',
			email_verified  BOOLEAN DEFAULT FALSE,
			two_factor_enabled BOOLEAN DEFAULT FALSE,
			two_factor_method VARCHAR(10) DEFAULT NULL,
			two_factor_secret VARCHAR(255) DEFAULT NULL,
			two_factor_totp_enabled BOOLEAN DEFAULT FALSE,
			two_factor_email_enabled BOOLEAN DEFAULT FALSE,
			google_id       VARCHAR(255) DEFAULT NULL,
			avatar_url      TEXT    DEFAULT NULL,
			created_at      TIMESTAMP DEFAULT NOW(),
			updated_at      TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS email_verification_tokens (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token       TEXT    NOT NULL UNIQUE,
			expires_at  TIMESTAMP NOT NULL,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS password_reset_tokens (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token       TEXT    NOT NULL UNIQUE,
			expires_at  TIMESTAMP NOT NULL
		);

		CREATE TABLE IF NOT EXISTS user_sessions (
			id                SERIAL PRIMARY KEY,
			user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			session_token     TEXT    NOT NULL UNIQUE,
			device_type       TEXT    DEFAULT 'desktop',
			browser           TEXT    DEFAULT '',
			operating_system  TEXT    DEFAULT '',
			ip_address        TEXT    DEFAULT '',
			country           TEXT    DEFAULT '',
			login_time        TIMESTAMP DEFAULT NOW(),
			last_activity     TIMESTAMP DEFAULT NOW(),
			is_active         BOOLEAN DEFAULT TRUE
		);

		/* ── Chat ── */
		CREATE TABLE IF NOT EXISTS messages (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message     TEXT    NOT NULL,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		/* ── Social (ratings, favorites, owned, friends) ── */
		CREATE TABLE IF NOT EXISTS console_ratings (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			console_id  TEXT    NOT NULL,
			rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
			created_at  TIMESTAMP DEFAULT NOW(),
			UNIQUE(user_id, console_id)
		);

		CREATE TABLE IF NOT EXISTS user_favorites (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			console_id  TEXT    NOT NULL,
			created_at  TIMESTAMP DEFAULT NOW(),
			UNIQUE(user_id, console_id)
		);

		CREATE TABLE IF NOT EXISTS user_owned_consoles (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			console_id  TEXT    NOT NULL,
			UNIQUE(user_id, console_id)
		);

		CREATE TABLE IF NOT EXISTS friend_requests (
			id          SERIAL PRIMARY KEY,
			sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS friends (
			id          SERIAL PRIMARY KEY,
			user1_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			user2_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at  TIMESTAMP DEFAULT NOW(),
			UNIQUE(user1_id, user2_id)
		);

		/* ── 2FA codes (email-based one-time codes) ── */
		CREATE TABLE IF NOT EXISTS two_factor_codes (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			code        VARCHAR(10) NOT NULL,
			expires_at  TIMESTAMP NOT NULL,
			used        BOOLEAN DEFAULT FALSE,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		/* === ConsoleHub Tables === */

		CREATE TABLE IF NOT EXISTS forum_threads (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			console     TEXT    NOT NULL,
			title       TEXT    NOT NULL,
			body        TEXT    NOT NULL,
			tag         TEXT    DEFAULT 'General',
			views       INTEGER DEFAULT 0,
			upvotes     INTEGER DEFAULT 0,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS forum_replies (
			id          SERIAL PRIMARY KEY,
			thread_id   INTEGER NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			body        TEXT    NOT NULL,
			upvotes     INTEGER DEFAULT 0,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS forum_upvotes (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			thread_id   INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE,
			reply_id    INTEGER REFERENCES forum_replies(id) ON DELETE CASCADE,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS listings (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			title       TEXT    NOT NULL,
			description TEXT    NOT NULL,
			price       DECIMAL(10,2) NOT NULL,
			condition   TEXT    DEFAULT 'good',
			category    TEXT    DEFAULT 'consoles',
			location    TEXT    DEFAULT '',
			phone       TEXT    DEFAULT '',
			olx_url     TEXT    DEFAULT '',
			images      TEXT    DEFAULT '[]',
			sold        BOOLEAN DEFAULT FALSE,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS repair_requests (
			id                 SERIAL PRIMARY KEY,
			user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			console            TEXT    NOT NULL,
			symptoms           TEXT    NOT NULL,
			description        TEXT    DEFAULT '',
			severity           TEXT    DEFAULT 'unknown',
			ai_diagnosis       TEXT    DEFAULT '',
			estimated_cost_min INTEGER DEFAULT 0,
			estimated_cost_max INTEGER DEFAULT 0,
			estimated_time     TEXT    DEFAULT '',
			recommendation     TEXT    DEFAULT '',
			status             TEXT    DEFAULT 'draft',
			created_at         TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS direct_messages (
			id          SERIAL PRIMARY KEY,
			sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message     TEXT    NOT NULL,
			listing_id  INTEGER REFERENCES listings(id) ON DELETE SET NULL,
			read        BOOLEAN DEFAULT FALSE,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS notifications (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			type        TEXT    NOT NULL,
			message     TEXT    NOT NULL,
			link        TEXT    DEFAULT '',
			read        BOOLEAN DEFAULT FALSE,
			created_at  TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS listing_favorites (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
			created_at  TIMESTAMP DEFAULT NOW(),
			UNIQUE(user_id, listing_id)
		);
	`);

	// Column migrations — idempotent ALTER statements to evolve schema
	const migrations = [
		`ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS listing_id INTEGER REFERENCES listings(id) ON DELETE SET NULL`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_consoles TEXT DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS owned_consoles TEXT DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(10) DEFAULT NULL`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255) DEFAULT NULL`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_totp_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_email_enabled BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL`,
		`ALTER TABLE email_verification_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
		`ALTER TABLE listings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`,
		`ALTER TABLE listings ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0`,
		`ALTER TABLE listings ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0`,
		`ALTER TABLE listings ADD COLUMN IF NOT EXISTS console_type TEXT DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS username_chosen BOOLEAN DEFAULT TRUE`,
		`ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS username TEXT DEFAULT ''`,
		`ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS custom_symptom TEXT DEFAULT ''`,
		`ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT ''`,
		`ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS console_model TEXT DEFAULT ''`
	];
	for (const sql of migrations) {
		try { await pool.query(sql); } catch { }
	}

	// Backfill admin role for known admin accounts
	try {
		await pool.query(`UPDATE users SET role = 'admin' WHERE LOWER(username) = LOWER('AndreiHulk07') OR LOWER(email) IN (LOWER('console.notebook.app@gmail.com'), LOWER('andreihlc2007@gmail.com'))`);
	} catch { }

	// Backfill listing status for pre-existing rows
	try { await pool.query(`UPDATE listings SET status = 'active' WHERE status IS NULL`); } catch { }

	// Migrate repair_requests status from 'draft'/'submitted' to 'pending'
	try { await pool.query(`UPDATE repair_requests SET status = 'pending' WHERE status IN ('draft', 'submitted')`); } catch { }

	// Migrate is_active from INTEGER to BOOLEAN if needed
	try { await pool.query(`ALTER TABLE user_sessions ALTER COLUMN is_active TYPE BOOLEAN USING is_active::int::boolean`); } catch { }
	try { await pool.query(`ALTER TABLE user_sessions ALTER COLUMN is_active SET DEFAULT TRUE`); } catch { }

	// Make password_hash nullable for Google OAuth users
	try { await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL'); } catch { }

	// Migrate email_verified from INTEGER to BOOLEAN if needed
	try { await pool.query(`ALTER TABLE users ALTER COLUMN email_verified TYPE BOOLEAN USING email_verified::int::boolean`); } catch { }
	try { await pool.query(`ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE`); } catch { }

	// Migrate two_factor_enabled from INTEGER to BOOLEAN if needed
	try { await pool.query(`ALTER TABLE users ALTER COLUMN two_factor_enabled TYPE BOOLEAN USING two_factor_enabled::int::boolean`); } catch { }
	try { await pool.query(`ALTER TABLE users ALTER COLUMN two_factor_enabled SET DEFAULT FALSE`); } catch { }

	// Backfill new dual-method 2FA columns from legacy single-method data
	try {
		await pool.query(`UPDATE users SET two_factor_totp_enabled = TRUE WHERE two_factor_enabled = TRUE AND two_factor_method = 'totp' AND two_factor_totp_enabled = FALSE`);
		await pool.query(`UPDATE users SET two_factor_email_enabled = TRUE WHERE two_factor_enabled = TRUE AND two_factor_method = 'email' AND two_factor_email_enabled = FALSE`);
	} catch { }
}

initializeSchema()
	.then(() => console.log('Connected to Supabase Postgres database'))
	.catch(err => {
		console.error('Database connection/schema error:', err);
		process.exit(1);
	});

module.exports = pool;
