/*
 * Reset database data for clean public deployment.
 */

const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

(async () => {
    try {
// Deletion order respects FK constraints (child tables first)
        await pool.query('DELETE FROM user_sessions');
        await pool.query('DELETE FROM email_verification_tokens');
        await pool.query('DELETE FROM password_reset_tokens');
        await pool.query('DELETE FROM users');
        console.log('Database reset complete: all user/auth/session data cleared.');
    } catch (error) {
        console.error('Failed to reset database:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
