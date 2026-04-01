/**
 * Data Loader - Centralized module for loading console data
 * Loads language-specific JSON files (consoles-{lang}.json)
 * and falls back to window.CONSOLES_DATA (English).
 */

const LANG_KEY = 'cnote_lang';
let _cache = null;
let _cacheLang = null;
let _loading = null;

/**
 * Load JSON via XHR (works on file:// with status 0).
 */
function loadJsonWithXhr(path) {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', path, true);
            xhr.overrideMimeType('application/json');
            xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('XHR error'));
            xhr.send();
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get current language from localStorage.
 */
function getCurrentLang() {
    return localStorage.getItem(LANG_KEY) || 'en';
}

/**
 * Resolve the path to the language-specific console JSON.
 */
function resolveJsonPath(lang) {
    const filename = `consoles-${lang}.json`;
    const path = window.location.pathname;
    if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) {
        return `../../../js/data/${filename}`;
    }
    if (path.includes('/pages/curs/') || path.includes('\\pages\\curs\\')) {
        return `../../../js/data/${filename}`;
    }
    if (path.includes('/pages/') || path.includes('\\pages\\')) {
        return `../../js/data/${filename}`;
    }
    return `/js/data/${filename}`;
}

/**
 * Fetch a JSON file, trying fetch() first then XHR for file:// protocol.
 */
async function fetchJson(path) {
    if (window.location.protocol === 'file:') {
        return await loadJsonWithXhr(path);
    }
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}

/**
 * Load all consoles for the current language.
 * Priority: cached data for current lang → fetch consoles-{lang}.json → window.CONSOLES_DATA
 */
export async function loadConsoles() {
    const lang = getCurrentLang();

    // Return cache if same language
    if (_cache && _cacheLang === lang) return _cache;

    // If already loading for this lang, wait
    if (_loading && _cacheLang === lang) return _loading;

    _cacheLang = lang;

    _loading = (async () => {
        try {
            // Try to fetch the language-specific JSON
            const jsonPath = resolveJsonPath(lang);
            const data = await fetchJson(jsonPath);
            if (Array.isArray(data) && data.length > 0) {
                _cache = data;
                window.CONSOLES_DATA = data;
                return _cache;
            }
        } catch {
            // Language file not found — try English as fallback
            if (lang !== 'en') {
                try {
                    const enPath = resolveJsonPath('en');
                    const enData = await fetchJson(enPath);
                    if (Array.isArray(enData) && enData.length > 0) {
                        _cache = enData;
                        window.CONSOLES_DATA = enData;
                        return _cache;
                    }
                } catch { /* fall through */ }
            }
        }

        // Final fallback: use the embedded CONSOLES_DATA (from consoles-data.js script tag)
        if (window.CONSOLES_DATA) {
            _cache = window.CONSOLES_DATA;
            return _cache;
        }

        console.warn('Could not load console data for language:', lang);
        return null;
    })();

    const result = await _loading;
    _loading = null;
    return result;
}

/**
 * Invalidate the cache so next loadConsoles() re-fetches for the new language.
 */
export function invalidateCache() {
    _cache = null;
    _cacheLang = null;
    _loading = null;
}

// Listen for language changes and invalidate cache
window.addEventListener('cn:language-changed', () => {
    invalidateCache();
});

/**
 * Get a single console by ID
 */
export async function getConsoleById(id) {
    const consoles = await loadConsoles();
    if (!consoles) return null;
    return consoles.find(c => c.id === id) || null;
}

/**
 * Get all consoles sorted by year (newest first)
 */
export async function getConsolesSorted() {
    const consoles = await loadConsoles();
    if (!consoles) return [];
    return [...consoles].sort((a, b) => b.release - a.release);
}

/**
 * Get consoles grouped by generation
 */
export async function getConsolesByGeneration() {
    const consoles = await loadConsoles();
    if (!consoles) return {};
    const groups = {};
    consoles.forEach(c => {
        const gen = c.generation;
        if (!groups[gen]) groups[gen] = [];
        groups[gen].push(c);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.release - a.release));
    return groups;
}

/**
 * Get console ID from URL query parameter or path
 */
export function getConsoleIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) return idParam;

    const path = window.location.pathname;
    const filename = path.split('/').pop().split('\\').pop();
    if (filename && filename.endsWith('.html')) {
        const slug = filename.replace('.html', '');
        if (!['index', 'comparatie', 'evolutie', 'invata', 'fizica', 'informatica', 'console'].includes(slug)) {
            return slug;
        }
    }
    return null;
}

/**
 * Resolve the image path relative to the current page depth
 */
export function resolveImagePath(imagePath) {
    const path = window.location.pathname;
    if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) {
        return '../../../' + imagePath;
    }
    if (path.includes('/pages/') || path.includes('\\pages\\')) {
        return '../../' + imagePath;
    }
    return '/' + String(imagePath || '').replace(/^\/+/, '');
}
