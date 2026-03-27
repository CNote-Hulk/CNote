import { AuthModule } from '../modules/auth.js';

// Entrance animation — homepage cards + timeline items
const elements = document.querySelectorAll('.hp-card, .hp-timeline__item');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const idx = Array.from(elements).indexOf(entry.target);
            setTimeout(() => entry.target.classList.add('is-visible'), idx * 80);
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });
elements.forEach(c => observer.observe(c));

// If the user is not logged in, redirect profile card to login
const profileCard = document.querySelector('a.hp-card[href="profil.html"]');
if (profileCard) {
    profileCard.addEventListener('click', e => {
        if (!AuthModule.isLoggedIn()) {
            e.preventDefault();
            window.location.href = 'login.html';
        }
    });
}