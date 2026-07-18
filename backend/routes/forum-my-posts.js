const express = require('express');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// GET /api/forum/my-posts — threads created by the current user (dashboard widget)
const pool = require('../db');
router.get('/', authRequired, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.id, t.title, t.console, t.tag, t.views, t.upvotes, t.created_at
            FROM forum_threads t
            WHERE t.user_id = $1
            ORDER BY t.created_at DESC
        `, [req.user.id]);
        res.json({ success: true, posts: result.rows });
    } catch (err) {
        console.error('Forum my-posts GET error:', err);
        res.status(500).json({ success: false, error: 'Internal error.' });
    }
});

module.exports = router;
