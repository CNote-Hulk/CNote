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

/* ── Spec help-icon tooltip definitions ── */
const SPEC_TIPS = {
    spec_label_architecture:    'The processor design family — defines supported instructions, efficiency, and performance generation (e.g. Zen 2, RDNA 2).',
    spec_label_process:         'Manufacturing node in nanometres (nm). Smaller = more transistors in less space = faster and more power-efficient chip.',
    spec_label_cores:           'Number of independent processing threads. More cores allow the system to run more tasks simultaneously.',
    spec_label_clock:           'Operating frequency in GHz (billions of cycles per second). Higher frequency means instructions are processed faster.',
    spec_label_tdp:             'Thermal Design Power in Watts — how much heat the chip produces at maximum load. Also reflects total power draw.',
    spec_label_units:           'Compute Units or Shader Processors inside the GPU. More units = more parallel graphics calculations = better visual performance.',
    spec_label_tflops:          'Trillion Floating-Point Operations Per Second — a measure of raw GPU compute power. Higher = faster 3D rendering.',
    spec_label_capabilities:    'Extra hardware features and technologies supported by this chip.',
    spec_label_type:            'Memory or storage technology standard. e.g. GDDR6 = fast video RAM; NVMe SSD = solid-state drive with fast PCIe interface.',
    spec_label_capacity:        'Total amount in Gigabytes (GB). More memory allows the system to hold larger game worlds and assets without slowdowns.',
    spec_label_bus:             'Width of the memory data channel in bits. A wider bus transfers more data per clock cycle.',
    spec_label_bandwidth:       'Speed at which data moves between the CPU/GPU and memory, in GB/s. Higher bandwidth reduces bottlenecks.',
    spec_label_interface:       'How the storage device connects to the system. PCIe 4.0/5.0 is significantly faster than SATA III.',
    spec_label_speed:           'Sequential read/write throughput in GB/s. Directly affects load times and asset streaming speed.',
    spec_label_resolution:      'Number of pixels displayed (e.g. 4K = 3840×2160). More pixels = sharper, more detailed image.',
    spec_label_refresh:         'How many times per second the screen redraws the image (Hz). 60 Hz is smooth; 120 Hz is very smooth motion.',
    spec_label_hdr:             'High Dynamic Range — a wider range of brightness and colour for more realistic, vivid visuals.',
    spec_label_upscaling:       'Technology that renders at a lower resolution and intelligently scales up to the target resolution, saving GPU power.',
    spec_label_backwards_compat:'Ability to run games designed for older, previous-generation consoles.',
    spec_label_width:           'The left-to-right measurement of the console (in millimetres).',
    spec_label_height:          'The top-to-bottom measurement of the console (in millimetres).',
    spec_label_depth:           'The front-to-back measurement of the console (in millimetres).',
};

const FIXED_TIPS = {
    'Ray Tracing': 'Simulates how light physically bounces off surfaces in real time — produces realistic reflections, shadows, and global illumination.',
    'VRR':         'Variable Refresh Rate — the display dynamically syncs its refresh rate to the GPU\'s output, eliminating screen tearing and stutter.',
};

const HELP_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="8" cy="5.5" r="1"/><rect x="7.25" y="7.5" width="1.5" height="4" rx="0.75"/></svg>`;

function tipLabel(i18nKey) {
    const label = I18nModule.t(i18nKey);
    const tip = SPEC_TIPS[i18nKey];
    if (!tip) return label;
    return `${label}<button class="spec-help" type="button" aria-label="${tip}">${HELP_SVG}<span class="spec-tooltip">${tip}</span></button>`;
}

function fixedTip(label) {
    const tip = FIXED_TIPS[label];
    if (!tip) return label;
    return `${label}<button class="spec-help" type="button" aria-label="${tip}">${HELP_SVG}<span class="spec-tooltip">${tip}</span></button>`;
}

let _specTooltipsListenerAdded = false;
function initSpecTooltips() {
    document.querySelectorAll('.spec-help').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const wasOpen = btn.classList.contains('is-open');
            document.querySelectorAll('.spec-help.is-open').forEach(b => b.classList.remove('is-open'));
            if (!wasOpen) btn.classList.add('is-open');
        });
    });
    if (!_specTooltipsListenerAdded) {
        _specTooltipsListenerAdded = true;
        document.addEventListener('click', () => {
            document.querySelectorAll('.spec-help.is-open').forEach(b => b.classList.remove('is-open'));
        });
    }
}

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
                        [tipLabel('spec_label_architecture'), c.cpu.architecture],
                        [tipLabel('spec_label_process'), c.cpu.proces_nm],
                        [tipLabel('spec_label_cores'), c.cpu.cores],
                        [tipLabel('spec_label_clock'), c.cpu.frequency],
                        [tipLabel('spec_label_tdp'), c.cpu.tdp]
                    ])
                },
                {
                    title: I18nModule.t('spec_gpu_title'),
                    render: (c) => formatList([
                        [tipLabel('spec_label_architecture'), c.gpu.architecture],
                        [tipLabel('spec_label_units'), c.gpu.units],
                        [tipLabel('spec_label_clock'), c.gpu.frequency],
                        [tipLabel('spec_label_tflops'), c.gpu.tflops],
                        [tipLabel('spec_label_capabilities'), c.gpu.capabilities]
                    ])
                },
                {
                    title: I18nModule.t('spec_memory_title'),
                    render: (c) => formatList([
                        [tipLabel('spec_label_type'), c.memory.type],
                        [tipLabel('spec_label_capacity'), c.memory.capacity],
                        [tipLabel('spec_label_bus'), c.memory.bus],
                        [tipLabel('spec_label_bandwidth'), c.memory.bandwidth]
                    ])
                },
                {
                    title: I18nModule.t('spec_storage_title'),
                    render: (c) => formatList([
                        [tipLabel('spec_label_type'), c.storage.type],
                        [tipLabel('spec_label_interface'), c.storage.interface],
                        [tipLabel('spec_label_speed'), c.storage.speed]
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
                        [tipLabel('spec_label_resolution'), c.output_video.resolution],
                        [tipLabel('spec_label_refresh'), c.output_video.refresh],
                        [tipLabel('spec_label_hdr'), c.output_video.hdr],
                        [tipLabel('spec_label_upscaling'), c.output_video.upscaling]
                    ])
                },
                {
                    title: I18nModule.t('spec_tech_title'),
                    render: (c) => formatList([
                        [fixedTip('Ray Tracing'), formatBool(c.technologies.ray_tracing)],
                        [fixedTip('VRR'), formatBool(c.technologies.vrr)],
                        [tipLabel('spec_label_backwards_compat') || 'Backwards Compat', c.technologies.backwards_compatibility],
                        [I18nModule.t('spec_label_capabilities'), c.technologies.other]
                    ])
                },
                ...(consola.dimensions ? [{
                    title: I18nModule.t('spec_dimensions_title'),
                    render: (c) => formatDimensions(c.dimensions)
                }] : [])
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

function formatDimSingle(d) {
    const w = I18nModule.t('spec_label_width');
    const h = I18nModule.t('spec_label_height');
    const dp = I18nModule.t('spec_label_depth');
    return `<strong>${w}:</strong> ${d.width_mm} mm<br><strong>${h}:</strong> ${d.height_mm} mm<br><strong>${dp}:</strong> ${d.depth_mm} mm`;
}

function formatDimensions(dim) {
    if (!dim) return '<p>—</p>';
    if (dim.models && Array.isArray(dim.models)) {
        return dim.models.map(m => {
            const label = m.label ? `<em class="dim-model-label">${m.label}</em><br>` : '';
            return label + formatDimSingle(m);
        }).join('<hr class="dim-separator">');
    }
    return formatDimSingle(dim);
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

    let html = `<h2 class="section-title">${I18nModule.t('console_specs_title')}</h2>
    <p class="specs-hint">${I18nModule.t('specs_hint')}</p>`;

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
                        <h4 class="pros-title">${I18nModule.t('console_pros_title')}</h4>
                        <ul class="verdict-list pros-list">
                            ${pros.map(p => `<li class="pro-item">✓ ${p}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${cons.length ? `
                    <div class="spec-card">
                        <h4 class="cons-title">${I18nModule.t('console_cons_title')}</h4>
                        <ul class="verdict-list cons-list">
                            ${cons.map(c => `<li class="con-item">✗ ${c}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    specsContainer.innerHTML = html;
    initSpecTooltips();
}
/** Render the console history section
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

    // Models / hardware revisions
    let modelsEl = document.querySelector('.console-hero-text .console-models');
    if (!modelsEl && metaContainer) {
        modelsEl = document.createElement('div');
        modelsEl.className = 'console-models';
        metaContainer.after(modelsEl);
    }
    if (modelsEl) {
        if (consola.models && consola.models.length > 0) {
            modelsEl.innerHTML = consola.models
                .map(m => `<span class="console-model-item">${m.name}<em> ${m.year}</em></span>`)
                .join('');
            modelsEl.style.display = '';
        } else {
            modelsEl.style.display = 'none';
        }
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
        if (countEl) countEl.textContent = I18nModule.t('console_rating_error');
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
            window.dispatchEvent(new CustomEvent('cn:rating-submitted'));
        }
    } catch { /* silent */ }
}

function updateRatingDisplay(average, count) {
    const starsEl = document.getElementById('rating-stars-display');
    const avgEl = document.getElementById('rating-avg');
    const countEl = document.getElementById('rating-count');

    if (starsEl) starsEl.innerHTML = renderStars(average);
    if (avgEl) avgEl.textContent = `${average} / 5`;
    if (countEl) countEl.textContent = count === 1
        ? I18nModule.t('console_rating_count_one')
        : I18nModule.t('console_rating_count_many').replace('{count}', count);
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

    window.addEventListener('cn:language-changed', async () => {
        if (!consoleId) return;
        const refreshed = await getConsoleById(consoleId);
        if (refreshed) currentConsole = refreshed;
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
