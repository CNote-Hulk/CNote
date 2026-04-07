const express = require('express');
const pool = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/owned-consoles — List all owned console IDs for current user
router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT console_id FROM user_owned_consoles WHERE user_id = $1',
            [req.user.id]
        );
        res.json({ success: true, consoles: result.rows.map(r => r.console_id) });
    } catch (err) {
        console.error('Owned consoles GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
