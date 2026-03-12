/**
 * Database setup — SQLite via better-sqlite3
 * Creates tables on first run and exposes the db instance.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data', 'console_notebook.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const dbExisted = fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ─────────────────────────────────────────────

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL,
      email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      bio             TEXT    DEFAULT '',
      avatar          TEXT    DEFAULT '',
      email_verified  INTEGER DEFAULT 0,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token       TEXT    NOT NULL UNIQUE,
      expires_at  TEXT    NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token       TEXT    NOT NULL UNIQUE,
      expires_at  TEXT    NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL,
      session_token     TEXT    NOT NULL UNIQUE,
      device_type       TEXT    DEFAULT 'desktop',
      browser           TEXT    DEFAULT '',
      operating_system  TEXT    DEFAULT '',
      ip_address        TEXT    DEFAULT '',
      country           TEXT    DEFAULT '',
      login_time        TEXT    DEFAULT (datetime('now')),
      last_activity     TEXT    DEFAULT (datetime('now')),
      is_active         INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

if (!dbExisted) {
  console.log('Database file not found. Creating new SQLite database and tables...');
}

initializeSchema();

module.exports = db;
