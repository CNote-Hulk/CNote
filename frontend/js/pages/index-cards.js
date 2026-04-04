/**
 * index-cards.js
 * Thumbnail → Featured card swap.
 * Clicking a .lp-thumb updates the featured card (image, year, link, desc).
 * Clicking the featured image navigates directly to the console page.
 */

(function () {
    const fcImg  = document.getElementById('lp-fc-img');
    const fcLink = document.getElementById('lp-fc-link');
    const fcYear = document.getElementById('lp-fc-year');
    const fcDesc = document.getElementById('lp-fc-desc');

    if (!fcImg || !fcLink) return;

    // Clicking the featured image = same as clicking "View page →"
    fcImg.addEventListener('click', () => {
        window.location.href = fcLink.href;
    });

    // Thumbnail selection
    document.querySelectorAll('.lp-thumb').forEach(btn => {
        btn.addEventListener('click', () => {
            // If this thumb has a direct-navigate target (e.g. Nintendo → encyclopedia)
            if (btn.dataset.navigate) {
                window.location.href = btn.dataset.navigate;
                return;
            }

            if (btn.classList.contains('lp-thumb--active')) return;

            // Fade out
            fcImg.classList.add('lp-featured__img--fade');

            setTimeout(() => {
                // Swap content
                fcImg.src       = btn.dataset.img;
                fcImg.alt       = btn.dataset.alt;
                fcLink.href     = btn.dataset.href;
                if (fcYear) fcYear.textContent = btn.dataset.year;
                if (fcDesc) fcDesc.textContent = btn.dataset.desc;

                // Fade back in
                fcImg.classList.remove('lp-featured__img--fade');
            }, 200);

            // Update active state
            document.querySelectorAll('.lp-thumb').forEach(b => b.classList.remove('lp-thumb--active'));
            btn.classList.add('lp-thumb--active');
        });
    });
})();
