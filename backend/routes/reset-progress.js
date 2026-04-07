const express = require('express');
const router = express.Router();
const { authRequired } = require('../middleware/auth');


router.post('/reset-progress', authRequired, async (req, res) => {
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

// Each query runs independently — a missing table won't block the rest
async function resetUserData(userId) {
    const queries = [
        'DELETE FROM user_lessons WHERE user_id = $1',
        'DELETE FROM user_achievements WHERE user_id = $1',  // achievement unlock history
        'DELETE FROM user_console_visits WHERE user_id = $1',
        'DELETE FROM user_favorites WHERE user_id = $1',
        'DELETE FROM user_owned_consoles WHERE user_id = $1',
    ];
    for (const q of queries) {
        try { await pool.query(q, [userId]); } catch (_) { /* table may not exist yet */ }
    }
}

module.exports = router;