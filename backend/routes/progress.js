const express = require('express');
const { authRequired } = require('../middleware/auth');
const router = express.Router();

// GET /api/progress — Dummy endpoint for dashboard
router.get('/', authRequired, async (req, res) => {
    // Returnează progres dummy (poți completa cu logică reală ulterior)
    res.json({ success: true, progress: {} });
});

module.exports = router;
