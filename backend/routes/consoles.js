const express = require('express');
const router = express.Router();
const pool = require('../db');
const { checkAndEmitAchievements } = require('../utils/check-achievements');

const ALLOWED_LANGS = ['en', 'ro', 'es', 'fr', 'de', 'it'];

// GET /api/consoles?lang=en  — all consoles for a language
router.get('/', async (req, res) => {
	const lang = ALLOWED_LANGS.includes(req.query.lang) ? req.query.lang : 'en';
	try {
		let result = await pool.query(
			`SELECT data FROM consoles_translations WHERE lang = $1`,
			[lang]
		);
		// Fallback to English if requested language has no data
		if (result.rows.length === 0 && lang !== 'en') {
			result = await pool.query(
				`SELECT data FROM consoles_translations WHERE lang = 'en'`
			);
		}
		res.json(result.rows.map(r => r.data));
	} catch (err) {
		console.error('GET /api/consoles error:', err);
		res.status(500).json({ error: 'Failed to load consoles' });
	}
});

// GET /api/consoles/visited — Get all visited console IDs for current user
router.get('/visited', require('../middleware/auth').authRequired, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'SELECT console_id FROM user_console_visits WHERE user_id = $1',
            [userId]
        );
        res.json({ success: true, consoles: result.rows.map(r => r.console_id) });
    } catch (err) {
        console.error('GET /api/consoles/visited error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch visited consoles.' });
    }
});

// GET /api/consoles/:id?lang=en  — single console by id
router.get('/:id', async (req, res) => {
	const lang = ALLOWED_LANGS.includes(req.query.lang) ? req.query.lang : 'en';
	const { id } = req.params;
	try {
		let result = await pool.query(
			`SELECT data FROM consoles_translations WHERE id = $1 AND lang = $2`,
			[id, lang]
		);
		if (result.rows.length === 0 && lang !== 'en') {
			result = await pool.query(
				`SELECT data FROM consoles_translations WHERE id = $1 AND lang = 'en'`,
				[id]
			);
		}
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Console not found' });
		}
		res.json(result.rows[0].data);
	} catch (err) {
		console.error('GET /api/consoles/:id error:', err);
		res.status(500).json({ error: 'Failed to load console' });
	}
});

// POST /api/consoles/visit — Mark a console as visited by the current user
router.post('/visit', require('../middleware/auth').authRequired, async (req, res) => {
    const userId = req.user.id;
    const { console_id } = req.body;
    if (!console_id || typeof console_id !== 'string') {
        return res.status(400).json({ success: false, error: 'Console ID required.' });
    }
    try {
        await pool.query(
            `INSERT INTO user_console_visits (user_id, console_id) VALUES ($1, $2)
             ON CONFLICT (user_id, console_id) DO UPDATE SET visited_at = NOW()`,
            [userId, console_id.trim()]
        );
        res.json({ success: true });
        checkAndEmitAchievements(req.app.get('io'), userId).catch(() => {});
    } catch (err) {
        console.error('POST /api/consoles/visit error:', err);
        res.status(500).json({ success: false, error: 'Failed to record visit.' });
    }
});

module.exports = router;
