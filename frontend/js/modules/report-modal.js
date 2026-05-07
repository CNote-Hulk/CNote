/* ─────────────────────────────────────────────────────────────
   FILE: report-modal.js
   DESCRIPTION: DSA Article 16 — content report modal.
   Exposes window.openReportModal({ contentType, contentId, contentPreview }).
   Plain JS — no framework, no build step. Works on any page that
   loads this script and report-modal.css.
   ───────────────────────────────────────────────────────────── */

(function () {
    'use strict';

    // ── Labels ──────────────────────────────────────────────────────────────

    const REASON_LABELS = {
        illegal_content:  'Conținut ilegal',
        hate_speech:      'Discurs de ură',
        harassment:       'Hărțuire',
        spam:             'Spam',
        csam:             'Conținut sexual cu minori (CSAM)',
        misinformation:   'Dezinformare',
        other:            'Altceva',
    };

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
            ? String(contentPreview).substring(0, 60) + (contentPreview.length > 60 ? '…' : '')
            : '';

        // SAFE: all user-visible strings are escaped via textContent/value assignment below.
        // Only static structural HTML is interpolated here.
        overlay.innerHTML = `
            <div id="report-modal-box" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
                <p class="report-modal__title" id="report-modal-title">Raportează conținut</p>
                ${previewText ? `<p class="report-modal__preview" id="report-modal-preview"></p>` : ''}

                <div>
                    <label class="report-modal__label" for="report-reason">Motivul raportului *</label>
                    <select class="report-modal__select" id="report-reason">
                        <option value="" disabled selected>— Selectează un motiv —</option>
                        ${Object.entries(REASON_LABELS).map(([v, l]) =>
                            `<option value="${v}"></option>`
                        ).join('')}
                    </select>
                </div>

                <div>
                    <label class="report-modal__label" for="report-description">Descriere (opțional)</label>
                    <textarea class="report-modal__textarea" id="report-description" maxlength="2000" rows="3" placeholder="Descrie problema în detaliu…"></textarea>
                    <div class="report-modal__char-counter" id="report-char-counter">0 / 2000</div>
                </div>

                <div>
                    <label class="report-modal__label" for="report-contact">Email contact (opțional)</label>
                    <input class="report-modal__input" type="email" id="report-contact" placeholder="email@exemplu.com" maxlength="255">
                </div>

                <p class="report-modal__error" id="report-error" hidden></p>

                <div class="report-modal__actions">
                    <button class="report-modal__btn-submit" id="report-submit" type="button">Trimite raportul</button>
                    <button class="report-modal__btn-cancel" id="report-cancel" type="button">Anulează</button>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        // ── Set option text via textContent (XSS-safe) ───────────────────────
        const select = document.getElementById('report-reason');
        const options = select.querySelectorAll('option[value]');
        Object.keys(REASON_LABELS).forEach((v, i) => {
            options[i].textContent = REASON_LABELS[v];
        });

        // Set preview text safely
        if (previewText) {
            const prev = document.getElementById('report-modal-preview');
            if (prev) prev.textContent = `"${previewText}"`;
        }

        // ── Char counter ─────────────────────────────────────────────────────
        const textarea = document.getElementById('report-description');
        const counter  = document.getElementById('report-char-counter');
        textarea.addEventListener('input', () => {
            counter.textContent = `${textarea.value.length} / 2000`;
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
                errorEl.textContent = 'Te rugăm să selectezi un motiv.';
                errorEl.hidden = false;
                return;
            }

            // Loading state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Se trimite…';
            errorEl.hidden = true;

            try {
                const token = getToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const resp = await fetch(`${apiBase()}/reports`, {
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
                            <span style="font-size:2rem">✓</span>
                            <p>Raportul a fost trimis. Mulțumim.</p>
                            <button class="report-modal__btn-cancel" id="report-close-success" type="button">Închide</button>
                        </div>`;
                    document.getElementById('report-close-success').addEventListener('click', removeModal);
                } else {
                    // Error — keep form open
                    errorEl.textContent = data.error || 'A apărut o eroare. Încearcă din nou.';
                    errorEl.hidden = false;
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Trimite raportul';
                }
            } catch {
                errorEl.textContent = 'A apărut o eroare. Încearcă din nou.';
                errorEl.hidden = false;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Trimite raportul';
            }
        });

        // Focus the select on open
        select.focus();
    };

})();
