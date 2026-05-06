/* ── Custom Confirm Modal ───────────────────────────────── */

let _overlay = null;

function _getOrCreate() {
    if (_overlay) return _overlay;

    _overlay = document.createElement('div');
    _overlay.className = 'confirm-overlay';
    // SAFE: hardcoded only — this is a static SVG + empty structural shell.
    // The `message` parameter is written via .textContent (line below), never innerHTML.
    _overlay.innerHTML = `
        <div class="confirm-box">
            <div class="confirm-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
            </div>
            <p class="confirm-msg"></p>
            <div class="confirm-actions">
                <button class="confirm-btn confirm-btn--cancel">Cancel</button>
                <button class="confirm-btn confirm-btn--ok">Delete</button>
            </div>
        </div>`;
    document.body.appendChild(_overlay);
    return _overlay;
}

/**
 * Show a styled confirm dialog. Returns a Promise<boolean>.
 * @param {string} message  – text to display
 * @param {object} [opts]   – { ok: 'Button text', cancel: 'Button text' }
 */
export function confirmModal(message, opts = {}) {
    return new Promise(resolve => {
        const el = _getOrCreate();
        el.querySelector('.confirm-msg').textContent = message;
        el.querySelector('.confirm-btn--ok').textContent = opts.ok || 'Delete';
        el.querySelector('.confirm-btn--cancel').textContent = opts.cancel || 'Cancel';

        el.classList.add('confirm-overlay--active');

        function cleanup(result) {
            el.classList.remove('confirm-overlay--active');
            el.removeEventListener('click', onOverlay);
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        }

        const btnOk = el.querySelector('.confirm-btn--ok');
        const btnCancel = el.querySelector('.confirm-btn--cancel');

        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onOverlay(e) { if (e.target === el) cleanup(false); }
        function onKey(e) {
            if (e.key === 'Escape') cleanup(false);
            if (e.key === 'Enter') cleanup(true);
        }

        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        el.addEventListener('click', onOverlay);
        document.addEventListener('keydown', onKey);

        btnOk.focus();
    });
}
