/* ─────────────────────────────────────────────────────────────
   FILE: report-modal.js
   DESCRIPTION: DSA Article 16 — content report modal.
   Exposes window.openReportModal({ contentType, contentId, contentPreview }).
   Plain JS — no framework, no build step. Works on any page that
   loads this script and report-modal.css.
   ───────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // ── i18n helper (uses global I18nModule exposed by i18n.js init) ─────────
    const _t = key => (window.I18nModule ? window.I18nModule.t(key) : key);

    // ── Reason keys ──────────────────────────────────────────────────────────
    const REASON_KEYS = [
        'illegal_content', 'hate_speech', 'harassment',
        'spam', 'csam', 'misinformation', 'other',
    ];

    // ── Helpers ─────────────────────────────────────────────────────────────

    /** Get the auth token from localStorage (set by the auth module on login). */
    function getToken() {
        try {
            // Try JWT first
            const jwt = localStorage.getItem('cn_token');
            if (jwt) return jwt;
            // Fall back to session object stored as JSON
            const session = JSON.parse(localStorage.getItem('cn_session') || 'null');
            return session?.token || null;
        } catch { return null; }
    }

    /** Resolve the API base URL — mirrors config.js logic, no import needed. */
    function apiBase() {
        return (window.CN_API_BASE_URL || '/api').replace(/\/$/, '');
    }

    // ── Cleanup helper ───────────────────────────────────────────────────────

    function removeModal() {
        const existing = document.getElementById('report-modal-overlay');
        if (existing) existing.remove();
        document.removeEventListener('keydown', _onKey);
    }

    let _onKey = null; // stored so we can remove the listener

    // ── Main export ──────────────────────────────────────────────────────────

    /**
     * openReportModal
     * @param {object} opts
     * @param {string} opts.contentType   — one of 5 valid content_type values
     * @param {string} opts.contentId     — ID of the content being reported
     * @param {string} [opts.contentPreview] — short preview shown as subtitle
     */
    window.openReportModal = function ({ contentType, contentId, contentPreview } = {}) {
        // Remove any existing modal first (no stacking)
        removeModal();

        // ── Build overlay ────────────────────────────────────────────────────
        const overlay = document.createElement('div');
        overlay.id = 'report-modal-overlay';

        const previewText = contentPreview
            ? String(contentPreview).substring(0, 60) + (contentPreview.length > 60 ? '...' : '')
            : '';

        // SAFE: all user-visible strings are set via textContent/placeholder below.
        // Only static structural HTML is in this template.
        overlay.innerHTML = `
            <div id="report-modal-box" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
                <p class="report-modal__title" id="report-modal-title"></p>
                ${previewText ? `<p class="report-modal__preview" id="report-modal-preview"></p>` : ''}

                <div>
                    <label class="report-modal__label" for="report-reason"></label>
                    <select class="report-modal__select" id="report-reason">
                        <option value="" disabled selected></option>
                        ${REASON_KEYS.map(k => `<option value="${k}"></option>`).join('')}
                    </select>
                </div>

                <div>
                    <label class="report-modal__label" for="report-description"></label>
                    <textarea class="report-modal__textarea" id="report-description" maxlength="2000" rows="3"></textarea>
                    <div class="report-modal__char-counter" id="report-char-counter">0 / 2000</div>
                </div>

                <div>
                    <label class="report-modal__label" for="report-contact"></label>
                    <input class="report-modal__input" type="email" id="report-contact" maxlength="255">
                </div>

                <p class="report-modal__error" id="report-error" hidden></p>

                <div class="report-modal__actions">
                    <button class="report-modal__btn-submit" id="report-submit" type="button"></button>
                    <button class="report-modal__btn-cancel" id="report-cancel" type="button"></button>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        // ── Set all labels/buttons via textContent (XSS-safe) ────────────────
        document.getElementById('report-modal-title').textContent = _t('report_modal_title');

        const reasonLabel = overlay.querySelector('label[for="report-reason"]');
        if (reasonLabel) reasonLabel.textContent = _t('report_field_reason');

        const descLabel = overlay.querySelector('label[for="report-description"]');
        if (descLabel) descLabel.textContent = _t('report_field_description');

        const contactLabel = overlay.querySelector('label[for="report-contact"]');
        if (contactLabel) contactLabel.textContent = _t('report_field_email');

        document.getElementById('report-submit').textContent = _t('report_btn_submit');
        document.getElementById('report-cancel').textContent = _t('report_btn_cancel');

        // ── Set option text via textContent (XSS-safe) ───────────────────────
        const select = document.getElementById('report-reason');
        const placeholderOpt = select.querySelector('option[value=""]');
        if (placeholderOpt) placeholderOpt.textContent = _t('report_field_reason_placeholder');

        const options = select.querySelectorAll('option:not([value=""])');
        REASON_KEYS.forEach((k, i) => {
            if (options[i]) options[i].textContent = _t('report_reason_' + k);
        });

        // ── Set placeholder attributes ────────────────────────────────────────
        document.getElementById('report-description').placeholder = _t('report_field_description_placeholder');
        document.getElementById('report-contact').placeholder = 'email@exemplu.com';

        // ── Set preview text safely ───────────────────────────────────────────
        if (previewText) {
            const prev = document.getElementById('report-modal-preview');
            if (prev) prev.textContent = '"' + previewText + '"';
        }

        // ── Char counter ─────────────────────────────────────────────────────
        const textarea = document.getElementById('report-description');
        const counter  = document.getElementById('report-char-counter');
        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length + ' / 2000';
        });

        // ── Close handlers ───────────────────────────────────────────────────
        document.getElementById('report-cancel').addEventListener('click', removeModal);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) removeModal();
        });

        _onKey = (e) => { if (e.key === 'Escape') removeModal(); };
        document.addEventListener('keydown', _onKey);

        // ── Submit ───────────────────────────────────────────────────────────
        const submitBtn = document.getElementById('report-submit');
        const errorEl   = document.getElementById('report-error');

        submitBtn.addEventListener('click', async () => {
            const reason = select.value;
            const description = textarea.value.trim() || null;
            const contact = document.getElementById('report-contact').value.trim() || null;

            // Client-side validation
            if (!reason) {
                errorEl.textContent = _t('report_error_no_reason');
                errorEl.hidden = false;
                return;
            }

            // Loading state
            submitBtn.disabled = true;
            submitBtn.textContent = _t('report_btn_submitting');
            errorEl.hidden = true;

            try {
                const token = getToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;

                const resp = await fetch(apiBase() + '/reports', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        content_type: contentType,
                        content_id:   String(contentId),
                        reason,
                        description,
                        reporter_contact: contact,
                    }),
                });

                const data = await resp.json().catch(() => ({}));

                if (resp.ok && data.success) {
                    // Success state — replace form content
                    const box = document.getElementById('report-modal-box');
                    box.innerHTML = `
                        <div class="report-modal__success">
                            <span style="font-size:2rem">&#10003;</span>
                            <p id="report-success-text"></p>
                            <button class="report-modal__btn-cancel" id="report-close-success" type="button"></button>
                        </div>`;
                    document.getElementById('report-success-text').textContent = _t('report_success');
                    document.getElementById('report-close-success').textContent = _t('report_btn_close');
                    document.getElementById('report-close-success').addEventListener('click', removeModal);
                } else {
                    // Error — keep form open
                    errorEl.textContent = data.error || _t('report_error_generic');
                    errorEl.hidden = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = _t('report_btn_submit');
                }
            } catch (e) {
                errorEl.textContent = _t('report_error_generic');
                errorEl.hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = _t('report_btn_submit');
            }
        });

        // Focus the select on open
        select.focus();
    };

})();
