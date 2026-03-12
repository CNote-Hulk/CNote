/**
 * Comparatie.js - Dynamic Console Comparison
 * Loads all data from consoles.json via data-loader
 */

import { loadConsoles, resolveImagePath } from '../data/data-loader.js';

// DOM Elements
const selectA = document.getElementById('console-a-select');
const selectB = document.getElementById('console-b-select');
const comparisonContainer = document.getElementById('comparison-display');

// Cached consoles array
let allConsoles = [];

/**
 * Initialize comparison page
 */
async function init() {
    if (!selectA || !selectB || !comparisonContainer) {
        console.warn('Comparison elements not found');
        return;
    }

    allConsoles = await loadConsoles();
    if (!allConsoles || allConsoles.length === 0) {
        console.warn('No console data loaded');
        return;
    }

    populateSelects();

    selectA.addEventListener('change', updateComparison);
    selectB.addEventListener('change', updateComparison);

    // Set default selections
    selectA.value = 'playstation-5';
    selectB.value = 'xbox-series-x';

    updateComparison();
}

/**
 * Generation labels for optgroup display
 */
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

/**
 * Populate select dropdowns grouped by generation
 */
function populateSelects() {
    const generations = {};
    allConsoles.forEach(c => {
        const gen = c.generatie;
        if (!generations[gen]) generations[gen] = [];
        generations[gen].push(c);
    });

    [selectA, selectB].forEach(select => {
        select.innerHTML = '';

        Object.keys(generations)
            .sort((a, b) => b - a)
            .forEach(gen => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = GEN_LABELS[gen] || `Generatia ${gen}`;

                generations[gen]
                    .sort((a, b) => b.lansare - a.lansare)
                    .forEach(consola => {
                        const option = document.createElement('option');
                        option.value = consola.id;
                        option.textContent = `${consola.nume} (${consola.lansare})`;
                        optgroup.appendChild(option);
                    });

                select.appendChild(optgroup);
            });
    });
}

/**
 * Spec comparison sections definition
 */
const SPEC_SECTIONS = [
    {
        key: 'cpu',
        label: 'CPU',
        fields: [
            { key: 'arhitectura', label: 'Arhitectura' },
            { key: 'proces_nm', label: 'Proces (nm)' },
            { key: 'nuclee', label: 'Nuclee/Fire' },
            { key: 'frecventa', label: 'Frecventa' },
            { key: 'tdp', label: 'TDP' }
        ]
    },
    {
        key: 'gpu',
        label: 'GPU',
        fields: [
            { key: 'arhitectura', label: 'Arhitectura' },
            { key: 'unitati', label: 'Unitati/CUs' },
            { key: 'frecventa', label: 'Frecventa' },
            { key: 'tflops', label: 'TFLOPS' },
            { key: 'capabilitati', label: 'Capabilitati' }
        ]
    },
    {
        key: 'memorie',
        label: 'Memorie',
        fields: [
            { key: 'tip', label: 'Tip' },
            { key: 'capacitate', label: 'Capacitate' },
            { key: 'magistrala', label: 'Magistrala' },
            { key: 'bandwidth', label: 'Bandwidth' }
        ]
    },
    {
        key: 'stocare',
        label: 'Stocare',
        fields: [
            { key: 'tip', label: 'Tip' },
            { key: 'interfata', label: 'Interfata' },
            { key: 'viteza', label: 'Viteza' }
        ]
    },
    {
        key: 'output_video',
        label: 'Output Video',
        fields: [
            { key: 'rezolutie', label: 'Rezolutie' },
            { key: 'refresh', label: 'Refresh' },
            { key: 'hdr', label: 'HDR' },
            { key: 'upscaling', label: 'Upscaling' }
        ]
    },
    {
        key: 'tehnologii',
        label: 'Tehnologii',
        fields: [
            { key: 'ray_tracing', label: 'Ray Tracing' },
            { key: 'vrr', label: 'VRR' },
            { key: 'backwards_compatibility', label: 'Backwards Compat' },
            { key: 'altele', label: 'Altele' }
        ]
    }
];

/**
 * Format a spec value for display
 */
function formatValue(val) {
    if (val === true) return '<span class="flag yes"></span>';
    if (val === false) return '<span class="flag no"></span>';
    return val && String(val).trim().length && val !== 'N/A' ? val : 'N/A';
}

/**
 * Get a nested spec value safely
 */
function getVal(consola, sectionKey, fieldKey) {
    return consola && consola[sectionKey] && consola[sectionKey][fieldKey] !== undefined
        ? consola[sectionKey][fieldKey]
        : null;
}

/**
 * Update the comparison display
 */
function updateComparison() {
    const a = allConsoles.find(c => c.id === selectA.value);
    const b = allConsoles.find(c => c.id === selectB.value);
    if (!a || !b) return;

    const specsHtml = SPEC_SECTIONS.map(section => {
        const rows = section.fields.map(field => {
            const vA = getVal(a, section.key, field.key);
            const vB = getVal(b, section.key, field.key);
            if (vA === null && vB === null) return '';
            return `
                <div class="spec-row">
                    <div class="spec-value spec-left">${formatValue(vA)}</div>
                    <div class="spec-label">${field.label}</div>
                    <div class="spec-value spec-right">${formatValue(vB)}</div>
                </div>
            `;
        }).filter(r => r.length > 0).join('');

        return rows ? `
            <div class="spec-section">
                <div class="spec-section-header">${section.label}</div>
                ${rows}
            </div>
        ` : '';
    }).filter(s => s.length > 0).join('');

    const prosA = (a.avantaje || []).map(p => `<li class="pro-item"> ${p}</li>`).join('');
    const consA = (a.dezavantaje || []).map(c => `<li class="con-item"> ${c}</li>`).join('');
    const prosB = (b.avantaje || []).map(p => `<li class="pro-item"> ${p}</li>`).join('');
    const consB = (b.dezavantaje || []).map(c => `<li class="con-item"> ${c}</li>`).join('');

    const specsSection = specsHtml ? `
        <div class="specs-comparison">
            <h3 class="specs-title">Fisa Tehnica</h3>
            <div class="spec-sheet">${specsHtml}</div>
        </div>
    ` : '';

    const verdictSection = (prosA || consA || prosB || consB) ? `
        <div class="verdict-section">
            <h3 class="verdict-title">Overview Rapid</h3>
            <div class="verdict-grid">
                <div class="verdict-card">
                    <h4 class="verdict-console-name">${a.nume}</h4>
                    <div class="verdict-lists">
                        ${prosA ? '<div class="pros-list"><h5 class="list-title pros-title">Avantaje</h5><ul>' + prosA + '</ul></div>' : ''}
                        ${consA ? '<div class="cons-list"><h5 class="list-title cons-title">Dezavantaje</h5><ul>' + consA + '</ul></div>' : ''}
                    </div>
                </div>
                <div class="verdict-card">
                    <h4 class="verdict-console-name">${b.nume}</h4>
                    <div class="verdict-lists">
                        ${prosB ? '<div class="pros-list"><h5 class="list-title pros-title">Avantaje</h5><ul>' + prosB + '</ul></div>' : ''}
                        ${consB ? '<div class="cons-list"><h5 class="list-title cons-title">Dezavantaje</h5><ul>' + consB + '</ul></div>' : ''}
                    </div>
                </div>
            </div>
        </div>
    ` : '';

    comparisonContainer.innerHTML = `
        <div class="comparison-grid">
            <div class="console-card" data-console-id="${a.id}">
                <div class="console-card-image">
                    <img src="${resolveImagePath(a.imagine)}" alt="${a.nume}">
                </div>
                <div class="console-card-info">
                    <h3>${a.nume}</h3>
                    <div class="console-meta-tags">
                        <span class="meta-tag">${a.producator}</span>
                        <span class="meta-tag">${a.lansare}</span>
                        <span class="meta-tag">Gen ${a.generatie}</span>
                    </div>
                </div>
            </div>
            <div class="comparison-vs">
                <span class="vs-badge">VS</span>
            </div>
            <div class="console-card" data-console-id="${b.id}">
                <div class="console-card-image">
                    <img src="${resolveImagePath(b.imagine)}" alt="${b.nume}">
                </div>
                <div class="console-card-info">
                    <h3>${b.nume}</h3>
                    <div class="console-meta-tags">
                        <span class="meta-tag">${b.producator}</span>
                        <span class="meta-tag">${b.lansare}</span>
                        <span class="meta-tag">Gen ${b.generatie}</span>
                    </div>
                </div>
            </div>
        </div>
        ${specsSection}
        ${verdictSection}
    `;

    comparisonContainer.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => {
            img.classList.add('image-hidden');
        });
    });

    // Add click handlers to console cards
    document.querySelectorAll('.console-card[data-console-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function() {
            const consoleId = this.getAttribute('data-console-id');
            window.location.href = `./consoles/${consoleId}.html`;
        });
    });

    comparisonContainer.classList.add('fade-in');
    setTimeout(() => comparisonContainer.classList.remove('fade-in'), 300);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { init, updateComparison };
