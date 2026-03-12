/**
 * Console Detail Page - Dynamic content loader
 * Loads console specs from consoles.json and renders them into the page
 */

import { getConsoleById, getConsoleIdFromUrl, resolveImagePath } from '../data/data-loader.js';
import { AchievementsModule } from '../modules/achievements.js';

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
function renderHero(consola) {
    // Update title
    const h1 = document.querySelector('.console-hero-text h1');
    if (h1) h1.textContent = consola.nume;

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
 * Initialize the console detail page
 */
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
