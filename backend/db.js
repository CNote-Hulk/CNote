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

async function initializeSchema() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS users (
			id              SERIAL PRIMARY KEY,
			username        TEXT    NOT NULL,
			email           TEXT    NOT NULL UNIQUE,
			password_hash   TEXT    NOT NULL,
			bio             TEXT    DEFAULT '',
			avatar          TEXT    DEFAULT '',
			favorite_consoles TEXT  DEFAULT '',
			owned_consoles  TEXT    DEFAULT '',
			email_verified  INTEGER DEFAULT 0,
			created_at      TIMESTAMP DEFAULT NOW(),
			updated_at      TIMESTAMP DEFAULT NOW()
		);

		CREATE TABLE IF NOT EXISTS email_verification_tokens (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			token       TEXT    NOT NULL UNIQUE,
			expires_at  TIMESTAMP NOT NULL
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
			is_active         INTEGER DEFAULT 1
		);

		CREATE TABLE IF NOT EXISTS messages (
			id          SERIAL PRIMARY KEY,
			user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message     TEXT    NOT NULL,
			created_at  TIMESTAMP DEFAULT NOW()
		);

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
	`);

	const migrations = [
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_consoles TEXT DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS owned_consoles TEXT DEFAULT ''`
	];
	for (const sql of migrations) {
		try { await pool.query(sql); } catch { }
	}
}

initializeSchema()
	.then(() => console.log('Connected to Supabase Postgres database'))
	.catch(err => {
		console.error('Database connection/schema error:', err);
		process.exit(1);
	});

module.exports = pool;
