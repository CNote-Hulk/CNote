/**
 * Console Detail Page - Dynamic content loader
 * Loads console specs from consoles.json and renders them into the page
 */

import { getConsoleById, getConsoleIdFromUrl, resolveImagePath } from '../data/data-loader.js';
import { AchievementsModule } from '../modules/achievements.js';
import { AuthModule } from '../modules/auth.js';
import { API_BASE_URL } from '../config.js';

/** Remove leftover Chrome UI elements from page template */
function cleanupConsolePageChrome() {
    const homeLinkItem = document.querySelector('.nav-links a[href="../index.html"]')?.closest('li');
    if (homeLinkItem) homeLinkItem.remove();

    const githubLink = document.querySelector('.footer-right a[href*="github.com"]');
    if (githubLink) githubLink.remove();
}

/**
 * Image dimensions mapping - prevents layout shift during load
 * Loaded from image-dimensions.json
 */
let IMAGE_DIMENSIONS = {};

/**
 * Load image dimensions from JSON file
 */
/** Load pre-computed image dimensions from JSON (prevents CLS) */
async function loadImageDimensions() {
    if (Object.keys(IMAGE_DIMENSIONS).length > 0) return;
    
    try {
        const path = window.location.pathname.includes('/pages/consoles/') ? '../../../js/data/image-dimensions.json' : '../../js/data/image-dimensions.json';
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        IMAGE_DIMENSIONS = await response.json();
    } catch (err) {
        console.warn('Failed to load image-dimensions.json:', err.message);
        IMAGE_DIMENSIONS = {};
    }
}

/**
 * Spec section definitions - maps JSON keys to display labels
 */
const SPEC_SECTIONS = [
    {
        group: 'Principale',
        cards: [
            {
                title: 'Procesare (CPU)',
                render: (c) => formatList([
                    ['Arhitectură', c.cpu.arhitectura],
                    ['Proces', c.cpu.proces_nm],
                    ['Nuclee', c.cpu.nuclee],
                    ['Frecvență', c.cpu.frecventa],
                    ['TDP', c.cpu.tdp]
                ])
            },
            {
                title: 'Grafică (GPU)',
                render: (c) => formatList([
                    ['Arhitectură', c.gpu.arhitectura],
                    ['Unități', c.gpu.unitati],
                    ['Frecvență', c.gpu.frecventa],
                    ['TFLOPS', c.gpu.tflops],
                    ['Capabilități', c.gpu.capabilitati]
                ])
            },
            {
                title: 'Memorie',
                render: (c) => formatList([
                    ['Tip', c.memorie.tip],
                    ['Capacitate', c.memorie.capacitate],
                    ['Magistrală', c.memorie.magistrala],
                    ['Bandwidth', c.memorie.bandwidth]
                ])
            },
            {
                title: 'Stocare',
                render: (c) => formatList([
                    ['Tip', c.stocare.tip],
                    ['Interfață', c.stocare.interfata],
                    ['Viteză', c.stocare.viteza]
                ])
            }
        ]
    },
    {
        group: 'Secundare',
        cards: [
            {
                title: 'Output Video',
                render: (c) => formatList([
                    ['Rezoluție', c.output_video.rezolutie],
                    ['Refresh', c.output_video.refresh],
                    ['HDR', c.output_video.hdr],
                    ['Upscaling', c.output_video.upscaling]
                ])
            },
            {
                title: 'Tehnologii',
                render: (c) => formatList([
                    ['Ray Tracing', formatBool(c.tehnologii.ray_tracing)],
                    ['VRR', formatBool(c.tehnologii.vrr)],
                    ['Backwards Compat', c.tehnologii.backwards_compatibility],
                    ['Altele', c.tehnologii.altele]
                ])
            }
        ]
    }
];

function formatBool(val) {
    if (val === true) return 'Da';
    if (val === false) return 'Nu';
    return val || 'N/A';
}

function isNA(val) {
    return !val || val === 'N/A' || val === 'n/a';
}

function formatList(pairs) {
    const filtered = pairs.filter(([_, val]) => !isNA(val));
    if (filtered.length === 0) return '<p>—</p>';
    return filtered.map(([label, val]) => `<strong>${label}:</strong> ${val}`).join('<br>');
}

/**
 * Render specs sections into the page
 */
/** Render the specs accordion from section config */
function renderSpecs(consola) {
    const specsContainer = document.querySelector('.specs-section .container');
    if (!specsContainer) return;

    let html = '<h2 class="section-title">Specificații Cheie</h2>';

    SPEC_SECTIONS.forEach(section => {
        html += `
            <div class="specs-group">
                <h3 class="specs-group-title">${section.group}</h3>
                <div class="specs-grid">
                    ${section.cards.map(card => `
                        <div class="spec-card">
                            <h4>${card.title}</h4>
                            <p>${card.render(consola)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Verdict section (avantaje / dezavantaje)
    if (consola.avantaje?.length || consola.dezavantaje?.length) {
        html += `
            <div class="specs-group">
                <h3 class="specs-group-title">Verdict</h3>
                <div class="specs-grid">
                    ${consola.avantaje?.length ? `
                    <div class="spec-card">
                        <h4>Avantaje</h4>
                        <ul class="verdict-list pros-list">
                            ${consola.avantaje.map(p => `<li class="pro-item">✓ ${p}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${consola.dezavantaje?.length ? `
                    <div class="spec-card">
                        <h4>Dezavantaje</h4>
                        <ul class="verdict-list cons-list">
                            ${consola.dezavantaje.map(c => `<li class="con-item">✗ ${c}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    specsContainer.innerHTML = html;
}

/**
 * Render the Istorie section dynamically from JSON
 * Inserted between hero and specs sections
 * Normalizes both Pattern A (\n\n) and Pattern B (<br><br>) formats
 */
/** Render the console history timeline section */
function renderHistory(consola) {
    // Ensure we have a reference point: place before .specs-section
    const specsSection = document.querySelector('.specs-section');
    if (!specsSection) return;

    // Create history section element
    let historySection = document.querySelector('.history-section');
    if (!historySection) {
        historySection = document.createElement('section');
        historySection.className = 'section history-section';
        const inner = document.createElement('div');
        inner.className = 'container';
        historySection.appendChild(inner);
        specsSection.parentNode.insertBefore(historySection, specsSection);
    }

    const container = historySection.querySelector('.container');
    const titleHtml = '<h2 class="section-title">Istorie</h2>';

    let historyHtml = '';
    if (consola.istorie && String(consola.istorie).trim()) {
        let text = String(consola.istorie);

        // Normalize: convert <br><br> to \n\n so both patterns split the same way
        text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
        // Convert remaining <br> to \n
        text = text.replace(/<br\s*\/?>/gi, '\n');

        // Split into semantic blocks by double newline
        const blocks = text.split('\n\n').map(b => b.trim()).filter(Boolean);
        const sections = [];
        let currentSection = null;

        const pushCurrent = () => {
            if (!currentSection) return;
            if (currentSection.heading || currentSection.paragraphs.length) {
                sections.push(currentSection);
            }
            currentSection = null;
        };

        blocks.forEach(block => {
            const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
            const trimmed = block.trim();

            if (lines.length > 1) {
                const firstLine = lines[0];
                const firstLineStrong = firstLine.match(/^<strong>(.*?)<\/strong>$/i);
                const isHeadingLine = firstLineStrong || (firstLine.length < 80 && !firstLine.includes('.') && !firstLine.includes('<') && /^[A-ZĂÂÎȘȚ]/.test(firstLine));

                if (isHeadingLine) {
                    pushCurrent();
                    const heading = (firstLineStrong ? firstLineStrong[1] : firstLine).trim();
                    const content = lines.slice(1).join('\n').trim();
                    currentSection = { heading, paragraphs: [] };
                    if (content) currentSection.paragraphs.push(content);
                    return;
                }
            }

            const strongMatch = trimmed.match(/^<strong>(.*?)<\/strong>$/i);
            if (strongMatch) {
                pushCurrent();
                currentSection = { heading: strongMatch[1].trim(), paragraphs: [] };
                return;
            }

            if (trimmed.length < 80 && !trimmed.includes('.') && !trimmed.includes('<') && /^[A-ZĂÂÎȘȚ]/.test(trimmed)) {
                pushCurrent();
                currentSection = { heading: trimmed, paragraphs: [] };
                return;
            }

            if (!currentSection) {
                currentSection = { heading: '', paragraphs: [] };
            }
            currentSection.paragraphs.push(trimmed);
        });

        pushCurrent();

        const autoTitles = ['Context', 'Detalii', 'Evoluție', 'Impact', 'Moștenire'];
        let autoIndex = 0;

        const rendered = sections.map(section => {
            let heading = section.heading;
            if (!heading) {
                heading = autoTitles[Math.min(autoIndex, autoTitles.length - 1)];
                autoIndex += 1;
            }

            const paragraphs = section.paragraphs.map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
            return `<h3 class="history-heading">${heading}</h3>${paragraphs}`;
        }).join('');

        historyHtml = `<div class="history-content">${rendered}</div>`;
    } else {
        historyHtml = '<div class="history-content"></div>';
    }

    container.innerHTML = titleHtml + historyHtml;
}

/**
 * Render the hero section with console data
 */
/** Render the hero section: image, title, tagline, action buttons */
function renderHero(consola) {
    // Update title
    const h1 = document.querySelector('.console-hero-text h1');
    if (h1) {
        h1.textContent = consola.nume;
        // Add favorite heart button next to title
        const heartBtn = document.createElement('button');
        heartBtn.className = 'favorite-heart-btn';
        heartBtn.id = 'favorite-heart-btn';
        heartBtn.type = 'button';
        heartBtn.title = 'Adaugă la favorite';
        heartBtn.innerHTML = '♡';
        heartBtn.setAttribute('aria-label', 'Adaugă la favorite');
        h1.appendChild(heartBtn);
    }

    // Update meta info
    const metaContainer = document.querySelector('.console-hero-text .console-meta');
    if (metaContainer) {
        metaContainer.innerHTML = `
            <span>${consola.producator}</span>
            <span>${consola.lansare}</span>
            <span>Generația ${consola.generatie}</span>
        `;
    }

    // Update image
    const img = document.querySelector('.console-hero-image img');
    if (img) {
        img.src = resolveImagePath(consola.imagine);
        img.alt = consola.nume;
        
        // Set width and height to prevent layout shift
        const imageName = consola.imagine.split('/').pop();
        const dimensions = IMAGE_DIMENSIONS[imageName];
        if (dimensions) {
            img.width = dimensions.width;
            img.height = dimensions.height;
        }
    }

    // Update page title
    document.title = `${consola.nume} — Console Notebook`;
}

/**
 * Render the community rating widget after specs
 */
/** Render the star rating widget with user interaction */
function renderRatingWidget(consoleId) {
    const specsSection = document.querySelector('.specs-section');
    if (!specsSection) return;

    // Create rating section
    const section = document.createElement('section');
    section.className = 'section rating-section';
    section.innerHTML = `
        <div class="container">
            <h2 class="section-title">Rating Comunitate</h2>
            <div class="rating-widget" id="rating-widget">
                <div class="rating-summary" id="rating-summary">
                    <div class="rating-stars-display" id="rating-stars-display"></div>
                    <div class="rating-avg" id="rating-avg">— / 5</div>
                    <div class="rating-count" id="rating-count">Se încarcă...</div>
                </div>
                <div class="rating-user" id="rating-user"></div>
            </div>
        </div>
    `;
    specsSection.parentNode.insertBefore(section, specsSection.nextSibling);

    loadRating(consoleId);
}

/** Generate star HTML for a given rating value */
function renderStars(rating, max = 5) {
    let html = '';
    for (let i = 1; i <= max; i++) {
        if (i <= Math.floor(rating)) {
            html += '<span class="star star--filled">★</span>';
        } else if (i - rating < 1 && i - rating > 0) {
            html += '<span class="star star--half">★</span>';
        } else {
            html += '<span class="star star--empty">★</span>';
        }
    }
    return html;
}

/** Render clickable/hoverable rating stars for user input */
function renderInteractiveStars(currentRating, consoleId) {
    const user = AuthModule.getCurrentUser();
    const container = document.getElementById('rating-user');
    if (!container) return;

    if (!user) {
        container.innerHTML = '<p class="rating-login-msg">Conectează-te pentru a evalua această consolă. <a href="../login.html">Conectare</a></p>';
        return;
    }

    const selected = currentRating || 0;
    container.innerHTML = `
        <p class="rating-your-label">${selected ? 'Rating-ul tău:' : 'Evaluează această consolă:'}</p>
        <div class="rating-interactive" id="rating-interactive">
            ${[1,2,3,4,5].map(i => `<button class="star-btn${i <= selected ? ' active' : ''}" data-value="${i}" title="${i} stea${i > 1 ? 'le' : ''}">★</button>`).join('')}
        </div>
    `;

    const buttons = container.querySelectorAll('.star-btn');

    // Hover effects
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => {
            const val = parseInt(btn.dataset.value);
            buttons.forEach(b => {
                b.classList.toggle('hover', parseInt(b.dataset.value) <= val);
            });
        });
        btn.addEventListener('mouseleave', () => {
            buttons.forEach(b => b.classList.remove('hover'));
        });
        btn.addEventListener('click', () => submitRating(consoleId, parseInt(btn.dataset.value)));
    });
}

/** Fetch current rating data from API */
async function loadRating(consoleId) {
    try {
        const token = localStorage.getItem('cn_token');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(`${API_BASE_URL}/ratings/${encodeURIComponent(consoleId)}`, {
            headers,
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
            updateRatingDisplay(data.average, data.count);
            renderInteractiveStars(data.userRating, consoleId);
        }
    } catch {
        const countEl = document.getElementById('rating-count');
        if (countEl) countEl.textContent = 'Nu s-a putut încărca rating-ul.';
    }
}

/** Submit user's rating to API and refresh display */
async function submitRating(consoleId, rating) {
    try {
        const token = localStorage.getItem('cn_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(`${API_BASE_URL}/ratings/${encodeURIComponent(consoleId)}`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ rating })
        });
        const data = await res.json();
        if (data.success) {
            updateRatingDisplay(data.average, data.count);
            renderInteractiveStars(data.userRating, consoleId);
        }
    } catch { /* silent */ }
}

function updateRatingDisplay(average, count) {
    const starsEl = document.getElementById('rating-stars-display');
    const avgEl = document.getElementById('rating-avg');
    const countEl = document.getElementById('rating-count');

    if (starsEl) starsEl.innerHTML = renderStars(average);
    if (avgEl) avgEl.textContent = `${average} / 5`;
    if (countEl) countEl.textContent = count === 1 ? '1 evaluare' : `${count} evaluări`;
}

/**
 * Initialize the favorite heart button
 */
/** Initialize the favorite (heart) toggle button for a console */
async function initFavoriteButton(consoleId) {
    const btn = document.getElementById('favorite-heart-btn');
    if (!btn) return;

    const user = AuthModule.getCurrentUser();
    if (!user) {
        btn.title = 'Conectează-te pentru a adăuga la favorite';
        btn.addEventListener('click', () => {
            window.location.href = '../login.html';
        });
        return;
    }

    // Check current favorite status
    try {
        const token = localStorage.getItem('cn_token');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const res = await fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(consoleId)}`, {
            headers,
            credentials: 'include'
        });
        const data = await res.json();
        if (data.success && data.isFavorite) {
            btn.classList.add('active');
            btn.innerHTML = '♥';
            btn.title = 'Elimină de la favorite';
        }
    } catch { /* ignore */ }

    btn.addEventListener('click', async () => {
        try {
            const token = localStorage.getItem('cn_token');
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            const res = await fetch(`${API_BASE_URL}/favorites/${encodeURIComponent(consoleId)}`, {
                method: 'POST',
                headers,
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                btn.classList.toggle('active', data.isFavorite);
                btn.innerHTML = data.isFavorite ? '♥' : '♡';
                btn.title = data.isFavorite ? 'Elimină de la favorite' : 'Adaugă la favorite';
            }
        } catch { /* ignore */ }
    });
}

/**
 * Initialize the console detail page
 */
/** Main entry point: load console data and render all sections */
async function init() {
    cleanupConsolePageChrome();

    await loadImageDimensions();
    
    const consoleId = getConsoleIdFromUrl();
    if (!consoleId) {
        console.warn('No console ID found in URL');
        return;
    }

    const consola = await getConsoleById(consoleId);
    if (!consola) {
        console.warn(`Console "${consoleId}" not found in database`);
        return;
    }

    renderHero(consola);
    renderHistory(consola);
    renderSpecs(consola);
    renderRatingWidget(consoleId);
    initFavoriteButton(consoleId);

    AchievementsModule.trackConsoleVisit(consoleId);
    window.dispatchEvent(new CustomEvent('cn:console-visited', {
        detail: { consoleId }
    }));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export { init };
