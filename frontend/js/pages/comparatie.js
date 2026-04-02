/**
 * Comparatie — ES Module
 * Loads console data from the API (language-aware) and renders the comparison UI.
 * Navigation / hamburger is handled by NavigationModule (main.js).
 */

import { loadConsoles } from '../data/data-loader.js';
import { I18nModule }   from '../modules/i18n.js';

const selectA = document.getElementById('console-a-select');
const selectB = document.getElementById('console-b-select');
const display = document.getElementById('comparison-display');

if (!selectA || !selectB || !display) throw new Error('Comparatie: required elements not found');

let consolesData = null;

// ── Generation label ──────────────────────────────────────────────────────────
const GEN_YEARS = { 9:'2020–Prezent', 8:'2012–2020', 7:'2005–2013', 6:'1998–2006', 5:'1994–2001', 4:'1987–1996', 3:'1985–1990', 2:'1980–1984', 1:'1972–1980' };

function genLabel(gen) {
    const prefix = I18nModule.t('console_generation_prefix');
    return prefix + ' ' + gen + (GEN_YEARS[gen] ? ' (' + GEN_YEARS[gen] + ')' : '');
}

// ── Spec sections (field labels are universal technical terms) ─────────────────
function buildSpecSections() {
    return [
        { key: 'cpu',        labelKey: 'spec_cpu_title',     fields: [
            { key: 'architecture', label: 'Architecture' },
            { key: 'proces_nm',    label: 'Process (nm)' },
            { key: 'cores',        label: 'Cores/Threads' },
            { key: 'frequency',    label: 'Clock Speed' },
            { key: 'tdp',          label: 'TDP' }
        ]},
        { key: 'gpu',        labelKey: 'spec_gpu_title',     fields: [
            { key: 'architecture', label: 'Architecture' },
            { key: 'units',        label: 'Units/CUs' },
            { key: 'frequency',    label: 'Clock Speed' },
            { key: 'tflops',       label: 'TFLOPS' },
            { key: 'capabilities', label: 'Capabilities' }
        ]},
        { key: 'memory',     labelKey: 'spec_memory_title',  fields: [
            { key: 'type',      label: 'Type' },
            { key: 'capacity',  label: 'Capacity' },
            { key: 'bus',       label: 'Bus' },
            { key: 'bandwidth', label: 'Bandwidth' }
        ]},
        { key: 'storage',    labelKey: 'spec_storage_title', fields: [
            { key: 'type',      label: 'Type' },
            { key: 'interface', label: 'Interface' },
            { key: 'speed',     label: 'Speed' }
        ]},
        { key: 'output_video', labelKey: 'spec_output_title', fields: [
            { key: 'resolution', label: 'Resolution' },
            { key: 'refresh',    label: 'Refresh' },
            { key: 'hdr',        label: 'HDR' },
            { key: 'upscaling',  label: 'Upscaling' }
        ]},
        { key: 'technologies', labelKey: 'spec_tech_title', fields: [
            { key: 'ray_tracing',           label: 'Ray Tracing' },
            { key: 'vrr',                   label: 'VRR' },
            { key: 'backwards_compatibility', label: 'Backwards Compat' },
            { key: 'other',                 label: 'Other' }
        ]}
    ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatValue(val) {
    if (val === true)  return '<span class="flag yes"></span>';
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

// ── Populate select dropdowns ─────────────────────────────────────────────────
function populateSelects() {
    const gens = {};
    consolesData.forEach(c => {
        const g = c.generation;
        if (!gens[g]) gens[g] = [];
        gens[g].push(c);
    });

    [selectA, selectB].forEach(sel => {
        sel.innerHTML = '';
        Object.keys(gens).sort((a, b) => b - a).forEach(gen => {
            const og = document.createElement('optgroup');
            og.label = genLabel(gen);
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

// ── Render comparison ─────────────────────────────────────────────────────────
function update() {
    const a = consolesData.find(c => c.id === selectA.value);
    const b = consolesData.find(c => c.id === selectB.value);
    if (!a || !b) return;

    const specSections = buildSpecSections();

    const specsHtml = specSections.map(section => {
        const rows = section.fields.map(field => {
            const vA = getVal(a, section.key, field.key);
            const vB = getVal(b, section.key, field.key);
            if (vA === null && vB === null) return '';
            return '<div class="spec-row">' +
                '<div class="spec-value spec-left">'  + formatValue(vA) + '</div>' +
                '<div class="spec-label">'            + field.label     + '</div>' +
                '<div class="spec-value spec-right">' + formatValue(vB) + '</div>' +
                '</div>';
        }).filter(r => r.length > 0).join('');
        return rows
            ? '<div class="spec-section"><div class="spec-section-header">' + I18nModule.t(section.labelKey) + '</div>' + rows + '</div>'
            : '';
    }).filter(s => s.length > 0).join('');

    const prosTitle  = I18nModule.t('console_pros_title');
    const consTitle  = I18nModule.t('console_cons_title');

    const prosA = (a.advantages    || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
    const consA = (a.disadvantages || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');
    const prosB = (b.advantages    || []).map(p => '<li class="pro-item"> ' + p + '</li>').join('');
    const consB = (b.disadvantages || []).map(c => '<li class="con-item"> ' + c + '</li>').join('');

    const specsSection = specsHtml
        ? '<div class="specs-comparison"><h3 class="specs-title">' + I18nModule.t('console_specs_title') + '</h3><div class="spec-sheet">' + specsHtml + '</div></div>'
        : '';

    const verdictSection = (prosA || consA || prosB || consB)
        ? '<div class="verdict-section"><h3 class="verdict-title">' + I18nModule.t('console_verdict_title') + '</h3><div class="verdict-grid">' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + a.name + '</h4><div class="verdict-lists">' +
                (prosA ? '<div class="pros-list"><h5 class="list-title pros-title">' + prosTitle + '</h5><ul>' + prosA + '</ul></div>' : '') +
                (consA ? '<div class="cons-list"><h5 class="list-title cons-title">' + consTitle + '</h5><ul>' + consA + '</ul></div>' : '') +
            '</div></div>' +
            '<div class="verdict-card"><h4 class="verdict-console-name">' + b.name + '</h4><div class="verdict-lists">' +
                (prosB ? '<div class="pros-list"><h5 class="list-title pros-title">' + prosTitle + '</h5><ul>' + prosB + '</ul></div>' : '') +
                (consB ? '<div class="cons-list"><h5 class="list-title cons-title">' + consTitle + '</h5><ul>' + consB + '</ul></div>' : '') +
            '</div></div></div></div>'
        : '';

    display.innerHTML =
        '<div class="comparison-grid">' +
        '<div class="console-card" data-console-id="' + a.id + '"><div class="console-card-image"><img src="' + resolveImg(a.image) + '" alt="' + a.name + '"></div>' +
        '<div class="console-card-info"><h3>' + a.name + '</h3><div class="console-meta-tags"><span class="meta-tag">' + a.manufacturer + '</span><span class="meta-tag">' + a.release + '</span><span class="meta-tag">Gen ' + a.generation + '</span></div></div></div>' +
        '<div class="comparison-vs"><span class="vs-badge">VS</span></div>' +
        '<div class="console-card" data-console-id="' + b.id + '"><div class="console-card-image"><img src="' + resolveImg(b.image) + '" alt="' + b.name + '"></div>' +
        '<div class="console-card-info"><h3>' + b.name + '</h3><div class="console-meta-tags"><span class="meta-tag">' + b.manufacturer + '</span><span class="meta-tag">' + b.release + '</span><span class="meta-tag">Gen ' + b.generation + '</span></div></div></div>' +
        '</div>' + specsSection + verdictSection;

    display.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', () => img.classList.add('image-hidden'));
    });

    document.querySelectorAll('.console-card[data-console-id]').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function () {
            window.location.href = './consoles/' + this.getAttribute('data-console-id') + '.html';
        });
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    const data = await loadConsoles();
    if (!data || data.length === 0) {
        display.innerHTML = '<p class="comparison-error">' + I18nModule.t('compare_hero_subtitle') + '</p>';
        return;
    }
    consolesData = data;
    populateSelects();
    selectA.value = 'playstation-5';
    selectB.value = 'xbox-series-x';
    selectA.addEventListener('change', update);
    selectB.addEventListener('change', update);
    update();
}

init();

// Language change: data-loader cache is already cleared by data-loader's own listener.
// We just reload and re-render.
window.addEventListener('cn:language-changed', async () => {
    const prevA = selectA.value;
    const prevB = selectB.value;
    const data = await loadConsoles();
    if (!data || data.length === 0) return;
    consolesData = data;
    populateSelects();
    selectA.value = prevA;
    selectB.value = prevB;
    update();
});
