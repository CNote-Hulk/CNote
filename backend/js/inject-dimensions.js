/**
 * Parse the "dimensions" research file and inject structured dimension data
 * into all 6 console language JSON files.
 *
 * Run: node backend/js/inject-dimensions.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const dimFile = path.join(ROOT, 'dimensions');
const raw = fs.readFileSync(dimFile, 'utf8');

// ── Parse the research file ──
// Each console block starts with "slug-name:\n\nMeasurements\n..."
// Stop at the "CONSOLE ADD-ONS RESEARCH" separator
const cutoff = raw.indexOf('================================================================================');
const consolePart = cutoff > -1 ? raw.slice(0, cutoff) : raw;

// Split into blocks per console
const blocks = consolePart.split(/\n(?=[a-z0-9][a-z0-9 -]*:\s*\n)/i);

/**
 * Normalise a mm value from various formats.
 * Tries to pull the first set of WxHxD in mm from the text.
 */
function parseDimensions(text) {
    // We'll extract ALL model variants if present
    const models = [];

    // Lines like "Model 1 (1988): Width × Height × Depth: 357 mm × 67 mm × 208 mm ..."
    // OR just "Width × Height × Depth: 241 mm × 76 mm × 190 mm ..."
    // OR "135 mm × 36 mm × 135 mm"
    const lineRe = /^(.+?)(?:Width\s*[×x]\s*Height\s*[×x]\s*Depth\s*:\s*)?(\d+(?:\.\d+)?)\s*mm\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm/gmi;

    let match;
    while ((match = lineRe.exec(text)) !== null) {
        let label = match[1].trim().replace(/:+\s*$/, '').trim();
        // Clean up label — remove leading dimensions keywords
        label = label.replace(/^Width\s*[×x]\s*Height\s*[×x]\s*Depth\s*:\s*/i, '').trim();
        if (!label || label === ':') label = null;

        const w = parseFloat(match[2]);
        const h = parseFloat(match[3]);
        const d = parseFloat(match[4]);

        models.push({ label, width_mm: w, height_mm: h, depth_mm: d });
    }

    // Fallback: try "overall: 9.525 cm x 41.91 cm x 41.91 cm" format
    if (models.length === 0) {
        const cmMatch = text.match(/(\d+(?:\.\d+)?)\s*cm\s*[×x]\s*(\d+(?:\.\d+)?)\s*cm\s*[×x]\s*(\d+(?:\.\d+)?)\s*cm/i);
        if (cmMatch) {
            models.push({
                label: null,
                width_mm: Math.round(parseFloat(cmMatch[2]) * 10 * 100) / 100, // width
                height_mm: Math.round(parseFloat(cmMatch[1]) * 10 * 100) / 100, // height
                depth_mm: Math.round(parseFloat(cmMatch[3]) * 10 * 100) / 100   // depth
            });
        }
    }

    // Fallback: "7.5×18×16 in; 19.05×45.72×40.64 cm"
    if (models.length === 0) {
        const inMatch = text.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*in/i);
        if (inMatch) {
            const toMm = v => Math.round(parseFloat(v) * 25.4 * 100) / 100;
            models.push({
                label: null,
                width_mm: toMm(inMatch[1]),
                height_mm: toMm(inMatch[2]),
                depth_mm: toMm(inMatch[3])
            });
        }
    }

    // Fallback: "74 cm (Length), 79 cm (Width), 150 cm (Height)"
    if (models.length === 0) {
        const labelled = {};
        const re = /(\d+(?:\.\d+)?)\s*cm\s*\((\w+)\)/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            labelled[m[2].toLowerCase()] = Math.round(parseFloat(m[1]) * 10 * 100) / 100;
        }
        if (labelled.width && labelled.height) {
            models.push({
                label: null,
                width_mm: labelled.width,
                height_mm: labelled.height,
                depth_mm: labelled.length || labelled.depth || 0
            });
        }
    }

    return models;
}

// Build a map: consoleId → dimensions array
const dimensionsMap = {};

for (const block of blocks) {
    const headerMatch = block.match(/^([a-z0-9][a-z0-9 -]*):\s*\n/i);
    if (!headerMatch) continue;

    let slug = headerMatch[1].trim().toLowerCase().replace(/\s+/g, '-');
    // Fix "magnavox odyssey" → "magnavox-odyssey"
    const rest = block.slice(headerMatch[0].length);

    const models = parseDimensions(rest);
    if (models.length > 0) {
        dimensionsMap[slug] = models;
    }
}

console.log(`Parsed dimensions for ${Object.keys(dimensionsMap).length} consoles.`);

// Print what we found for verification
for (const [id, models] of Object.entries(dimensionsMap)) {
    for (const m of models) {
        console.log(`  ${id}${m.label ? ' [' + m.label + ']' : ''}: ${m.width_mm} × ${m.height_mm} × ${m.depth_mm} mm`);
    }
}

// ── Inject into JSON files ──
const jsonFiles = [
    'consoles-en.json', 'consoles-ro.json', 'consoles-es.json',
    'consoles-fr.json', 'consoles-de.json', 'consoles-it.json'
];

let totalUpdated = 0;

for (const file of jsonFiles) {
    const filePath = path.join(ROOT, 'frontend/js/data', file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${file} (not found)`);
        continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updated = 0;

    for (const console of data) {
        const dims = dimensionsMap[console.id];
        if (dims) {
            // Build the dimensions object
            if (dims.length === 1) {
                console.dimensions = {
                    width_mm: dims[0].width_mm,
                    height_mm: dims[0].height_mm,
                    depth_mm: dims[0].depth_mm
                };
            } else {
                // Multiple models: store as models array
                console.dimensions = {
                    models: dims.map(d => ({
                        ...(d.label ? { label: d.label } : {}),
                        width_mm: d.width_mm,
                        height_mm: d.height_mm,
                        depth_mm: d.depth_mm
                    }))
                };
            }
            updated++;
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log(`${file}: updated ${updated} consoles`);
    totalUpdated += updated;
}

console.log(`\nDone! Total updates: ${totalUpdated} across ${jsonFiles.length} files.`);
