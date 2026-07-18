const express = require('express');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// GET /api/forum/liked — threads the current user has upvoted (dashboard widget)
const pool = require('../db');
router.get('/', authRequired, async (req, res) => {
    try {
        // Se presupune că există o tabelă forum_upvotes(user_id, thread_id)
        const result = await pool.query(`
            SELECT t.id, t.title, t.console, t.tag, t.views, t.upvotes, t.created_at
            FROM forum_threads t
            JOIN forum_upvotes u ON u.thread_id = t.id
            WHERE u.user_id = $1
            ORDER BY t.created_at DESC
        `, [req.user.id]);
        res.json({ success: true, liked: result.rows });
    } catch (err) {
        console.error('Forum liked GET error:', err);
        res.json({ success: true, liked: [] });
    }
});

module.exports = router;