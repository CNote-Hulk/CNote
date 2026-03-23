document.addEventListener('DOMContentLoaded', function () {
    var exploreBtn = document.getElementById('hero-explore-btn');
    var heroSection = document.querySelector('.hero-home');
    var quickguide = document.querySelector('.hero-quickguide');
    var steps = document.querySelectorAll('.qg-step');
    var fill = document.getElementById('qg-fill');

    var loggedIn = false;
    try {
        var s = JSON.parse(localStorage.getItem('cn_session'));
        loggedIn = !!(s && s.id);
    } catch (e) { loggedIn = false; }

    if (!loggedIn) {
        if (heroSection) heroSection.classList.add('hero-home--centered');
        if (quickguide) quickguide.style.display = 'none';
        if (exploreBtn) {
            exploreBtn.href = 'login.html';
            exploreBtn.textContent = 'Login to explore the site';
            exploreBtn.removeAttribute('data-i18n');
            exploreBtn.removeAttribute('id');
        }
        return;
    }

    var STORAGE_KEY = 'cn_quickguide';
    var FILL_HEIGHTS = [0, 25, 50, 75, 100];

    function getProgress() {
        try {
            var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (data && Array.isArray(data.completed)) return data;
        } catch (e) {}
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

    function renderProgress() {
        var progress = getProgress();
        var lastDone = -1;

        steps.forEach(function (step, i) {
            var done = progress.completed.indexOf(i) !== -1;
            step.classList.remove('qg-step--done', 'qg-step--active');
            if (done) {
                step.classList.add('qg-step--done');
                lastDone = i;
            }
        });

        // Primul step nedone după ultimul done = active
        var activeIndex = lastDone + 1;
        if (activeIndex < steps.length) {
            steps[activeIndex].classList.add('qg-step--active');
        }

        if (fill) {
            fill.style.height = (FILL_HEIGHTS[activeIndex] || 100) + '%';
        }
    }

    steps.forEach(function (step, i) {
        var href = step.getAttribute('data-href');
        if (!href) return;

        step.style.cursor = 'pointer';
        step.addEventListener('click', function () {
            markStepComplete(i);

            if (i === 4 && window.CONSOLES_DATA && window.CONSOLES_DATA.length) {
                var random = window.CONSOLES_DATA[Math.floor(Math.random() * window.CONSOLES_DATA.length)];
                window.location.href = 'consoles/' + random.id + '.html#rating';
                return;
            }

            window.location.href = href;
        });
    });

    renderProgress();

    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY) renderProgress();
    });

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) renderProgress();
    });

    // === Locked scroll flow ===
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