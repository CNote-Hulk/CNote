// Console Notebook — hardware model/revision reference data.
// Shared by console-care.js (directory) and console-model.js (per-model detail page).
//
// MODELS used to be a static array here (209 entries, compiled from web
// research across PSDevWiki/ConsoleMods/Wikipedia/xboxdevwiki/Free60/Xbox One
// Research Wiki/3dbrew/Nintendo Life). Moved to Postgres (2026-09-06, Phase 3
// of the site-wide admin-editing task — see backend/routes/console-models.js)
// so admins can add a new model and edit an existing one's
// manufacturer/console/code/note directly from the site instead of editing
// this file and redeploying. All 209 original entries were migrated as-is
// (same order, same wording) — nothing was lost, just relocated.

// Static "what's pickable" option lists for the Modding Guide flash-type /
// firmware-version selector on console-model.html, keyed by the `console`
// field a model (loaded via loadModels() below) carries. This is NOT
// compatibility data (no claim that a given combination works) — it's just
// the menu of options a visitor can choose from before a real write-up
// exists for most of them, so the selector is visible and useful from the
// very first visit to a model page, not only once an admin has written
// something. Firmware bracket labels match the ones the site owner specified
// directly (not third-party research). A model whose `console` isn't listed
// here falls back to the old behaviour: the selector stays hidden until at
// least one real (flash_type, firmware_version) write-up exists for it.
export const MOD_OPTIONS = {
    'PS3': { flashTypes: ['NAND', 'NOR'], firmwareVersions: ['3.55', '3.56–4.80', '4.81–4.89', '4.90', '4.91', '4.92', '4.93'] },
    'PS3 Slim': { flashTypes: ['NOR'], firmwareVersions: ['3.55', '3.56–4.80', '4.81–4.89', '4.90', '4.91', '4.92', '4.93'] },
    'PS3 Super Slim': { flashTypes: ['NOR'], firmwareVersions: ['3.55', '3.56–4.80', '4.81–4.89', '4.90', '4.91', '4.92', '4.93'] },
};

// Same bare-relative-path fetch convention as the sibling data-loader.js in
// this same directory (no API_BASE_URL import — that module doesn't use it
// either, since neither has ever needed the frontend-hosted-separately
// override that config.js exists for).
let _cache = null;
let _loading = null;

/**
 * Load all hardware models from the API. Cached after the first successful
 * call — call invalidateModelsCache() after an admin add/edit to force a
 * fresh fetch (mirrors data-loader.js's loadConsoles()/invalidateCache()).
 */
export async function loadModels() {
    if (_cache) return _cache;
    if (_loading) return _loading;

    _loading = (async () => {
        try {
            const res = await fetch('/api/console-models');
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.models)) {
                    _cache = data.models;
                    return _cache;
                }
            }
        } catch { /* fall through */ }
        console.warn('Could not load console models from the API.');
        _cache = [];
        return _cache;
    })();

    const result = await _loading;
    _loading = null;
    return result;
}

export function invalidateModelsCache() {
    _cache = null;
    _loading = null;
}
