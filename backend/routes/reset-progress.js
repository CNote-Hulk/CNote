const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { resetUserData } = require('../controllers/userController');

router.post('/reset-progress', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // extras din token
        await resetUserData(userId); // funcție care șterge tot progresul
        res.json({ success: true, message: 'All progress has been reset.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Reset failed' });
    }
});


const pool = require('../db');
async function resetUserData(userId) {
    // Înlocuiește numele tabelelor cu cele reale din schema ta Supabase/PostgreSQL
    await pool.query('DELETE FROM user_lessons WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_console_visits WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_favorites WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM user_owned_consoles WHERE user_id = $1', [userId]);
}

module.exports = router;