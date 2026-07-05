/**
 * Avatar Cropper — WhatsApp-style circular crop dialog.
 * openAvatarCropper(file) shows a modal with the picked image behind a circular
 * mask; the user drags to reposition and pinches / scrolls / uses the slider to
 * zoom. Resolves with a 512x512 JPEG Blob of the chosen area, or null on cancel.
 * The modal DOM is built here (no inline scripts — CSP-safe); styles live in
 * frontend/css/components/avatar-crop.css.
 */

const OUTPUT_SIZE = 512;

export function openAvatarCropper(file) {
    return new Promise((resolve) => {
        buildCropper(file, resolve).catch(() => resolve(null));
    });
}

async function buildCropper(file, resolve) {
    // EXIF-aware decode so portrait phone photos aren't shown sideways
    let img;
    try {
        img = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        img = await loadImageElement(file);
    }
    if (!img || !img.width || !img.height) {
        resolve(null);
        return;
    }

    // ── DOM ──
    const root = document.createElement('div');
    root.className = 'avatar-crop';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');

    const backdrop = document.createElement('div');
    backdrop.className = 'avatar-crop__backdrop';

    const content = document.createElement('div');
    content.className = 'avatar-crop__content';

    const title = document.createElement('div');
    title.className = 'avatar-crop__title';
    title.textContent = 'Drag and zoom to adjust';

    const stage = document.createElement('div');
    stage.className = 'avatar-crop__stage';
    const canvas = document.createElement('canvas');
    const mask = document.createElement('div');
    mask.className = 'avatar-crop__mask';
    stage.appendChild(canvas);
    stage.appendChild(mask);

    const zoomRow = document.createElement('div');
    zoomRow.className = 'avatar-crop__zoom-row';
    const zoomOutIcon = document.createElement('span');
    zoomOutIcon.textContent = '🔍';
    zoomOutIcon.className = 'avatar-crop__zoom-icon avatar-crop__zoom-icon--small';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = '0';
    slider.className = 'avatar-crop__slider';
    slider.setAttribute('aria-label', 'Zoom');
    const zoomInIcon = document.createElement('span');
    zoomInIcon.textContent = '🔍';
    zoomInIcon.className = 'avatar-crop__zoom-icon';
    zoomRow.append(zoomOutIcon, slider, zoomInIcon);

    const actions = document.createElement('div');
    actions.className = 'avatar-crop__actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'avatar-crop__btn avatar-crop__btn--cancel';
    cancelBtn.textContent = 'Cancel';
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'avatar-crop__btn avatar-crop__btn--save';
    saveBtn.textContent = 'Save';
    actions.append(cancelBtn, saveBtn);

    content.append(title, stage, zoomRow, actions);
    root.append(backdrop, content);
    document.body.appendChild(root);

    // ── Geometry ──
    const S = Math.min(360, Math.max(240, window.innerWidth - 64)); // stage css size
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.style.width = S + 'px';
    stage.style.height = S + 'px';
    canvas.width = Math.round(S * dpr);
    canvas.height = Math.round(S * dpr);
    canvas.style.width = S + 'px';
    canvas.style.height = S + 'px';
    const ctx = canvas.getContext('2d');

    const minScale = Math.max(S / img.width, S / img.height); // cover the stage
    const maxScale = minScale * 4;
    let scale = minScale;
    let ox = (S - img.width * scale) / 2;
    let oy = (S - img.height * scale) / 2;

    function clampOffsets() {
        ox = Math.min(0, Math.max(S - img.width * scale, ox));
        oy = Math.min(0, Math.max(S - img.height * scale, oy));
    }

    function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, S, S);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, ox, oy, img.width * scale, img.height * scale);
    }

    function syncSlider() {
        slider.value = String(Math.round(((scale - minScale) / (maxScale - minScale)) * 100));
    }

    /** Zoom keeping the stage point (cx, cy) fixed */
    function zoomTo(newScale, cx, cy) {
        newScale = Math.min(maxScale, Math.max(minScale, newScale));
        ox = cx - (cx - ox) * (newScale / scale);
        oy = cy - (cy - oy) * (newScale / scale);
        scale = newScale;
        clampOffsets();
        draw();
        syncSlider();
    }

    draw();

    // ── Gestures (drag + pinch via pointer events, wheel, slider) ──
    const pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = minScale;

    canvas.addEventListener('pointerdown', (e) => {
        canvas.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
            pinchStartScale = scale;
        }
    });

    canvas.addEventListener('pointermove', (e) => {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        const cur = { x: e.clientX, y: e.clientY };

        if (pointers.size === 1) {
            ox += cur.x - prev.x;
            oy += cur.y - prev.y;
            clampOffsets();
            draw();
        } else if (pointers.size === 2) {
            pointers.set(e.pointerId, cur);
            const [a, b] = [...pointers.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const rect = canvas.getBoundingClientRect();
            const midX = (a.x + b.x) / 2 - rect.left;
            const midY = (a.y + b.y) / 2 - rect.top;
            if (pinchStartDist > 0) {
                zoomTo(pinchStartScale * (dist / pinchStartDist), midX, midY);
            }
            return;
        }
        pointers.set(e.pointerId, cur);
    });

    const releasePointer = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchStartDist = 0;
    };
    canvas.addEventListener('pointerup', releasePointer);
    canvas.addEventListener('pointercancel', releasePointer);

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        zoomTo(scale * factor, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    slider.addEventListener('input', () => {
        const target = minScale + (Number(slider.value) / 100) * (maxScale - minScale);
        zoomTo(target, S / 2, S / 2);
    });

    // ── Finish / cleanup ──
    function cleanup() {
        document.removeEventListener('keydown', onKey);
        root.remove();
        if (typeof img.close === 'function') img.close();
    }

    function cancel() {
        cleanup();
        resolve(null);
    }

    function onKey(e) {
        if (e.key === 'Escape') cancel();
    }
    document.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', cancel);
    cancelBtn.addEventListener('click', cancel);

    saveBtn.addEventListener('click', () => {
        const out = document.createElement('canvas');
        out.width = OUTPUT_SIZE;
        out.height = OUTPUT_SIZE;
        const octx = out.getContext('2d');
        octx.imageSmoothingQuality = 'high';
        // The visible stage square maps to this source rect in image pixels
        octx.drawImage(img, -ox / scale, -oy / scale, S / scale, S / scale, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        out.toBlob((blob) => {
            cleanup();
            resolve(blob); // null-blob edge case falls through as cancel
        }, 'image/jpeg', 0.9);
    });
}

function loadImageElement(file) {
    return new Promise((res, rej) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => { URL.revokeObjectURL(url); res(image); };
        image.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
        image.src = url;
    });
}
