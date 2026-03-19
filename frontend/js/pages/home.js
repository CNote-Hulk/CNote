/**
 * Homepage Quick Guide
 * Locked scroll until user clicks "Explore CNote"
 * Vertical timeline auto-completes on discover
 * Timeline only shown when logged in; button redirects to login otherwise
 */
document.addEventListener('DOMContentLoaded', function () {
    var exploreBtn = document.getElementById('hero-explore-btn');
    var timeline = document.querySelector('.hero-timeline');
    var hero = document.querySelector('.hero-home');
    var steps = document.querySelectorAll('.hero-timeline__step');
    var connectors = document.querySelectorAll('.hero-timeline__connector');

    // Check login state from local session cache
    var loggedIn = false;
    try {
        var s = JSON.parse(localStorage.getItem('cn_session'));
        loggedIn = !!(s && s.id);
    } catch (e) { loggedIn = false; }

    if (!loggedIn) {
        // Not logged in: hide timeline, center hero, button goes to login
        if (timeline) timeline.style.display = 'none';
        if (hero) hero.classList.add('hero-home--centered');
        if (exploreBtn) {
            exploreBtn.href = 'login.html';
            exploreBtn.removeAttribute('id'); // prevent discover logic
        }
        return;
    }

    // Logged in: normal discover flow
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
