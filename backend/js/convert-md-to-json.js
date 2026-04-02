/**
 * Convert translated .md files into proper English-key JSON files.
 * Extracts advantages, disadvantages, history, technologies.other, gpu.capabilities
 * from each language file and merges them into the English JSON structure.
 *
 * Run: node backend/js/convert-md-to-json.js
 * Then: node backend/js/import-consoles.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'frontend', 'js', 'data');

// Per-language keys for the text fields we need to extract.
// Values can be a string or array of possible strings (some files are inconsistent).
const LANG_KEYS = {
	ro: {
		advantages:    'avantaje',
		disadvantages: 'dezavantaje',
		history:       'istorie',
		other:         'altele',
		capabilities:  'capacități',
	},
	de: {
		advantages:    'Vorteile',
		disadvantages: 'Nachteile',
		history:       'Geschichte',
		other:         'Sonstiges',
		capabilities:  ['Fähigkeiten', 'Funktionen'],
	},
	es: {
		advantages:    'ventajas',
		disadvantages: 'desventajas',
		history:       'historia',
		other:         ['Otros', 'otros', 'otro'],
		capabilities:  'capacidades',
	},
	fr: {
		advantages:    'avantages',
		disadvantages: ['désavantages', 'désavantages', 'inconvénients'],
		history:       ['Historique', 'histoire'],
		other:         ['Autres', 'autres'],
		capabilities:  ['Fonctionnalités', 'fonctionnalités', 'capacités'],
	},
	it: {
		advantages:    'vantaggi',
		disadvantages: 'svantaggi',
		history:       'storia',
		other:         ['Altro', 'altro'],
		capabilities:  ['funzionalità', 'Funzionalità'],
	},
};

// Normalize fancy/curly quotes to straight double quotes.
// We do this globally, then re-escape inner quotes from the HTML history strings.
function normalizeQuotes(text) {
	return text
		.replace(/\u201E/g, '"')  // „  Romanian/German opening low quote
		.replace(/\u201C/g, '"')  // "  Left double quotation mark
		.replace(/\u201D/g, '"')  // "  Right double quotation mark
		.replace(/\u00AB/g, '"')  // «  Left angle quotation mark
		.replace(/\u00BB/g, '"')  // »  Right angle quotation mark
		.replace(/\u2018/g, "'")  // '  Left single quotation mark
		.replace(/\u2019/g, "'")  // '  Right single quotation mark
		.replace(/\u201A/g, "'")  // ‚  Low single quotation mark
		;
}

function matches(key, langKey) {
	if (Array.isArray(langKey)) return langKey.includes(key);
	return key === langKey;
}

// Extract the key name from a trimmed line like: "SomeKey": ...
function getLineKey(trimmed) {
	const m = trimmed.match(/^"([^"]+)"\s*:/);
	return m ? m[1] : null;
}

// Extract a short string value from a trimmed line like: "key": "value",
function getStringValue(trimmed) {
	const m = trimmed.match(/^"[^"]+"\s*:\s*"(.*?)"\s*,?\s*$/);
	return m ? m[1] : null;
}

function processLanguage(lang) {
	const mdPath  = path.join(ROOT, `consoles-${lang}.md`);
	const outPath = path.join(DATA_DIR, `consoles-${lang}.json`);
	const engPath = path.join(DATA_DIR, 'consoles-en.json');

	if (!fs.existsSync(mdPath)) {
		console.log(`  Skipping ${lang}: ${mdPath} not found`);
		return;
	}

	const keys    = LANG_KEYS[lang];
	const engData = JSON.parse(fs.readFileSync(engPath, 'utf8'));

	let text = fs.readFileSync(mdPath, 'utf8');
	text = normalizeQuotes(text);
	const lines = text.split('\n');

	// translations[id] = { advantages[], disadvantages[], history, other, capabilities }
	const translations = {};

	let currentId    = null;
	let inArray      = null;   // 'advantages' | 'disadvantages' | null
	let arrayItems   = [];
	let inHistory    = false;
	let historyLines = [];

	for (let i = 0; i < lines.length; i++) {
		const raw     = lines[i];
		const trimmed = raw.trim();

		// ── detect console id ────────────────────────────────────────────────
		const idMatch = trimmed.match(/^"id"\s*:\s*"([^"]+)"/);
		if (idMatch) {
			// flush any pending history
			if (inHistory && currentId) {
				translations[currentId].history = historyLines.join('\n');
			}
			currentId  = idMatch[1];
			inArray    = null;
			arrayItems = [];
			inHistory  = false;
			historyLines = [];
			if (!translations[currentId]) translations[currentId] = {};
			continue;
		}

		if (!currentId) continue;
		const trans = translations[currentId];

		// ── currently collecting history (multi-line) ────────────────────────
		if (inHistory) {
			// History ends when we hit a new top-level key or end of console
			if (trimmed === '},' || trimmed === '}') {
				trans.history = historyLines.join('\n')
					.replace(/"\s*,?\s*$/, '')  // remove trailing closing "
					.trim();
				inHistory = false;
				historyLines = [];
				continue;
			}
			if (/^"[^"]+"\s*:/.test(trimmed)) {
				// New key started — history ended on the previous line
				trans.history = historyLines.join('\n')
					.replace(/"\s*,?\s*$/, '')
					.trim();
				inHistory = false;
				historyLines = [];
				// fall through to process current line normally
			} else {
				historyLines.push(raw);
				continue;
			}
		}

		// ── currently collecting an array (advantages / disadvantages) ───────
		if (inArray) {
			if (trimmed === ']' || trimmed === '],') {
				trans[inArray] = [...arrayItems];
				inArray    = null;
				arrayItems = [];
				continue;
			}
			// Each item is a quoted string on its own line
			const itemMatch = trimmed.match(/^"(.*?)"[,]?\s*$/);
			if (itemMatch) arrayItems.push(itemMatch[1]);
			continue;
		}

		// ── look for a key we care about ─────────────────────────────────────
		const key = getLineKey(trimmed);
		if (!key) continue;

		// advantages
		if (matches(key, keys.advantages)) {
			if (trimmed.includes('[') && trimmed.includes(']')) {
				// Entire array on one line — extract all quoted items
				const content = trimmed.replace(/^"[^"]+"\s*:\s*\[/, '').replace(/\]\s*,?\s*$/, '');
				const items = [];
				content.replace(/"([^"]+)"/g, (_, s) => items.push(s));
				trans.advantages = items;
			} else {
				inArray    = 'advantages';
				arrayItems = [];
			}
			continue;
		}

		// disadvantages
		if (matches(key, keys.disadvantages)) {
			if (trimmed.includes('[') && trimmed.includes(']')) {
				const content = trimmed.replace(/^"[^"]+"\s*:\s*\[/, '').replace(/\]\s*,?\s*$/, '');
				const items = [];
				content.replace(/"([^"]+)"/g, (_, s) => items.push(s));
				trans.disadvantages = items;
			} else {
				inArray    = 'disadvantages';
				arrayItems = [];
			}
			continue;
		}

		// history
		const histKeys = Array.isArray(keys.history) ? keys.history : [keys.history];
		if (histKeys.includes(key)) {
			const colonIdx  = trimmed.indexOf(':');
			const afterColon = trimmed.substring(colonIdx + 1).trim();
			if (afterColon.startsWith('"')) {
				const inner = afterColon.slice(1); // drop opening "
				// Single-line history ends with closing " (optionally followed by ,)
				if (/^(.*?)"\s*,?\s*$/.test(inner)) {
					trans.history = inner.replace(/"\s*,?\s*$/, '');
				} else {
					// Multi-line: collect until we see the closing pattern
					inHistory    = true;
					historyLines = [inner];
				}
			}
			continue;
		}

		// technologies.other
		if (matches(key, keys.other)) {
			const val = getStringValue(trimmed);
			if (val) trans.technologies_other = val;
			continue;
		}

		// gpu.capabilities
		if (matches(key, keys.capabilities)) {
			const val = getStringValue(trimmed);
			if (val) trans.gpu_capabilities = val;
			continue;
		}
	}

	// flush trailing history if file ends without a closing }
	if (inHistory && currentId) {
		translations[currentId].history = historyLines.join('\n')
			.replace(/"\s*,?\s*$/, '').trim();
	}

	// ── merge translated fields into the English JSON ────────────────────────
	let translated = 0;
	const result = engData.map(eng => {
		const t = translations[eng.id];
		if (!t) {
			console.warn(`  [${lang}] WARNING: no translation for ${eng.id}`);
			return eng;
		}

		const merged = { ...eng };

		if (t.advantages    && t.advantages.length    > 0) merged.advantages    = t.advantages;
		if (t.disadvantages && t.disadvantages.length > 0) merged.disadvantages = t.disadvantages;
		if (t.history                                     ) merged.history       = t.history.trim();
		if (t.technologies_other) {
			merged.technologies = { ...eng.technologies, other: t.technologies_other };
		}
		if (t.gpu_capabilities) {
			merged.gpu = { ...eng.gpu, capabilities: t.gpu_capabilities };
		}

		translated++;
		return merged;
	});

	fs.writeFileSync(outPath, JSON.stringify(result, null, '\t'), 'utf8');
	console.log(`  ✓ ${lang}: ${translated}/${result.length} consoles translated → consoles-${lang}.json`);
}

console.log('Converting translated .md files to JSON...\n');
for (const lang of ['ro', 'de', 'es', 'fr', 'it']) {
	processLanguage(lang);
}
console.log('\nDone! Now run: npm run import-consoles');
