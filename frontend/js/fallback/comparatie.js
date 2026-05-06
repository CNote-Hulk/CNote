/**
 * Comparatie Fallback (non-module)
 * Includes hamburger menu + comparison logic for file:// usage
 * Reads data from embedded copy of consoles.json structure
 */

(function(){
    // Hamburger Menu
    const h = document.querySelector('.hamburger');
    const n = document.querySelector('.nav-links');
    const b = document.body;
    if (h && n) {
        const o = () => {
            h.classList.add('active');
            n.classList.add('active');
            b.classList.add('menu-open');
            h.setAttribute('aria-expanded', 'true');
        };
        const c = () => {
            h.classList.remove('active');
            n.classList.remove('active');
            b.classList.remove('menu-open');
            h.setAttribute('aria-expanded', 'false');
        };
        const t = () => (n.classList.contains('active') ? c() : o());
        h.addEventListener('click', t);
        n.querySelectorAll('a').forEach(l => l.addEventListener('click', c));
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && n.classList.contains('active')) c();
        });
        document.addEventListener('click', e => {
            if (n.classList.contains('active') && !n.contains(e.target) && !h.contains(e.target)) c();
        });
    }

    // === FALLBACK: Try loading consoles-en.json, else use embedded data ===
    const selectA = document.getElementById('console-a-select');
    const selectB = document.getElementById('console-b-select');
    const display = document.getElementById('comparison-display');
    if (!selectA || !selectB || !display) return;

    // Try fetching JSON first, fallback to inline
    let consolesData = null;

    /** Load JSON via XHR (file:// protocol friendly, no fetch) */
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
                        reject(new Error('HTTP ' + xhr.status));
                    }
                };
                xhr.onerror = () => reject(new Error('XHR error'));
                xhr.send();
            } catch (err) {
                reject(err);
            }
        });
    }

    /** Try loading console data for current language */
    function tryFetchJson() {
        // Nu mai încercăm consoles.json, doar consoles-en.json sau API
        if (window.location.protocol === 'file:') {
            return loadJsonWithXhr('../../js/data/consoles-en.json').catch(() => window.CONSOLES_DATA || null);
        }
        // În mod HTTP, încearcă API-ul, apoi consoles-en.json
        return fetch('/api/consoles?lang=en')
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .catch(() => {
                return fetch('../../js/data/consoles-en.json')
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .catch(() => window.CONSOLES_DATA || null);
            });
    }

    /** Initialize comparison app with loaded console data */
    function startApp(data) {
        consolesData = data;
        if (!consolesData || consolesData.length === 0) {
            // SAFE: hardcoded only — no user data in this string.
            display.innerHTML = '<p class="comparison-error">Could not load console data. Use a local HTTP server.</p>';
            return;
        }
        populateSelects();
        selectA.value = 'playstation-5';
        selectB.value = 'xbox-series-x';
        selectA.addEventListener('change', update);
        selectB.addEventListener('change', update);
        update();
    }

    const GEN_LABELS = {
        9: 'Generation 9 (2020 – Present)',
        8: 'Generation 8 (2012 – 2020)',
        7: 'Generation 7 (2005 – 2013)',
        6: 'Generation 6 (1998 – 2006)',
        5: 'Generation 5 (1994 – 2001)',
        4: 'Generation 4 (1987 – 1996)',
        3: 'Generation 3 (1985 – 1990)',
        2: 'Generation 2 (1980 – 1984)',
        1: 'Generation 1 (1972 – 1980)'
    };

    /** Fill both <select> dropdowns with console options */
    function populateSelects() {
        const gens = {};
        consolesData.forEach(c => {
            const g = c.generation;
            if (!gens[g]) gens[g] = [];
            gens[g].push(c);
        });

        [selectA, selectB].forEach(sel => {
            sel.innerHTML = ''; // SAFE: clearing only — no content injected.
            Object.keys(gens).sort((a, b) => b - a).forEach(gen => {
                const og = document.createElement('optgroup');
                og.label = GEN_LABELS[gen] || ('Generation ' + gen);
                gens[gen].sort((a, b) => b.release - a.release).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name + ' (' + c.release + ')';
                    og.appendChild(opt);
                });
                sel.appendChild(og);
            });
        });
    }

    const SPEC_SECTIONS = [
        { key: 'cpu', label: 'CPU', fields: [
            { key: 'architecture', label: 'Architecture' },
            { key: 'proces_nm', label: 'Process (nm)' },
            { key: 'cores', label: 'Cores/Threads' },
            { key: 'frequency', label: 'Clock Speed' },
            { key: 'tdp', label: 'TDP' }
        ]},
        { key: 'gpu', label: 'GPU', fields: [
            { key: 'architecture', label: 'Architecture' },
            { key: 'units', label: 'Units/CUs' },
            { key: 'frequency', label: 'Clock Speed' },
            { key: 'tflops', label: 'TFLOPS' },
            { key: 'capabilities', label: 'Capabilities' }
        ]},
        { key: 'memory', label: 'Memory', fields: [
            { key: 'type', label: 'Type' },
            { key: 'capacity', label: 'Capacity' },
            { key: 'bus', label: 'Bus' },
            { key: 'bandwidth', label: 'Bandwidth' }
        ]},
        { key: 'storage', label: 'Storage', fields: [
            { key: 'type', label: 'Type' },
            { key: 'interface', label: 'Interface' },
            { key: 'speed', label: 'Speed' }
        ]},
        { key: 'output_video', label: 'Output Video', fields: [
            { key: 'resolution', label: 'Resolution' },
            { key: 'refresh', label: 'Refresh' },
            { key: 'hdr', label: 'HDR' },
            { key: 'upscaling', label: 'Upscaling' }
        ]},
        { key: 'technologies', label: 'Technologies', fields: [
            { key: 'ray_tracing', label: 'Ray Tracing' },
            { key: 'vrr', label: 'VRR' },
            { key: 'backwards_compatibility', label: 'Backwards Compat' },
            { key: 'other', label: 'Other' }
        ]}
    ];

    function formatValue(val) {
        if (val === true) return '<span class="flag yes"></span>';
        if (val === false) return '<span class="flag no"></span>';
        return val && String(val).trim().length && val !== 'N/A' ? val : 'N/A';
    }

    function getVal(obj, sectionKey, fieldKey) {
        return obj && obj[sectionKey] && obj[sectionKey][fieldKey] !== undefined
            ? obj[sectionKey][fieldKey] : null;
    }

    function resolveImg(imgPath) {
        return '../../' + imgPath;
    }

    /** Update the comparison table when selections change */
    function update() {
        const a = consolesData.find(c => c.id === selectA.value);
        const b = consolesData.find(c => c.id === selectB.value);
        if (!a || !b) return;

        const specsHtml = SPEC_SECTIONS.map(section => {
            const rows = section.fields.map(field => {
                const vA = getVal(a, section.key, field.key);
                const vB = getVal(b, section.key, field.key);
                if (vA === null && vB === null) return '';
                return '<div class="spec-row">' +
                    '<div class="spec-value spec-left">' + formatValue(vA) + '</div>' +
                    '<div class="spec-label">' + field.label + '</div>' +
                    '<div class="spec-value spec-right">' + formatValue(vB) + '</div>' +
                '</div>';
            }).filter(r => r.length > 0).join('');
            return rows ? '<div class="spec-section"><div class="spec-section-header">' + section.label + '</div>' + rows + '</div>' : '';
        }).filter(s => s.length > 0).join('');

        const prosA = (a.advantages || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
        const consA = (a.disadvantages || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');
        const prosB = (b.advantages || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
        const consB = (b.disadvantages || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');

        const specsSection = specsHtml ? '<div class="specs-comparison"><h3 class="specs-title">Technical Specs</h3><div class="spec-sheet">' + specsHtml + '</div></div>' : '';

        const verdictSection = (prosA || consA || prosB || consB) ?
            '<div class="verdict-section"><h3 class="verdict-title">Quick Overview</h3><div class="verdict-grid">' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + a.name + '</h4><div class="verdict-lists">' +
            (prosA ? '<div class="pros-list"><h5 class="list-title pros-title">Advantages</h5><ul>' + prosA + '</ul></div>' : '') +
            (consA ? '<div class="cons-list"><h5 class="list-title cons-title">Disadvantages</h5><ul>' + consA + '</ul></div>' : '') +
            '</div></div>' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + b.name + '</h4><div class="verdict-lists">' +
            (prosB ? '<div class="pros-list"><h5 class="list-title pros-title">Advantages</h5><ul>' + prosB + '</ul></div>' : '') +
            (consB ? '<div class="cons-list"><h5 class="list-title cons-title">Disadvantages</h5><ul>' + consB + '</ul></div>' : '') +
            '</div></div></div></div>' : '';

        // SAFE: data sourced from internal catalog JSON (consoles-en.json) or the
        // backend's own /api/consoles endpoint — not from user-generated input.
        // Fields: a.name, a.manufacturer, a.release, a.generation, a.image, a.id, etc.
        // are all authored console metadata. If this data source ever becomes
        // user-editable (e.g. user-submitted listings), sanitize with DOMPurify here.
        display.innerHTML =
            '<div class="comparison-grid">' +
            '<div class="console-card" data-console-id="' + a.id + '"><div class="console-card-image"><img src="' + resolveImg(a.image) + '" alt="' + a.name + '"></div>' +
            '<div class="console-card-info"><h3>' + a.name + '</h3><div class="console-meta-tags"><span class="meta-tag">' + a.manufacturer + '</span><span class="meta-tag">' + a.release + '</span><span class="meta-tag">Gen ' + a.generation + '</span></div></div></div>' +
            '<div class="comparison-vs"><span class="vs-badge">VS</span></div>' +
            '<div class="console-card" data-console-id="' + b.id + '"><div class="console-card-image"><img src="' + resolveImg(b.image) + '" alt="' + b.name + '"></div>' +
            '<div class="console-card-info"><h3>' + b.name + '</h3><div class="console-meta-tags"><span class="meta-tag">' + b.manufacturer + '</span><span class="meta-tag">' + b.release + '</span><span class="meta-tag">Gen ' + b.generation + '</span></div></div></div>' +
            '</div>' + specsSection + verdictSection;

        display.querySelectorAll('img').forEach(function (img) {
            img.addEventListener('error', function () {
                img.classList.add('image-hidden');
            });
        });

        // Add click handlers to console cards
        document.querySelectorAll('.console-card[data-console-id]').forEach(function (card) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function () {
                var consoleId = this.getAttribute('data-console-id');
                window.location.href = './consoles/' + consoleId + '.html';
            });
        });
    }

    // Try fetch first, otherwise show error
    tryFetchJson().then(data => startApp(data));
})();
