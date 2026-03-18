/**
 * Data Loader - Centralized module for loading console data from consoles.json
 * Single source of truth for all console specifications
 */

let _cache = null;
let _loading = null;

/**
 * Load JSON via XHR (works on file:// with status 0).
 * @param {string} path
 * @returns {Promise<Array|null>}
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
 * Resolve the base path to the data directory depending on the current page depth.
 * Works for both /html/pages/*.html and /html/pages/consoles/*.html
 */
function resolveJsonPath() {
    const path = window.location.pathname;
    // If we're in /html/pages/consoles/ -> go up 3 levels
    if (path.includes('/pages/consoles/') || path.includes('\\pages\\consoles\\')) {
        return '../../../js/data/consoles.json';
    }
    // If we're in /html/pages/ -> go up 2 levels
    if (path.includes('/pages/') || path.includes('\\pages\\')) {
        return '../../js/data/consoles.json';
    }
    // Root level
    return '/js/data/consoles.json';
}

/**
 * Load all consoles from consoles.json
 * Caches the result for subsequent calls
 * @returns {Promise<Array>} Array of console objects
 */
export async function loadConsoles() {
    if (_cache) return _cache;
    if (_loading) return _loading;

    _loading = (async () => {
        try {
            if (window.CONSOLES_DATA) {
                _cache = window.CONSOLES_DATA;
                return _cache;
            }
            const jsonPath = resolveJsonPath();
            if (window.location.protocol === 'file:') {
                _cache = await loadJsonWithXhr(jsonPath);
                return _cache;
            }
            const response = await fetch(jsonPath);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            _cache = await response.json();
            return _cache;
        } catch (err) {
            console.warn('Failed to fetch consoles.json, using embedded fallback:', err.message);
            // Return null so callers know to use fallback
            return null;
        } finally {
            _loading = null;
        }
    })();

    return _loading;
}

/**
 * Get a single console by ID
 * @param {string} id - Console slug (e.g., 'playstation-5')
 * @returns {Promise<Object|null>}
 */
export async function getConsoleById(id) {
    const consoles = await loadConsoles();
    if (!consoles) return null;
    return consoles.find(c => c.id === id) || null;
}

/**
 * Get all consoles sorted by year (newest first)
 * @returns {Promise<Array>}
 */
export async function getConsolesSorted() {
    const consoles = await loadConsoles();
    if (!consoles) return [];
    return [...consoles].sort((a, b) => b.release - a.release);
}

/**
 * Get consoles grouped by generation
 * @returns {Promise<Object>} { generation: [consoles] }
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
    // Sort each group by year descending
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.release - a.release));
    return groups;
}

/**
 * Get console ID from URL query parameter or path
 * Supports: ?id=playstation-5 or /consoles/playstation-5.html
 * @returns {string|null}
 */
export function getConsoleIdFromUrl() {
    // Check query parameter first
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) return idParam;

    // Extract from filename (e.g., playstation-5.html -> playstation-5)
    const path = window.location.pathname;
    const filename = path.split('/').pop().split('\\').pop();
    if (filename && filename.endsWith('.html')) {
        const slug = filename.replace('.html', '');
        // Don't return generic page names
        if (!['index', 'comparatie', 'evolutie', 'invata', 'fizica', 'informatica', 'console'].includes(slug)) {
            return slug;
        }
    }
    return null;
}

/**
 * Resolve the image path relative to the current page depth
 * @param {string} imagePath - Relative path from project root (e.g., 'assets/images/consoles/ps5.webp')
 * @returns {string} Corrected relative path
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
