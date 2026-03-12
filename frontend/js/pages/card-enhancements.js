/**
 * Card Enhancements — Adds favorite heart + community rating to console cards
 * Used on the evolution/encyclopedia page (evolutie.html)
 */

import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

function getConsoleIdFromHref(href) {
    if (!href) return null;
    const match = href.match(/consoles\/([^/.]+)\.html/);
    return match ? match[1] : null;
}

function renderStarsFilled(avg) {
    const full = Math.floor(avg);
    const half = avg - full >= 0.3 && avg - full < 0.8 ? 1 : 0;
    const fullExtra = avg - full >= 0.8 ? 1 : 0;
    const empty = 5 - full - fullExtra - half;
    return '★'.repeat(full + fullExtra) + (half ? '½' : '') + '☆'.repeat(empty);
}

async function init() {
    const cards = document.querySelectorAll('.console-card');
    if (!cards.length) return;

    const user = AuthModule.getCurrentUser();
    const token = localStorage.getItem('cn_token');
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // Build console ID map from cards
    const cardMap = new Map();
    cards.forEach(card => {
        const id = getConsoleIdFromHref(card.getAttribute('href'));
        if (id) cardMap.set(id, card);
    });

    // Fetch all ratings in one request
    let ratingsMap = {};
    try {
        const res = await fetch(`${API_BASE_URL}/ratings/averages`);
        const data = await res.json();
        if (data.success) ratingsMap = data.ratings;
    } catch { /* silent */ }

    // Fetch user's favorites if logged in
    let favSet = new Set();
    if (user) {
        try {
            const res = await fetch(`${API_BASE_URL}/favorites`, { headers, credentials: 'include' });
            const data = await res.json();
            if (data.success) favSet = new Set(data.favorites);
        } catch { /* silent */ }
    }

    // Enhance each card
    cardMap.forEach((card, consoleId) => {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'card-overlay';

        // Heart button
        const heart = document.createElement('button');
        heart.type = 'button';
        heart.className = 'card-heart' + (favSet.has(consoleId) ? ' active' : '');
        heart.innerHTML = favSet.has(consoleId) ? '♥' : '♡';
        heart.title = user ? (favSet.has(consoleId) ? 'Elimină de la favorite' : 'Adaugă la favorite') : 'Conectează-te pentru favorite';

        heart.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!user) {
                window.location.href = 'login.html';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(consoleId)}`, {
                    method: 'POST', headers: { ...headers }, credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                    heart.classList.toggle('active', data.isFavorite);
                    heart.innerHTML = data.isFavorite ? '♥' : '♡';
                    heart.title = data.isFavorite ? 'Elimină de la favorite' : 'Adaugă la favorite';
                }
            } catch { /* silent */ }
        });

        overlay.appendChild(heart);

        // Rating badge
        const ratingData = ratingsMap[consoleId];
        const badge = document.createElement('span');
        badge.className = 'card-rating';
        if (ratingData && ratingData.count > 0) {
            badge.innerHTML = `<span class="card-rating__stars">★</span> ${ratingData.average}`;
            badge.title = `${ratingData.average}/5 (${ratingData.count} ${ratingData.count === 1 ? 'vot' : 'voturi'})`;
        } else {
            badge.innerHTML = `<span class="card-rating__stars">☆</span> —`;
            badge.title = 'Nicio evaluare încă';
        }
        overlay.appendChild(badge);

        // Make card position relative for overlay positioning
        card.style.position = 'relative';
        card.appendChild(overlay);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { init };
