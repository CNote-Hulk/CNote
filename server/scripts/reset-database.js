/*
 * Reset database data for clean public deployment.
 * Deletes all records from auth/session related tables.
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'console_notebook.db');

try {
    const db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');

    const tx = db.transaction(() => {
        db.prepare('DELETE FROM user_sessions;').run();
        db.prepare('DELETE FROM email_verification_tokens;').run();
        db.prepare('DELETE FROM password_reset_tokens;').run();
        db.prepare('DELETE FROM users;').run();
    });

    tx();
    db.close();
    console.log('Database reset complete: all user/auth/session data cleared.');
} catch (error) {
    console.error('Failed to reset database:', error.message);
    process.exit(1);
}
