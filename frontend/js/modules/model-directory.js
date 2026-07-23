// Shared "Identify Your Model" hardware directory component.
// Renders MODELS (../data/console-models.js) as searchable/filterable clickable
// model-plate cards linking to console-model.html?code=. Used by both
// console-care.js and console-modding.js so the two guide pages share one
// directory implementation instead of duplicating it.

import { I18nModule } from './i18n.js';
import { MODELS } from '../data/console-models.js';

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function initModelDirectory({
    gridId = 'care-directory-grid',
    searchId = 'care-directory-search',
    tabsSelector = '.care-tab',
    countId = 'care-directory-count',
    emptyId = 'care-directory-empty',
    plateLabelKey = 'care_plate_label',
    fromParam = 'care',
} = {}) {
    const grid = document.getElementById(gridId);
    const searchInput = document.getElementById(searchId);
    const tabs = document.querySelectorAll(tabsSelector);
    const countEl = document.getElementById(countId);
    const emptyEl = document.getElementById(emptyId);

    let activeManufacturer = 'all';

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
                plate.href = `console-model.html?code=${encodeURIComponent(m.code)}&from=${fromParam}`;
                plate.innerHTML = `
                    <span class="model-plate__label">${escapeHtml(I18nModule.t(plateLabelKey))}</span>
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

    return { render };
}
