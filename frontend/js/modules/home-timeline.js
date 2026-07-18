/**
 * Quick Guide Timeline — index.html
 * Animates the fill bar and makes steps clickable.
 */
(function () {
    'use strict';

    var steps = Array.from(document.querySelectorAll('.qg-step'));
    var fill  = document.getElementById('qg-fill');
    if (!steps.length || !fill) return;

    /* ── Step state helpers ──────────────────────────── */
    function getActiveIndex() {
        var idx = steps.findIndex(function (s) { return s.classList.contains('qg-step--active'); });
        if (idx >= 0) return idx;
        // Fallback: last done step + 1
        var lastDone = -1;
        steps.forEach(function (s, i) { if (s.classList.contains('qg-step--done')) lastDone = i; });
        return Math.min(lastDone + 1, steps.length - 1);
    }

    /* ── Fill bar ────────────────────────────────────── */
    function setFill(idx) {
        var pct = steps.length > 1 ? (idx / (steps.length - 1)) * 100 : 0;
        fill.style.height = Math.max(0, Math.min(100, pct)) + '%';
    }

    /* ── Apply visual state to a step ───────────────── */
    function activateStep(idx) {
        steps.forEach(function (s, i) {
            s.classList.remove('qg-step--active', 'qg-step--done');
            if (i < idx)  s.classList.add('qg-step--done');
            if (i === idx) s.classList.add('qg-step--active');
        });
        setFill(idx);
    }

    /* ── Login-based initial state ───────────────────── */
    var hasToken = !!localStorage.getItem('cn_token');
    var initialIdx = getActiveIndex();

    // If user just logged in and HTML still shows step 1 as active, bump to step 2
    if (hasToken && initialIdx === 0 && steps[0].classList.contains('qg-step--active')) {
        activateStep(1);
        initialIdx = 1;
    }

    /* ── Animate fill on load ────────────────────────── */
    setTimeout(function () { setFill(initialIdx); }, 200);

    /* ── Click: navigate to data-href ───────────────── */
    steps.forEach(function (step, idx) {
        step.addEventListener('click', function () {
            var href = step.getAttribute('data-href');
            // Flash the step active before navigating
            activateStep(idx);
            if (href && href !== '#') {
                setTimeout(function () { window.location.href = href; }, 120);
            }
        });

        /* Hover: preview the step description */
        step.addEventListener('mouseenter', function () {
            steps.forEach(function (s) { s.classList.remove('qg-step--hover'); });
            step.classList.add('qg-step--hover');
        });
        step.addEventListener('mouseleave', function () {
            step.classList.remove('qg-step--hover');
        });
    });
})();
