/**
 * ===========================
 * HELP & SUPPORT PAGE
 * ===========================
 * Hero discover flow, timeline animation,
 * FAQ accordion, and contact form handler.
 * ===========================
 */
document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('.help-hero');
    var discoverBtn = document.getElementById('help-discover-btn');
    var timelineSection = document.getElementById('timeline');
    var steps = document.querySelectorAll('.help-timeline__step');
    var connectors = document.querySelectorAll('.help-timeline__connector');
    var faqQuestions = document.querySelectorAll('.help-faq__question');

    animateTimeline();

    // --- Discover button ---
    if (discoverBtn) {
        discoverBtn.addEventListener('click', function () {
            document.body.style.overflow = '';
            localStorage.setItem('helpDiscovered', 'true');
            timelineSection.scrollIntoView({ behavior: 'smooth' });
            animateTimeline();
        });
    }

    function animateTimeline() {
        steps.forEach(function (step, i) {
            setTimeout(function () {
                step.classList.add('active');
                if (i > 0 && connectors[i - 1]) {
                    connectors[i - 1].classList.add('filled');
                }
            }, i * 800);
        });
    }

    // --- FAQ accordion ---
    faqQuestions.forEach(function (question) {
        question.addEventListener('click', function () {
            var answer = this.nextElementSibling;
            var icon = this.querySelector('.help-faq__icon');
            var isActive = this.classList.contains('active');

            // Close all
            faqQuestions.forEach(function (q) {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
                q.querySelector('.help-faq__icon').textContent = '+';
            });

            if (!isActive) {
                this.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.textContent = '\u2212'; // minus sign
            }
        });
    });

    // Contact form is handled by shared ContactFormModule/fallback contact-form.js.
});
