/**
 * ===========================
 * HELP & SUPPORT PAGE
 * ===========================
 * FAQ accordion, category filter, search.
 * ===========================
 */
document.addEventListener('DOMContentLoaded', function () {
    var faqItems = document.querySelectorAll('.help-faq__item');
    var faqQuestions = document.querySelectorAll('.help-faq__question');
    var searchInput = document.getElementById('faq-search');
    var noResults = document.getElementById('faq-no-results');
    var catButtons = document.querySelectorAll('.help-cat-card');
    var resetBtn = document.getElementById('help-cat-reset');

    var activeCategory = null;

    // --- FAQ accordion ---
    faqQuestions.forEach(function (question) {
        question.addEventListener('click', function () {
            var answer = this.nextElementSibling;
            var icon = this.querySelector('.help-faq__icon');
            var isActive = this.classList.contains('active');

            faqQuestions.forEach(function (q) {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
                q.querySelector('.help-faq__icon').textContent = '+';
            });

            if (!isActive) {
                this.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.textContent = '\u2212';
            }
        });
    });

    // --- Apply combined filter (category + search) ---
    function applyFilters() {
        var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        var visible = 0;

        faqItems.forEach(function (item) {
            var cat = item.getAttribute('data-category') || '';
            var text = item.textContent.toLowerCase();

            var matchCat = !activeCategory || cat === activeCategory;
            var matchSearch = !query || text.indexOf(query) !== -1;

            var show = matchCat && matchSearch;
            item.hidden = !show;
            if (show) visible++;
        });

        if (noResults) noResults.hidden = visible > 0;
    }

    // --- Category filter ---
    catButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var cat = this.getAttribute('data-category');

            if (activeCategory === cat) {
                // Toggle off
                activeCategory = null;
                catButtons.forEach(function (b) { b.classList.remove('is-active'); });
                if (resetBtn) resetBtn.hidden = true;
            } else {
                activeCategory = cat;
                catButtons.forEach(function (b) {
                    b.classList.toggle('is-active', b.getAttribute('data-category') === cat);
                });
                if (resetBtn) resetBtn.hidden = false;
            }

            // Collapse open answers when switching category
            faqQuestions.forEach(function (q) {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
                q.querySelector('.help-faq__icon').textContent = '+';
            });

            applyFilters();
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            activeCategory = null;
            catButtons.forEach(function (b) { b.classList.remove('is-active'); });
            resetBtn.hidden = true;
            applyFilters();
        });
    }

    // --- Search ---
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    // Contact form is handled by fallback contact-form.js.
});
