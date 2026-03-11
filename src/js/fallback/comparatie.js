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

    // === FALLBACK: Try loading consoles.json, else use embedded data ===
    const selectA = document.getElementById('console-a-select');
    const selectB = document.getElementById('console-b-select');
    const display = document.getElementById('comparison-display');
    if (!selectA || !selectB || !display) return;

    // Try fetching JSON first, fallback to inline
    let consolesData = null;

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

    function tryFetchJson() {
        // Use pre-loaded global data first (works on file://)
        if (window.CONSOLES_DATA) {
            return Promise.resolve(window.CONSOLES_DATA);
        }
        const path = '../../js/data/consoles.json';
        if (window.location.protocol === 'file:') {
            return loadJsonWithXhr(path).catch(() => null);
        }
        return fetch(path)
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .catch(() => null);
    }

    function startApp(data) {
        consolesData = data;
        if (!consolesData || consolesData.length === 0) {
            display.innerHTML = '<p class="comparison-error">Nu s-au putut incarca datele consolelor. Folositi un server HTTP local.</p>';
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
        9: 'Generatia 9 (2020+)',
        8: 'Generatia 8 (2012-2017)',
        7: 'Generatia 7 (2005-2006)',
        6: 'Generatia 6 (1998-2001)',
        5: 'Generatia 5 (1993-1996)',
        4: 'Generatia 4 (1988-1990)',
        3: 'Generatia 3 (1983-1987)',
        2: 'Generatia 2 (1976-1982)',
        1: 'Generatia 1 (1972-1976)'
    };

    function populateSelects() {
        const gens = {};
        consolesData.forEach(c => {
            const g = c.generatie;
            if (!gens[g]) gens[g] = [];
            gens[g].push(c);
        });

        [selectA, selectB].forEach(sel => {
            sel.innerHTML = '';
            Object.keys(gens).sort((a, b) => b - a).forEach(gen => {
                const og = document.createElement('optgroup');
                og.label = GEN_LABELS[gen] || ('Generatia ' + gen);
                gens[gen].sort((a, b) => b.lansare - a.lansare).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.nume + ' (' + c.lansare + ')';
                    og.appendChild(opt);
                });
                sel.appendChild(og);
            });
        });
    }

    const SPEC_SECTIONS = [
        { key: 'cpu', label: 'CPU', fields: [
            { key: 'arhitectura', label: 'Arhitectura' },
            { key: 'proces_nm', label: 'Proces (nm)' },
            { key: 'nuclee', label: 'Nuclee/Fire' },
            { key: 'frecventa', label: 'Frecventa' },
            { key: 'tdp', label: 'TDP' }
        ]},
        { key: 'gpu', label: 'GPU', fields: [
            { key: 'arhitectura', label: 'Arhitectura' },
            { key: 'unitati', label: 'Unitati/CUs' },
            { key: 'frecventa', label: 'Frecventa' },
            { key: 'tflops', label: 'TFLOPS' },
            { key: 'capabilitati', label: 'Capabilitati' }
        ]},
        { key: 'memorie', label: 'Memorie', fields: [
            { key: 'tip', label: 'Tip' },
            { key: 'capacitate', label: 'Capacitate' },
            { key: 'magistrala', label: 'Magistrala' },
            { key: 'bandwidth', label: 'Bandwidth' }
        ]},
        { key: 'stocare', label: 'Stocare', fields: [
            { key: 'tip', label: 'Tip' },
            { key: 'interfata', label: 'Interfata' },
            { key: 'viteza', label: 'Viteza' }
        ]},
        { key: 'output_video', label: 'Output Video', fields: [
            { key: 'rezolutie', label: 'Rezolutie' },
            { key: 'refresh', label: 'Refresh' },
            { key: 'hdr', label: 'HDR' },
            { key: 'upscaling', label: 'Upscaling' }
        ]},
        { key: 'tehnologii', label: 'Tehnologii', fields: [
            { key: 'ray_tracing', label: 'Ray Tracing' },
            { key: 'vrr', label: 'VRR' },
            { key: 'backwards_compatibility', label: 'Backwards Compat' },
            { key: 'altele', label: 'Altele' }
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

        const prosA = (a.avantaje || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
        const consA = (a.dezavantaje || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');
        const prosB = (b.avantaje || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
        const consB = (b.dezavantaje || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');

        const specsSection = specsHtml ? '<div class="specs-comparison"><h3 class="specs-title">Fisa Tehnica</h3><div class="spec-sheet">' + specsHtml + '</div></div>' : '';

        const verdictSection = (prosA || consA || prosB || consB) ?
            '<div class="verdict-section"><h3 class="verdict-title">Overview Rapid</h3><div class="verdict-grid">' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + a.nume + '</h4><div class="verdict-lists">' +
            (prosA ? '<div class="pros-list"><h5 class="list-title pros-title">Avantaje</h5><ul>' + prosA + '</ul></div>' : '') +
            (consA ? '<div class="cons-list"><h5 class="list-title cons-title">Dezavantaje</h5><ul>' + consA + '</ul></div>' : '') +
            '</div></div>' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + b.nume + '</h4><div class="verdict-lists">' +
            (prosB ? '<div class="pros-list"><h5 class="list-title pros-title">Avantaje</h5><ul>' + prosB + '</ul></div>' : '') +
            (consB ? '<div class="cons-list"><h5 class="list-title cons-title">Dezavantaje</h5><ul>' + consB + '</ul></div>' : '') +
            '</div></div></div></div>' : '';

        display.innerHTML =
            '<div class="comparison-grid">' +
            '<div class="console-card" data-console-id="' + a.id + '"><div class="console-card-image"><img src="' + resolveImg(a.imagine) + '" alt="' + a.nume + '"></div>' +
            '<div class="console-card-info"><h3>' + a.nume + '</h3><div class="console-meta-tags"><span class="meta-tag">' + a.producator + '</span><span class="meta-tag">' + a.lansare + '</span><span class="meta-tag">Gen ' + a.generatie + '</span></div></div></div>' +
            '<div class="comparison-vs"><span class="vs-badge">VS</span></div>' +
            '<div class="console-card" data-console-id="' + b.id + '"><div class="console-card-image"><img src="' + resolveImg(b.imagine) + '" alt="' + b.nume + '"></div>' +
            '<div class="console-card-info"><h3>' + b.nume + '</h3><div class="console-meta-tags"><span class="meta-tag">' + b.producator + '</span><span class="meta-tag">' + b.lansare + '</span><span class="meta-tag">Gen ' + b.generatie + '</span></div></div></div>' +
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
