/* ─────────────────────────────────────────
   FILE: console-tutorials.js
   DESCRIPTION: Per-model disassembly tutorial content for console-model.html
   (the "Coming soon" detail page linked from console-care.html's model
   directory). Admin-only write, public read — one row per hardware model
   code (e.g. "SCPH-50004"), keyed to the same `code` used in
   frontend/js/data/console-models.js. Step photos are uploaded separately
   via the existing POST /api/uploads/presign ('tutorial' kind).
   ───────────────────────────────────────── */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

(async function initConsoleTutorialsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS console_tutorials (
                model_code VARCHAR(60) PRIMARY KEY,
                title TEXT,
                intro TEXT,
                steps JSONB NOT NULL DEFAULT '[]',
                updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error('[console-tutorials] table init error:', err.message);
    }
})();

function sanitizeSteps(input) {
    if (!Array.isArray(input)) return [];
    return input
        .slice(0, 50)
        .map(s => ({
            heading: String(s?.heading || '').slice(0, 200),
            description: String(s?.description || '').slice(0, 5000),
            image_url: String(s?.image_url || '').slice(0, 500),
        }))
        .filter(s => s.heading || s.description || s.image_url);
}

// GET /api/console-tutorials/:code — public, no auth needed
router.get('/:code', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT model_code, title, intro, steps, updated_at FROM console_tutorials WHERE model_code = $1',
            [req.params.code]
        );
        if (!rows.length) return res.json({ success: true, tutorial: null });
        res.json({ success: true, tutorial: rows[0] });
    } catch (err) {
        console.error('Console tutorial GET error:', err.message);
        res.status(500).json({ success: false, error: 'Could not load tutorial.' });
    }
});

// PUT /api/console-tutorials/:code — admin-only upsert
router.put('/:code', authRequired, adminOnly, async (req, res) => {
    try {
        const code = String(req.params.code || '').slice(0, 60);
        if (!code) return res.status(400).json({ success: false, error: 'Missing model code.' });

        const title = String(req.body?.title || '').slice(0, 200);
        const intro = String(req.body?.intro || '').slice(0, 5000);
        const steps = sanitizeSteps(req.body?.steps);

        const { rows } = await pool.query(
            `INSERT INTO console_tutorials (model_code, title, intro, steps, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (model_code) DO UPDATE
               SET title = EXCLUDED.title, intro = EXCLUDED.intro, steps = EXCLUDED.steps,
                   updated_by = EXCLUDED.updated_by, updated_at = NOW()
             RETURNING model_code, title, intro, steps, updated_at`,
            [code, title, intro, JSON.stringify(steps), req.user.id]
        );
        res.json({ success: true, tutorial: rows[0] });
    } catch (err) {
        console.error('Console tutorial PUT error:', err.message);
        res.status(500).json({ success: false, error: 'Could not save tutorial.' });
    }
});

// DELETE /api/console-tutorials/:code — admin-only, revert to "Coming soon"
router.delete('/:code', authRequired, adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM console_tutorials WHERE model_code = $1', [req.params.code]);
        res.json({ success: true });
    } catch (err) {
        console.error('Console tutorial DELETE error:', err.message);
        res.status(500).json({ success: false, error: 'Could not delete tutorial.' });
    }
});

module.exports = router;
