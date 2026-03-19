/**
 * Homepage Quick Guide
 * Locked scroll until user clicks "Explore CNote"
 * Vertical timeline auto-completes on discover
 */
document.addEventListener('DOMContentLoaded', function () {
    var exploreBtn = document.getElementById('hero-explore-btn');
    var steps = document.querySelectorAll('.hero-timeline__step');
    var connectors = document.querySelectorAll('.hero-timeline__connector');
    var discovered = localStorage.getItem('homeDiscovered') === 'true';

    if (discovered) {
        steps.forEach(function (s) { s.classList.add('active'); });
        connectors.forEach(function (c) { c.classList.add('filled'); });
    } else {
        document.body.classList.add('home-locked');
    }

    if (exploreBtn) {
        exploreBtn.addEventListener('click', function (e) {
            if (!discovered) {
                e.preventDefault();
                document.body.classList.remove('home-locked');
                localStorage.setItem('homeDiscovered', 'true');
                animateTimeline();
                setTimeout(function () {
                    var target = document.getElementById('content');
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                }, 400);
            }
        });
    }

    function animateTimeline() {
        steps.forEach(function (step, i) {
            setTimeout(function () {
                step.classList.add('active');
                if (i > 0 && connectors[i - 1]) {
                    connectors[i - 1].classList.add('filled');
                }
            }, i * 600);
        });
    }
});
