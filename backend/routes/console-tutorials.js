/* ─────────────────────────────────────────
   FILE: console-tutorials.js
   DESCRIPTION: Per-model tutorial content for console-model.html (the
   detail page linked from both console-care.html's and console-modding.html's
   model directories). Admin-only write, public read — one row per hardware
   model code (e.g. "SCPH-50004"), keyed to the same `code` used in
   frontend/js/data/console-models.js. Each row holds TWO independent
   write-ups sharing one schema shape (title/intro/steps JSONB): the
   disassembly tutorial (title/intro/steps) and the modding guide
   (mod_title/mod_intro/mod_steps) — kept in the same table since they're
   keyed by the same model_code and never queried separately. Step photos
   are uploaded separately via the existing POST /api/uploads/presign
   ('tutorial' kind).
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
        await pool.query(`
            ALTER TABLE console_tutorials ADD COLUMN IF NOT EXISTS mod_title TEXT;
            ALTER TABLE console_tutorials ADD COLUMN IF NOT EXISTS mod_intro TEXT;
            ALTER TABLE console_tutorials ADD COLUMN IF NOT EXISTS mod_steps JSONB NOT NULL DEFAULT '[]';
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
// Returns both the disassembly tutorial and the modding guide for this model.
router.get('/:code', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT model_code, title, intro, steps, mod_title, mod_intro, mod_steps, updated_at FROM console_tutorials WHERE model_code = $1',
            [req.params.code]
        );
        if (!rows.length) return res.json({ success: true, tutorial: null });
        res.json({ success: true, tutorial: rows[0] });
    } catch (err) {
        console.error('Console tutorial GET error:', err.message);
        res.status(500).json({ success: false, error: 'Could not load tutorial.' });
    }
});

// PUT /api/console-tutorials/:code — admin-only upsert of the disassembly tutorial
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
             RETURNING model_code, title, intro, steps, mod_title, mod_intro, mod_steps, updated_at`,
            [code, title, intro, JSON.stringify(steps), req.user.id]
        );
        res.json({ success: true, tutorial: rows[0] });
    } catch (err) {
        console.error('Console tutorial PUT error:', err.message);
        res.status(500).json({ success: false, error: 'Could not save tutorial.' });
    }
});

// DELETE /api/console-tutorials/:code — admin-only, revert disassembly tutorial to "Coming soon"
router.delete('/:code', authRequired, adminOnly, async (req, res) => {
    try {
        await pool.query(
            `UPDATE console_tutorials SET title = NULL, intro = NULL, steps = '[]' WHERE model_code = $1`,
            [req.params.code]
        );
        await pool.query(
            `DELETE FROM console_tutorials WHERE model_code = $1 AND mod_title IS NULL AND mod_intro IS NULL AND mod_steps = '[]'`,
            [req.params.code]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Console tutorial DELETE error:', err.message);
        res.status(500).json({ success: false, error: 'Could not delete tutorial.' });
    }
});

// PUT /api/console-tutorials/:code/mod — admin-only upsert of the modding guide
router.put('/:code/mod', authRequired, adminOnly, async (req, res) => {
    try {
        const code = String(req.params.code || '').slice(0, 60);
        if (!code) return res.status(400).json({ success: false, error: 'Missing model code.' });

        const modTitle = String(req.body?.title || '').slice(0, 200);
        const modIntro = String(req.body?.intro || '').slice(0, 5000);
        const modSteps = sanitizeSteps(req.body?.steps);

        const { rows } = await pool.query(
            `INSERT INTO console_tutorials (model_code, mod_title, mod_intro, mod_steps, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (model_code) DO UPDATE
               SET mod_title = EXCLUDED.mod_title, mod_intro = EXCLUDED.mod_intro, mod_steps = EXCLUDED.mod_steps,
                   updated_by = EXCLUDED.updated_by, updated_at = NOW()
             RETURNING model_code, title, intro, steps, mod_title, mod_intro, mod_steps, updated_at`,
            [code, modTitle, modIntro, JSON.stringify(modSteps), req.user.id]
        );
        res.json({ success: true, tutorial: rows[0] });
    } catch (err) {
        console.error('Console mod guide PUT error:', err.message);
        res.status(500).json({ success: false, error: 'Could not save modding guide.' });
    }
});

// DELETE /api/console-tutorials/:code/mod — admin-only, revert modding guide to "Coming soon"
router.delete('/:code/mod', authRequired, adminOnly, async (req, res) => {
    try {
        await pool.query(
            `UPDATE console_tutorials SET mod_title = NULL, mod_intro = NULL, mod_steps = '[]' WHERE model_code = $1`,
            [req.params.code]
        );
        await pool.query(
            `DELETE FROM console_tutorials WHERE model_code = $1 AND title IS NULL AND intro IS NULL AND steps = '[]'`,
            [req.params.code]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Console mod guide DELETE error:', err.message);
        res.status(500).json({ success: false, error: 'Could not delete modding guide.' });
    }
});

module.exports = router;
