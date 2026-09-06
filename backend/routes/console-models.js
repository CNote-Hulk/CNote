/* ─────────────────────────────────────────
   FILE: console-models.js
   DESCRIPTION: Hardware model/revision directory (mfr/console/code/note) —
   the "Identify Your Model" grid on console-care.html/console-modding.html
   and the per-model console-model.html detail page. Was a static JS array
   (frontend/js/data/console-models.js) checked into git; moved to Postgres
   (2026-09-06, Phase 3 of the site-wide admin-editing task) so admins can
   add a new model and edit an existing one's mfr/console/code/note directly
   from the site — MOD_OPTIONS (the flash-type/firmware pick-list) stays a
   static export in that same JS file, untouched by this.
   ───────────────────────────────────────── */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authRequired } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

(async function initConsoleModelsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS console_models (
                id SERIAL PRIMARY KEY,
                mfr VARCHAR(60) NOT NULL,
                console VARCHAR(60) NOT NULL,
                code VARCHAR(60) NOT NULL UNIQUE,
                note TEXT DEFAULT '',
                updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error('[console-models] table init error:', err.message);
    }
})();

// GET /api/console-models — public, no auth needed. Ordered by id (insertion
// order) so the directory/manufacturer grouping stays stable and matches the
// order the original static array shipped the 209-model migration in.
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, mfr, console, code, note FROM console_models ORDER BY id');
        res.json({ success: true, models: rows });
    } catch (err) {
        console.error('GET /console-models error:', err.message);
        res.status(500).json({ success: false, error: 'Could not load models.' });
    }
});

// POST /api/console-models — admin-only, add a new model.
router.post('/', authRequired, adminOnly, async (req, res) => {
    const { mfr, console: consoleName, code, note } = req.body || {};
    if (!mfr || !consoleName || !code) {
        return res.status(400).json({ success: false, error: 'mfr, console, and code are required.' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO console_models (mfr, console, code, note, updated_by, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id, mfr, console, code, note`,
            [String(mfr).trim().slice(0, 60), String(consoleName).trim().slice(0, 60), String(code).trim().slice(0, 60), String(note || '').slice(0, 500), req.user.id]
        );
        res.json({ success: true, model: rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: 'A model with that code already exists.' });
        }
        console.error('POST /console-models error:', err.message);
        res.status(500).json({ success: false, error: 'Could not add model.' });
    }
});

// PUT /api/console-models/:id — admin-only, edit mfr/console/code/note. If
// `code` changes, cascades the rename into console_tutorials and
// console_mod_tutorials (both keyed by model_code) inside the same
// transaction — otherwise renaming a model's code would silently orphan any
// disassembly/modding-guide content already written for the old code.
router.put('/:id', authRequired, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid model id.' });
    }
    const { mfr, console: consoleName, code, note } = req.body || {};
    if (!mfr || !consoleName || !code) {
        return res.status(400).json({ success: false, error: 'mfr, console, and code are required.' });
    }
    const newCode = String(code).trim().slice(0, 60);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query('SELECT code FROM console_models WHERE id = $1', [id]);
        if (!existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Model not found.' });
        }
        const oldCode = existing.rows[0].code;

        const { rows } = await client.query(
            `UPDATE console_models SET mfr = $2, console = $3, code = $4, note = $5, updated_by = $6, updated_at = NOW()
             WHERE id = $1
             RETURNING id, mfr, console, code, note`,
            [id, String(mfr).trim().slice(0, 60), String(consoleName).trim().slice(0, 60), newCode, String(note || '').slice(0, 500), req.user.id]
        );

        if (oldCode !== newCode) {
            await client.query('UPDATE console_tutorials SET model_code = $2 WHERE model_code = $1', [oldCode, newCode]);
            await client.query('UPDATE console_mod_tutorials SET model_code = $2 WHERE model_code = $1', [oldCode, newCode]);
        }

        await client.query('COMMIT');
        res.json({ success: true, model: rows[0] });
    } catch (err) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        if (err.code === '23505') {
            return res.status(409).json({ success: false, error: 'Another model already uses that code.' });
        }
        console.error('PUT /console-models/:id error:', err.message);
        res.status(500).json({ success: false, error: 'Could not save model.' });
    } finally {
        client.release();
    }
});

module.exports = router;
