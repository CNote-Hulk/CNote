/**
 * Console Detail Page - Dynamic content loader
 * Loads console specs from consoles.json and renders them into the page
 */

import { getConsoleById, getConsoleIdFromUrl, resolveImagePath } from '../data/data-loader.js';
import { AchievementsModule } from '../modules/achievements.js';
import { AuthModule } from '../modules/auth.js';
import { I18nModule } from '../modules/i18n.js';
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
let currentConsole = null;

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
 * Build spec section definitions based on current language.
 */
function getSpecSections(consola) {
    return [
        {
            group: I18nModule.t('spec_group_primary'),
            cards: [
                {
                    title: I18nModule.t('spec_cpu_title'),
                    render: (c) => formatList([
                        [I18nModule.t('spec_label_architecture'), c.cpu.architecture],
                        [I18nModule.t('spec_label_process'), c.cpu.proces_nm],
                        [I18nModule.t('spec_label_cores'), c.cpu.cores],
                        [I18nModule.t('spec_label_clock'), c.cpu.frequency],
                        [I18nModule.t('spec_label_tdp'), c.cpu.tdp]
                    ])
                },
                {
                    title: I18nModule.t('spec_gpu_title'),
                    render: (c) => formatList([
                        [I18nModule.t('spec_label_architecture'), c.gpu.architecture],
                        [I18nModule.t('spec_label_units'), c.gpu.units],
                        [I18nModule.t('spec_label_clock'), c.gpu.frequency],
                        [I18nModule.t('spec_label_tflops'), c.gpu.tflops],
                        [I18nModule.t('spec_label_capabilities'), c.gpu.capabilities]
                    ])
                },
                {
                    title: I18nModule.t('spec_memory_title'),
                    render: (c) => formatList([
                        [I18nModule.t('spec_label_type'), c.memory.type],
                        [I18nModule.t('spec_label_capacity'), c.memory.capacity],
                        [I18nModule.t('spec_label_bus'), c.memory.bus],
                        [I18nModule.t('spec_label_bandwidth'), c.memory.bandwidth]
                    ])
                },
                {
                    title: I18nModule.t('spec_storage_title'),
                    render: (c) => formatList([
                        [I18nModule.t('spec_label_type'), c.storage.type],
                        [I18nModule.t('spec_label_interface'), c.storage.interface],
                        [I18nModule.t('spec_label_speed'), c.storage.speed]
                    ])
                }
            ]
        },
        {
            group: I18nModule.t('spec_group_secondary'),
            cards: [
                {
                    title: I18nModule.t('spec_output_title'),
                    render: (c) => formatList([
                        [I18nModule.t('spec_label_resolution'), c.output_video.resolution],
                        [I18nModule.t('spec_label_refresh'), c.output_video.refresh],
                        [I18nModule.t('spec_label_hdr'), c.output_video.hdr],
                        [I18nModule.t('spec_label_upscaling'), c.output_video.upscaling]
                    ])
                },
                {
                    title: I18nModule.t('spec_tech_title'),
                    render: (c) => formatList([
                        ['Ray Tracing', formatBool(c.technologies.ray_tracing)],
                        ['VRR', formatBool(c.technologies.vrr)],
                        [I18nModule.t('spec_label_backwards_compat') || 'Backwards Compat', c.technologies.backwards_compatibility],
                        [I18nModule.t('spec_label_capabilities'), c.technologies.other]
                    ])
                }
            ]
        }
    ];
}

function formatBool(val) {
    if (val === true) return I18nModule.t('spec_yes');
    if (val === false) return I18nModule.t('spec_no');
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

function getLocalizedField(obj, key) {
    if (!obj) return undefined;
    const langKey = `${key}_${I18nModule.lang}`;
    return obj[langKey] ?? obj[key];
}

function getLocalizedArray(obj, key) {
    if (!obj) return [];
    const langKey = `${key}_${I18nModule.lang}`;
    if (Array.isArray(obj[langKey])) return obj[langKey];
    if (Array.isArray(obj[key])) return obj[key];
    return [];
}

/**
 * Render specs sections into the page
 */
/** Render the specs accordion from section config */
function renderSpecs(consola) {
    const specsContainer = document.querySelector('.specs-section .container');
    if (!specsContainer) return;

    let html = `<h2 class="section-title">${I18nModule.t('console_specs_title')}</h2>`;

    getSpecSections(consola).forEach(section => {
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
    const pros = getLocalizedArray(consola, 'advantages');
    const cons = getLocalizedArray(consola, 'disadvantages');
    if (pros.length || cons.length) {
        html += `
            <div class="specs-group">
                <h3 class="specs-group-title">${I18nModule.t('console_verdict_title')}</h3>
                <div class="specs-grid">
                    ${pros.length ? `
                    <div class="spec-card">
                        <h4>${I18nModule.t('console_pros_title')}</h4>
                        <ul class="verdict-list pros-list">
                            ${pros.map(p => `<li class="pro-item">✓ ${p}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${cons.length ? `
                    <div class="spec-card">
                        <h4>${I18nModule.t('console_cons_title')}</h4>
                        <ul class="verdict-list cons-list">
                            ${cons.map(c => `<li class="con-item">✗ ${c}</li>`).join('')}
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
    const titleHtml = `<h2 class="section-title">${I18nModule.t('console_history_title')}</h2>`;

    let historyHtml = '';
    const historyText = getLocalizedField(consola, 'history') || '';
    if (historyText && String(historyText).trim()) {
        let text = String(historyText);

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

        const autoTitles = [
            I18nModule.t('history_auto_title_1'),
            I18nModule.t('history_auto_title_2'),
            I18nModule.t('history_auto_title_3'),
            I18nModule.t('history_auto_title_4'),
            I18nModule.t('history_auto_title_5')
        ];
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
    const titleText = getLocalizedField(consola, 'name') || I18nModule.t('hero_title');

    // Update title
    const h1 = document.querySelector('.console-hero-text h1');
    if (h1) {
        h1.textContent = titleText;

        // Add favorite heart button next to title
        const heartBtn = document.createElement('button');
        heartBtn.className = 'favorite-heart-btn';
        heartBtn.id = 'favorite-heart-btn';
        heartBtn.type = 'button';
        const favLabel = I18nModule.t('console_favorite_add');
        heartBtn.title = favLabel;
        heartBtn.innerHTML = '♡';
        heartBtn.setAttribute('aria-label', favLabel);
        h1.appendChild(heartBtn);
    }

    // Update meta info
    const metaContainer = document.querySelector('.console-hero-text .console-meta');
    if (metaContainer) {
        const manufacturer = getLocalizedField(consola, 'manufacturer') || '';
        const year = consola.release || '';
        const genLabel = I18nModule.t('console_generation_prefix');
        const generation = getLocalizedField(consola, 'generation') || '';

        metaContainer.innerHTML = `
            <span>${manufacturer}</span>
            <span>${year}</span>
            <span>${genLabel} ${generation}</span>
        `;
    }

    // Update image
    const img = document.querySelector('.console-hero-image img');
    if (img) {
        img.src = resolveImagePath(consola.image);
        img.alt = consola.name;
        
        // Set width and height to prevent layout shift
        const imageName = consola.image.split('/').pop();
        const dimensions = IMAGE_DIMENSIONS[imageName];
        if (dimensions) {
            img.width = dimensions.width;
            img.height = dimensions.height;
        }
    }

    // Update page title
    document.title = `${consola.name} — Console Notebook`;
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
    section.id = 'rating';
    section.innerHTML = `
        <div class="container">
            <h2 class="section-title">${I18nModule.t('console_rating_title')}</h2>
            <div class="rating-widget" id="rating-widget">
                <div class="rating-summary" id="rating-summary">
                    <div class="rating-stars-display" id="rating-stars-display"></div>
                    <div class="rating-avg" id="rating-avg">— / 5</div>
                    <div class="rating-count" id="rating-count">${I18nModule.t('console_rating_loading')}</div>
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
        const loginText = I18nModule.t('console_rating_login');
        const loginLink = I18nModule.t('console_rating_login_link');
        container.innerHTML = `<p class="rating-login-msg">${loginText} <a href="../login.html">${loginLink}</a></p>`;
        return;
    }

    const selected = currentRating || 0;
    container.innerHTML = `
        <p class="rating-your-label">${selected ? I18nModule.t('console_rating_your_label') : I18nModule.t('console_rating_rate_label')}</p>
        <div class="rating-interactive" id="rating-interactive">
            ${[1,2,3,4,5].map(i => `<button class="star-btn${i <= selected ? ' active' : ''}" data-value="${i}" title="${i} ${I18nModule.t('console_rating_star_label')}">★</button>`).join('')}
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
        if (countEl) countEl.textContent = 'Could not load rating.';
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
    if (countEl) countEl.textContent = count === 1 ? '1 rating' : `${count} ratings`;
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
        btn.title = I18nModule.t('console_favorite_login');
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
            btn.title = I18nModule.t('console_favorite_remove');
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
                btn.title = data.isFavorite ? I18nModule.t('console_favorite_remove') : I18nModule.t('console_favorite_add');
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

    currentConsole = consola;

    renderHero(currentConsole);
    renderHistory(currentConsole);
    renderSpecs(currentConsole);
    renderRatingWidget(consoleId);
    initFavoriteButton(consoleId);

    // Scroll to hash target if present (e.g. #rating)
    if (window.location.hash) {
        setTimeout(function () {
            var target = document.querySelector(window.location.hash);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }

    window.addEventListener('cn:language-changed', () => {
        if (!currentConsole) return;
        renderHero(currentConsole);
        renderHistory(currentConsole);
        renderSpecs(currentConsole);
    });

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
