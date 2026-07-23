import { MODELS } from '../data/console-models.js';
import { I18nModule } from '../modules/i18n.js';
import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

function findModel() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (!code) return null;
    return MODELS.find(m => m.code === code) || null;
}

// Which directory the visitor arrived from (?from=care|modding) so the
// "back to directory" links return them to the guide they came from
// instead of always defaulting to console-care.html.
function backLink() {
    const from = new URLSearchParams(location.search).get('from');
    return from === 'modding' ? 'console-modding.html#identify' : 'console-care.html#identify';
}

function applyBackLinks() {
    // #model-back-link carries data-i18n directly, so i18n only replaces its
    // text content — setting .href here is safe regardless of translation timing.
    const back = document.getElementById('model-back-link');
    if (back) back.href = backLink();
}

// #model-notfound-link sits INSIDE a data-i18n'd parent whose whole innerHTML
// (including a fresh <a>) gets replaced by every translation pass, so any
// .href set directly on it can be clobbered by a later i18n run. Click
// delegation on document sidesteps that: it works no matter how many times
// the node underneath gets recreated.
document.addEventListener('click', (e) => {
    if (e.target.closest?.('#model-notfound-link')) {
        e.preventDefault();
        location.href = backLink();
    }
});

async function api(method, path, body) {
    const token = localStorage.getItem('cn_token');
    const opts = { method, credentials: 'include', headers: {} };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(API_BASE_URL + path, opts);
    return res.json();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function isAdmin() {
    return AuthModule.getCurrentUser()?.role === 'admin';
}

let currentModel = null;

// ── One tutorial section (either the disassembly tutorial or the modding
// guide) — same read view + admin editor behaviour, different DOM ids,
// different field names on the shared console_tutorials row, and a
// different API path segment. ─────────────────────────────────────────

function createTutorialSection({ idPrefix, apiPath, titleField, introField, stepsField }) {
    let data = null; // { [titleField]: ..., [introField]: ..., [stepsField]: [...] }

    function el(suffix) {
        return document.getElementById(`${idPrefix}-${suffix}`);
    }

    function renderView() {
        const comingSoon = el('coming-soon');
        const content = el('content');
        if (!data || (!data[titleField] && !data[introField] && !data[stepsField]?.length)) {
            comingSoon.style.display = '';
            content.style.display = 'none';
            content.innerHTML = '';
            return;
        }
        comingSoon.style.display = 'none';
        content.style.display = '';

        const stepsHtml = (data[stepsField] || []).map((s, i) => `
            <div class="tutorial-step">
                <div class="tutorial-step__num">${i + 1}</div>
                <div class="tutorial-step__body">
                    ${s.heading ? `<h3 class="tutorial-step__heading">${escapeHtml(s.heading)}</h3>` : ''}
                    ${s.image_url ? `<img class="tutorial-step__image" src="${escapeHtml(s.image_url)}" alt="${escapeHtml(s.heading || '')}" loading="lazy">` : ''}
                    ${s.description ? `<p class="tutorial-step__desc">${escapeHtml(s.description)}</p>` : ''}
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            ${data[titleField] ? `<h2 class="tutorial-title">${escapeHtml(data[titleField])}</h2>` : ''}
            ${data[introField] ? `<p class="tutorial-intro">${escapeHtml(data[introField])}</p>` : ''}
            <div class="tutorial-steps">${stepsHtml}</div>
        `;
    }

    function stepEditorRow(step) {
        const row = document.createElement('div');
        row.className = 'tutorial-editor__step';
        row.innerHTML = `
            <input type="text" class="tutorial-editor__step-heading" placeholder="${I18nModule.t('tutorial_step_heading_placeholder')}" value="${escapeHtml(step?.heading || '')}">
            <textarea class="tutorial-editor__step-desc" rows="3" placeholder="${I18nModule.t('tutorial_step_desc_placeholder')}">${escapeHtml(step?.description || '')}</textarea>
            <div class="tutorial-editor__step-photo">
                <img class="tutorial-editor__step-preview" src="${escapeHtml(step?.image_url || '')}" style="${step?.image_url ? '' : 'display:none;'}">
                <input type="hidden" class="tutorial-editor__step-image-url" value="${escapeHtml(step?.image_url || '')}">
                <label class="hero-button hero-button--syllabus tutorial-editor__upload-btn">
                    <span data-i18n="tutorial_upload_photo">Upload photo</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="display:none;">
                </label>
                <span class="tutorial-editor__upload-status"></span>
            </div>
            <button type="button" class="tutorial-editor__step-remove" data-i18n="tutorial_remove_step">Remove step</button>
        `;

        const fileInput = row.querySelector('input[type="file"]');
        const statusEl = row.querySelector('.tutorial-editor__upload-status');
        const preview = row.querySelector('.tutorial-editor__step-preview');
        const urlField = row.querySelector('.tutorial-editor__step-image-url');

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            statusEl.textContent = I18nModule.t('tutorial_uploading');
            try {
                const presign = await api('POST', '/uploads/presign', {
                    kind: 'tutorial',
                    contentType: file.type,
                    fileSize: file.size,
                });
                if (!presign.success) throw new Error(presign.error || 'Presign failed');
                const putRes = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
                if (!putRes.ok) throw new Error('Upload failed');
                urlField.value = presign.publicUrl;
                preview.src = presign.publicUrl;
                preview.style.display = '';
                statusEl.textContent = '';
            } catch (err) {
                statusEl.textContent = err.message || I18nModule.t('tutorial_upload_error');
            }
        });

        row.querySelector('.tutorial-editor__step-remove').addEventListener('click', () => row.remove());

        return row;
    }

    function openEditor() {
        el('view-wrap').style.display = 'none';
        const editor = el('editor');
        editor.style.display = '';
        editor.innerHTML = `
            <input type="text" id="${idPrefix}-editor-title" placeholder="${I18nModule.t('tutorial_title_placeholder')}" value="${escapeHtml(data?.[titleField] || '')}">
            <textarea id="${idPrefix}-editor-intro" rows="3" placeholder="${I18nModule.t('tutorial_intro_placeholder')}">${escapeHtml(data?.[introField] || '')}</textarea>
            <div id="${idPrefix}-editor-steps"></div>
            <button type="button" id="${idPrefix}-add-step" class="care-back-link" data-i18n="tutorial_add_step">+ Add step</button>
            <div class="tutorial-editor__actions">
                <button type="button" id="${idPrefix}-save" class="hero-button" data-i18n="tutorial_save">Save</button>
                <button type="button" id="${idPrefix}-cancel" class="hero-button hero-button--syllabus" data-i18n="tutorial_cancel">Cancel</button>
                ${data ? `<button type="button" id="${idPrefix}-delete" class="hero-button hero-button--syllabus" data-i18n="tutorial_delete">Delete tutorial</button>` : ''}
            </div>
            <p id="${idPrefix}-save-status"></p>
        `;

        const stepsWrap = el('editor-steps');
        (data?.[stepsField]?.length ? data[stepsField] : [{}]).forEach(s => stepsWrap.appendChild(stepEditorRow(s)));

        el('add-step').addEventListener('click', () => stepsWrap.appendChild(stepEditorRow()));
        el('cancel').addEventListener('click', closeEditor);
        el('save').addEventListener('click', save);
        el('delete')?.addEventListener('click', del);
    }

    function closeEditor() {
        el('editor').style.display = 'none';
        el('editor').innerHTML = '';
        el('view-wrap').style.display = '';
    }

    async function save() {
        const statusEl = el('save-status');
        const title = document.getElementById(`${idPrefix}-editor-title`).value.trim();
        const intro = document.getElementById(`${idPrefix}-editor-intro`).value.trim();
        const steps = Array.from(document.querySelectorAll(`#${idPrefix}-editor-steps .tutorial-editor__step`)).map(row => ({
            heading: row.querySelector('.tutorial-editor__step-heading').value.trim(),
            description: row.querySelector('.tutorial-editor__step-desc').value.trim(),
            image_url: row.querySelector('.tutorial-editor__step-image-url').value.trim(),
        }));

        statusEl.textContent = I18nModule.t('tutorial_saving');
        const result = await api('PUT', `/console-tutorials/${encodeURIComponent(currentModel.code)}${apiPath}`, { title, intro, steps });
        if (!result.success) {
            statusEl.textContent = result.error || I18nModule.t('tutorial_save_error');
            return;
        }
        applyRow(result.tutorial);
        closeEditor();
        renderView();
        renderAdminControls();
    }

    async function del() {
        if (!confirm(I18nModule.t('tutorial_delete_confirm'))) return;
        await api('DELETE', `/console-tutorials/${encodeURIComponent(currentModel.code)}${apiPath}`);
        data = null;
        closeEditor();
        renderView();
        renderAdminControls();
    }

    function renderAdminControls() {
        const wrap = el('admin-controls');
        if (!wrap) return;
        if (!isAdmin()) { wrap.innerHTML = ''; return; }
        wrap.innerHTML = `<button type="button" id="${idPrefix}-write-btn" class="hero-button hero-button--syllabus">${data ? I18nModule.t('tutorial_edit_btn') : I18nModule.t('tutorial_write_btn')}</button>`;
        el('write-btn').addEventListener('click', openEditor);
    }

    // Reads the relevant fields off the full console_tutorials row (which
    // carries both tutorial kinds) and stores them under generic keys so
    // renderView()/openEditor() don't need to know the real column names.
    function applyRow(row) {
        if (!row || (!row[titleField] && !row[introField] && !row[stepsField]?.length)) {
            data = null;
            return;
        }
        data = { [titleField]: row[titleField], [introField]: row[introField], [stepsField]: row[stepsField] };
    }

    return { applyRow, renderView, renderAdminControls };
}

const disassembly = createTutorialSection({
    idPrefix: 'tutorial',
    apiPath: '',
    titleField: 'title',
    introField: 'intro',
    stepsField: 'steps',
});

const modding = createTutorialSection({
    idPrefix: 'mod',
    apiPath: '/mod',
    titleField: 'mod_title',
    introField: 'mod_intro',
    stepsField: 'mod_steps',
});

// ── Boot ─────────────────────────────────────────────────

async function render() {
    currentModel = findModel();
    applyBackLinks();
    const root = document.getElementById('model-detail-root');
    const notFound = document.getElementById('model-detail-notfound');
    if (!currentModel) {
        if (root) root.style.display = 'none';
        if (notFound) notFound.style.display = 'block';
        return;
    }

    document.title = `${currentModel.code} (${currentModel.console}) — Console Notebook`;
    const desc = `${currentModel.console} model ${currentModel.code}. ${currentModel.note || ''}`;
    const descTag = document.querySelector('meta[name="description"]');
    if (descTag) descTag.setAttribute('content', desc);

    document.getElementById('model-plate-label').textContent = I18nModule.t('care_plate_label');
    document.getElementById('model-plate-code').textContent = currentModel.code;
    document.getElementById('model-plate-console').textContent = currentModel.console;
    document.getElementById('model-mfr').textContent = currentModel.mfr;
    document.getElementById('model-console-name').textContent = currentModel.console;
    document.getElementById('model-note').textContent = currentModel.note || '';

    let row = null;
    try {
        const result = await api('GET', `/console-tutorials/${encodeURIComponent(currentModel.code)}`);
        row = result.success ? result.tutorial : null;
    } catch {
        row = null;
    }
    disassembly.applyRow(row);
    modding.applyRow(row);
    disassembly.renderView();
    disassembly.renderAdminControls();
    modding.renderView();
    modding.renderAdminControls();
}

render();
window.addEventListener('cn:language-changed', render);
