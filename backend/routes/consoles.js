const express = require('express');
const router = express.Router();
const pool = require('../db');

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

module.exports = router;
