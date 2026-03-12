/**
 * Database setup — PostgreSQL via pg (node-postgres)
 * Creates tables on first run and exposes the pool instance
 * with helper methods for easy migration from SQLite.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ─── Schema ─────────────────────────────────────────────

async function initializeSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id              SERIAL PRIMARY KEY,
            username        TEXT    NOT NULL,
            email           TEXT    NOT NULL UNIQUE,
            password_hash   TEXT    NOT NULL,
            bio             TEXT    DEFAULT '',
            avatar          TEXT    DEFAULT '',
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
    `);
}

// Initialize schema and test connection
initializeSchema()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => {
        console.error('Database connection/schema error:', err);
        process.exit(1);
    });

module.exports = pool;
console.log('Database schema initialized.');

module.exports = db;
