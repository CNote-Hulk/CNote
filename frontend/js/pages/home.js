/**
 * Homepage Quick Guide
 * Locked scroll until user clicks "Explore Cnote Bakery"
 * Steps are clickable links — each tracks completion via localStorage
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
        
        if (exploreBtn) {
            exploreBtn.href = 'login.html';
            exploreBtn.removeAttribute('id');
        }
        return;
    }

    // === Quick Guide Completion System ===
    var STORAGE_KEY = 'cn_quickguide';

    function getProgress() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (data && Array.isArray(data.completed)) return data;
        } catch (e) { /* ignore */ }
        return { completed: [] };
    }

    function saveProgress(progress) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }

    function markStepComplete(stepIndex) {
        var progress = getProgress();
        if (progress.completed.indexOf(stepIndex) === -1) {
            progress.completed.push(stepIndex);
            saveProgress(progress);
        }
    }

    function isStepComplete(stepIndex) {
        return getProgress().completed.indexOf(stepIndex) !== -1;
    }

    function renderProgress() {
        var progress = getProgress();
        steps.forEach(function (step, i) {
            var done = progress.completed.indexOf(i) !== -1;
            step.classList.toggle('completed', done);
            step.classList.toggle('active', done);
        });
        // Fill connector between step i and step i+1 when step i (above) is done
        connectors.forEach(function (conn, i) {
            var stepAboveDone = progress.completed.indexOf(i) !== -1;
            conn.classList.toggle('filled', stepAboveDone);
        });
    }

    // Make steps clickable — navigate to the page and mark as done
    steps.forEach(function (step, i) {
        var href = step.getAttribute('data-href');
        if (!href) return;

        step.style.cursor = 'pointer';
        step.addEventListener('click', function () {
            markStepComplete(i);

            // Step 4 (index 4): pick a random console and go to its rating
            if (i === 4 && window.CONSOLES_DATA && window.CONSOLES_DATA.length) {
                var consoles = window.CONSOLES_DATA;
                var random = consoles[Math.floor(Math.random() * consoles.length)];
                window.location.href = 'consoles/' + random.id + '.html#rating';
                return;
            }

            window.location.href = href;
        });
    });

    // Render saved progress on load
    renderProgress();

    // Re-render when localStorage changes from another tab/page
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY) renderProgress();
    });

    // Re-render when user returns to this tab (e.g. back button)
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) renderProgress();
    });

    // === Discover (locked scroll) flow ===
    var discovered = localStorage.getItem('homeDiscovered') === 'true';

    if (!discovered) {
        document.body.classList.add('home-locked');
    }

    if (exploreBtn) {
        exploreBtn.addEventListener('click', function (e) {
            if (!discovered) {
                e.preventDefault();
                document.body.classList.remove('home-locked');
                localStorage.setItem('homeDiscovered', 'true');
                setTimeout(function () {
                    var target = document.getElementById('content');
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                }, 400);
            }
        });
    }
});
