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

let currentModel = null;
let currentTutorial = null;

function isAdmin() {
    return AuthModule.getCurrentUser()?.role === 'admin';
}

// ── Read-only view ──────────────────────────────────────

function renderTutorialView() {
    const comingSoon = document.getElementById('tutorial-coming-soon');
    const content = document.getElementById('tutorial-content');
    if (!currentTutorial || (!currentTutorial.title && !currentTutorial.intro && !currentTutorial.steps?.length)) {
        comingSoon.style.display = '';
        content.style.display = 'none';
        content.innerHTML = '';
        return;
    }
    comingSoon.style.display = 'none';
    content.style.display = '';

    const stepsHtml = (currentTutorial.steps || []).map((s, i) => `
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
        ${currentTutorial.title ? `<h2 class="tutorial-title">${escapeHtml(currentTutorial.title)}</h2>` : ''}
        ${currentTutorial.intro ? `<p class="tutorial-intro">${escapeHtml(currentTutorial.intro)}</p>` : ''}
        <div class="tutorial-steps">${stepsHtml}</div>
    `;
}

// ── Admin editor ─────────────────────────────────────────

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
    document.getElementById('tutorial-view-wrap').style.display = 'none';
    const editor = document.getElementById('tutorial-editor');
    editor.style.display = '';
    editor.innerHTML = `
        <input type="text" id="tutorial-editor-title" placeholder="${I18nModule.t('tutorial_title_placeholder')}" value="${escapeHtml(currentTutorial?.title || '')}">
        <textarea id="tutorial-editor-intro" rows="3" placeholder="${I18nModule.t('tutorial_intro_placeholder')}">${escapeHtml(currentTutorial?.intro || '')}</textarea>
        <div id="tutorial-editor-steps"></div>
        <button type="button" id="tutorial-add-step" class="care-back-link" data-i18n="tutorial_add_step">+ Add step</button>
        <div class="tutorial-editor__actions">
            <button type="button" id="tutorial-save" class="hero-button" data-i18n="tutorial_save">Save</button>
            <button type="button" id="tutorial-cancel" class="hero-button hero-button--syllabus" data-i18n="tutorial_cancel">Cancel</button>
            ${currentTutorial ? `<button type="button" id="tutorial-delete" class="hero-button hero-button--syllabus" data-i18n="tutorial_delete">Delete tutorial</button>` : ''}
        </div>
        <p id="tutorial-save-status"></p>
    `;

    const stepsWrap = document.getElementById('tutorial-editor-steps');
    (currentTutorial?.steps?.length ? currentTutorial.steps : [{}]).forEach(s => stepsWrap.appendChild(stepEditorRow(s)));

    document.getElementById('tutorial-add-step').addEventListener('click', () => stepsWrap.appendChild(stepEditorRow()));
    document.getElementById('tutorial-cancel').addEventListener('click', closeEditor);
    document.getElementById('tutorial-save').addEventListener('click', saveTutorial);
    document.getElementById('tutorial-delete')?.addEventListener('click', deleteTutorial);
}

function closeEditor() {
    document.getElementById('tutorial-editor').style.display = 'none';
    document.getElementById('tutorial-editor').innerHTML = '';
    document.getElementById('tutorial-view-wrap').style.display = '';
}

async function saveTutorial() {
    const statusEl = document.getElementById('tutorial-save-status');
    const title = document.getElementById('tutorial-editor-title').value.trim();
    const intro = document.getElementById('tutorial-editor-intro').value.trim();
    const steps = Array.from(document.querySelectorAll('#tutorial-editor-steps .tutorial-editor__step')).map(row => ({
        heading: row.querySelector('.tutorial-editor__step-heading').value.trim(),
        description: row.querySelector('.tutorial-editor__step-desc').value.trim(),
        image_url: row.querySelector('.tutorial-editor__step-image-url').value.trim(),
    }));

    statusEl.textContent = I18nModule.t('tutorial_saving');
    const result = await api('PUT', `/console-tutorials/${encodeURIComponent(currentModel.code)}`, { title, intro, steps });
    if (!result.success) {
        statusEl.textContent = result.error || I18nModule.t('tutorial_save_error');
        return;
    }
    currentTutorial = result.tutorial;
    closeEditor();
    renderTutorialView();
    renderAdminControls();
}

async function deleteTutorial() {
    if (!confirm(I18nModule.t('tutorial_delete_confirm'))) return;
    await api('DELETE', `/console-tutorials/${encodeURIComponent(currentModel.code)}`);
    currentTutorial = null;
    closeEditor();
    renderTutorialView();
    renderAdminControls();
}

function renderAdminControls() {
    const wrap = document.getElementById('tutorial-admin-controls');
    if (!wrap) return;
    if (!isAdmin()) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<button type="button" id="tutorial-write-btn" class="hero-button hero-button--syllabus">${currentTutorial ? I18nModule.t('tutorial_edit_btn') : I18nModule.t('tutorial_write_btn')}</button>`;
    document.getElementById('tutorial-write-btn').addEventListener('click', openEditor);
}

// ── Boot ─────────────────────────────────────────────────

async function render() {
    currentModel = findModel();
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

    try {
        const result = await api('GET', `/console-tutorials/${encodeURIComponent(currentModel.code)}`);
        currentTutorial = result.success ? result.tutorial : null;
    } catch {
        currentTutorial = null;
    }
    renderTutorialView();
    renderAdminControls();
}

render();
window.addEventListener('cn:language-changed', render);
