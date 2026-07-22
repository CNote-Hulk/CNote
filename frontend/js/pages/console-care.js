// Console Care page: renders + filters the "Identify Your Model" hardware directory.
// MODELS data lives in ../data/console-models.js (shared with console-model.js).

import { I18nModule } from '../modules/i18n.js';
import { MODELS } from '../data/console-models.js';

const grid = document.getElementById('care-directory-grid');
const searchInput = document.getElementById('care-directory-search');
const tabs = document.querySelectorAll('.care-tab');
const countEl = document.getElementById('care-directory-count');
const emptyEl = document.getElementById('care-directory-empty');

let activeManufacturer = 'all';

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function render() {
    const query = (searchInput?.value || '').trim().toLowerCase();

    const filtered = MODELS.filter(m => {
        if (activeManufacturer !== 'all' && m.mfr !== activeManufacturer) return false;
        if (!query) return true;
        return (
            m.code.toLowerCase().includes(query) ||
            m.console.toLowerCase().includes(query) ||
            (m.note || '').toLowerCase().includes(query)
        );
    });

    if (countEl) countEl.textContent = String(filtered.length);
    if (emptyEl) emptyEl.classList.toggle('is-visible', filtered.length === 0);
    if (!grid) return;

    const groups = new Map();
    filtered.forEach(m => {
        if (!groups.has(m.console)) groups.set(m.console, []);
        groups.get(m.console).push(m);
    });

    grid.innerHTML = '';
    groups.forEach((models, consoleName) => {
        const group = document.createElement('div');
        group.className = 'care-group';

        const title = document.createElement('h3');
        title.className = 'care-group__title';
        title.textContent = consoleName;
        group.appendChild(title);

        const gridEl = document.createElement('div');
        gridEl.className = 'care-group__grid';

        models.forEach(m => {
            const plate = document.createElement('a');
            plate.className = 'model-plate model-plate--link';
            plate.href = `console-model.html?code=${encodeURIComponent(m.code)}`;
            plate.innerHTML = `
                <span class="model-plate__label">${escapeHtml(I18nModule.t('care_plate_label'))}</span>
                <span class="model-plate__code">${escapeHtml(m.code)}</span>
                <div class="model-plate__meta"><span class="model-plate__console">${escapeHtml(m.console)}</span>${m.note ? ' — ' + escapeHtml(m.note) : ''}</div>
            `;
            gridEl.appendChild(plate);
        });

        group.appendChild(gridEl);
        grid.appendChild(group);
    });
}

searchInput?.addEventListener('input', render);

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        activeManufacturer = tab.dataset.mfr;
        render();
    });
});

render();
window.addEventListener('cn:language-changed', render);
