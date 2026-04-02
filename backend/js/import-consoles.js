/**
 * Import console translations from frontend JSON files into the database.
 * Run once (or re-run to update): node backend/js/import-consoles.js
 */

const pool = require('../db');
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['en', 'ro', 'es', 'fr', 'de', 'it'];
const DATA_DIR = path.join(__dirname, '../../frontend/js/data');

async function importConsoles() {
	for (const lang of LANGUAGES) {
		const filePath = path.join(DATA_DIR, `consoles-${lang}.json`);
		if (!fs.existsSync(filePath)) {
			console.log(`Skipping ${lang}: file not found at ${filePath}`);
			continue;
		}

		const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		console.log(`Importing ${data.length} consoles for language: ${lang}...`);

		for (const console of data) {
			await pool.query(
				`INSERT INTO consoles_translations (id, lang, data)
				 VALUES ($1, $2, $3)
				 ON CONFLICT (id, lang) DO UPDATE SET data = EXCLUDED.data`,
				[console.id, lang, console]
			);
		}
		console.log(`  Done: ${lang}`);
	}

	console.log('\nImport complete!');
	process.exit(0);
}

importConsoles().catch(err => {
	console.error('Import failed:', err);
	process.exit(1);
});
