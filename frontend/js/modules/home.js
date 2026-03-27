document.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('loggedIn');

    if (!isLoggedIn || isLoggedIn === 'false') {
        window.location.replace('index.html');
        return;
    }

    const username = localStorage.getItem('username') || 'console fan';
    const welcomeTitle = document.getElementById('welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome back, ${username}`;
    }

    const continueProgress = document.getElementById('continue-progress');
    const activeProgress = document.getElementById('active-progress');
    if (continueProgress && activeProgress) {
        const progress = 1;
        const total = 42;
        const percent = (progress / total) * 100;
        continueProgress.textContent = `${progress}/${total}`;
        activeProgress.style.width = `${Math.max(2, percent)}%`;
    }

    const consoleButtons = document.querySelectorAll('.console-card');
    consoleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const consoleName = btn.getAttribute('data-console') || '';
            window.location.href = `console.html?name=${encodeURIComponent(consoleName)}`;
        });
    });

    const continueButton = document.getElementById('continue-btn');
    if (continueButton) {
        continueButton.addEventListener('click', () => {
            window.location.href = 'invata.html';
        });
    }
});
