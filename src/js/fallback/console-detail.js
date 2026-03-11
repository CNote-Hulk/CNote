/**
 * Console Detail Fallback Script
 * Works without ES modules (file:// protocol)
 * Tries to fetch consoles.json and render the page dynamically
 */
(function () {
    'use strict';

    function cleanupConsolePageChrome() {
        var homeLink = document.querySelector('.nav-links a[href="../index.html"]');
        if (homeLink && homeLink.parentElement) {
            homeLink.parentElement.remove();
        }

        var githubLink = document.querySelector('.footer-right a[href*="github.com"]');
        if (githubLink && githubLink.parentElement) {
            githubLink.parentElement.removeChild(githubLink);
        }
    }

    // Image dimensions mapping - prevents layout shift during load
    var IMAGE_DIMENSIONS = {};

    /**
     * Load image dimensions from JSON
     */
    function loadImageDimensions() {
        var path = '../../../js/data/image-dimensions.json';
        var loadFn = (window.location.protocol === 'file:')
            ? loadJsonWithXhr(path)
            : fetch(path).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            });
        return loadFn
            .then(function (data) {
                IMAGE_DIMENSIONS = data;
                return data;
            })
            .catch(function (err) {
                console.warn('Failed to load image dimensions:', err.message);
                return {};
            });
    }

    function loadJsonWithXhr(path) {
        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', path, true);
                xhr.overrideMimeType('application/json');
                xhr.onload = function () {
                    if (xhr.status === 200 || xhr.status === 0) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(new Error('HTTP ' + xhr.status));
                    }
                };
                xhr.onerror = function () { reject(new Error('XHR error')); };
                xhr.send();
            } catch (err) {
                reject(err);
            }
        });
    }


    // Hamburger menu
    var hamburger = document.querySelector('.hamburger');
    var navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function () {
            var expanded = hamburger.getAttribute('aria-expanded') === 'true';
            hamburger.setAttribute('aria-expanded', String(!expanded));
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Determine console ID from filename
    function getConsoleId() {
        var params = new URLSearchParams(window.location.search);
        var idParam = params.get('id');
        if (idParam) return idParam;

        var path = window.location.pathname;
        var parts = path.replace(/\\/g, '/').split('/');
        var filename = parts[parts.length - 1];
        if (filename && filename.indexOf('.html') !== -1) {
            return filename.replace('.html', '');
        }
        return null;
    }

    // Format a boolean value
    function formatBool(val) {
        if (val === true) return 'Da';
        if (val === false) return 'Nu';
        return val || 'N/A';
    }

    // Check if value is meaningful
    function isNA(val) {
        return !val || val === 'N/A' || val === 'n/a';
    }

    // Format label-value pairs into HTML
    function formatList(pairs) {
        var filtered = pairs.filter(function (p) { return !isNA(p[1]); });
        if (filtered.length === 0) return '<p>\u2014</p>';
        return filtered.map(function (p) {
            return '<strong>' + p[0] + ':</strong> ' + p[1];
        }).join('<br>');
    }

    // Spec sections definition
    var SPEC_SECTIONS = [
        {
            group: 'Principale',
            cards: [
                {
                    title: 'Procesare (CPU)',
                    keys: function (c) {
                        return [
                            ['Arhitectur\u0103', c.cpu.arhitectura],
                            ['Proces', c.cpu.proces_nm],
                            ['Nuclee', c.cpu.nuclee],
                            ['Frecven\u021B\u0103', c.cpu.frecventa],
                            ['TDP', c.cpu.tdp]
                        ];
                    }
                },
                {
                    title: 'Grafic\u0103 (GPU)',
                    keys: function (c) {
                        return [
                            ['Arhitectur\u0103', c.gpu.arhitectura],
                            ['Unit\u0103\u021Bi', c.gpu.unitati],
                            ['Frecven\u021B\u0103', c.gpu.frecventa],
                            ['TFLOPS', c.gpu.tflops],
                            ['Capabilit\u0103\u021Bi', c.gpu.capabilitati]
                        ];
                    }
                },
                {
                    title: 'Memorie',
                    keys: function (c) {
                        return [
                            ['Tip', c.memorie.tip],
                            ['Capacitate', c.memorie.capacitate],
                            ['Magistral\u0103', c.memorie.magistrala],
                            ['Bandwidth', c.memorie.bandwidth]
                        ];
                    }
                },
                {
                    title: 'Stocare',
                    keys: function (c) {
                        return [
                            ['Tip', c.stocare.tip],
                            ['Interfa\u021B\u0103', c.stocare.interfata],
                            ['Vitez\u0103', c.stocare.viteza]
                        ];
                    }
                }
            ]
        },
        {
            group: 'Secundare',
            cards: [
                {
                    title: 'Output Video',
                    keys: function (c) {
                        return [
                            ['Rezolu\u021Bie', c.output_video.rezolutie],
                            ['Refresh', c.output_video.refresh],
                            ['HDR', c.output_video.hdr],
                            ['Upscaling', c.output_video.upscaling]
                        ];
                    }
                },
                {
                    title: 'Tehnologii',
                    keys: function (c) {
                        return [
                            ['Ray Tracing', formatBool(c.tehnologii.ray_tracing)],
                            ['VRR', formatBool(c.tehnologii.vrr)],
                            ['Backwards Compat', c.tehnologii.backwards_compatibility],
                            ['Altele', c.tehnologii.altele]
                        ];
                    }
                }
            ]
        }
    ];

    function renderHistory(consola) {
        var specsSection = document.querySelector('.specs-section');
        if (!specsSection) return;

        var historySection = document.querySelector('.history-section');
        if (!historySection) {
            historySection = document.createElement('section');
            historySection.className = 'section history-section';
            var inner = document.createElement('div');
            inner.className = 'container';
            historySection.appendChild(inner);
            specsSection.parentNode.insertBefore(historySection, specsSection);
        }

        var container = historySection.querySelector('.container');
        var titleHtml = '<h2 class="section-title">Istorie</h2>';
        var historyHtml = '';

        if (consola.istorie && String(consola.istorie).trim()) {
            var text = String(consola.istorie);
            text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n');
            text = text.replace(/<br\s*\/?>/gi, '\n');

            var blocks = text.split('\n\n').map(function (b) { return b.trim(); }).filter(Boolean);
            var sections = [];
            var currentSection = null;

            function pushCurrent() {
                if (!currentSection) return;
                if (currentSection.heading || currentSection.paragraphs.length) {
                    sections.push(currentSection);
                }
                currentSection = null;
            }

            blocks.forEach(function (block) {
                var lines = block.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
                var trimmed = block.trim();

                if (lines.length > 1) {
                    var firstLine = lines[0];
                    var firstLineStrong = firstLine.match(/^<strong>(.*?)<\/strong>$/i);
                    var isHeadingLine = firstLineStrong || (firstLine.length < 80 && firstLine.indexOf('.') === -1 && firstLine.indexOf('<') === -1 && /^[A-Z\u0102\u00C2\u00CE\u0218\u021A]/.test(firstLine));

                    if (isHeadingLine) {
                        pushCurrent();
                        var heading = (firstLineStrong ? firstLineStrong[1] : firstLine).trim();
                        var content = lines.slice(1).join('\n').trim();
                        currentSection = { heading: heading, paragraphs: [] };
                        if (content) currentSection.paragraphs.push(content);
                        return;
                    }
                }

                var strongMatch = trimmed.match(/^<strong>(.*?)<\/strong>$/i);
                if (strongMatch) {
                    pushCurrent();
                    currentSection = { heading: strongMatch[1].trim(), paragraphs: [] };
                    return;
                }

                if (trimmed.length < 80 && trimmed.indexOf('.') === -1 && trimmed.indexOf('<') === -1 && /^[A-Z\u0102\u00C2\u00CE\u0218\u021A]/.test(trimmed)) {
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

            var autoTitles = ['Context', 'Detalii', 'Evoluție', 'Impact', 'Moștenire'];
            var autoIndex = 0;

            var rendered = sections.map(function (section) {
                var heading = section.heading;
                if (!heading) {
                    heading = autoTitles[Math.min(autoIndex, autoTitles.length - 1)];
                    autoIndex += 1;
                }

                var paragraphs = section.paragraphs.map(function (paragraph) {
                    return '<p>' + paragraph.replace(/\n/g, '<br>') + '</p>';
                }).join('');

                return '<h3 class="history-heading">' + heading + '</h3>' + paragraphs;
            }).join('');

            historyHtml = '<div class="history-content">' + rendered + '</div>';
        } else {
            historyHtml = '<div class="history-content"></div>';
        }

        container.innerHTML = titleHtml + historyHtml;
    }

    function renderHero(consola) {

        var meta = document.querySelector('.console-hero-text .console-meta');
        if (meta) {
            meta.innerHTML =
                '<span>' + consola.producator + '</span>' +
                '<span>' + consola.lansare + '</span>' +
                '<span>Genera\u021Bia ' + consola.generatie + '</span>';
        }

        var img = document.querySelector('.console-hero-image img');
        if (img) {
            img.src = '../../../' + consola.imagine;
            img.alt = consola.nume;
            
            // Set width and height to prevent layout shift
            var imageName = consola.imagine.split('/').pop();
            var dimensions = IMAGE_DIMENSIONS[imageName];
            if (dimensions) {
                img.width = dimensions.width;
                img.height = dimensions.height;
            }
        }

        document.title = consola.nume + ' \u2014 Console Notebook';
    }

    function renderSpecs(consola) {
        var container = document.querySelector('.specs-section .container');
        if (!container) return;

        var html = '<h2 class="section-title">Specifica\u021Bii Cheie</h2>';

        SPEC_SECTIONS.forEach(function (section) {
            html += '<div class="specs-group">';
            html += '<h3 class="specs-group-title">' + section.group + '</h3>';
            html += '<div class="specs-grid">';

            section.cards.forEach(function (card) {
                html += '<div class="spec-card">';
                html += '<h4>' + card.title + '</h4>';
                html += '<p>' + formatList(card.keys(consola)) + '</p>';
                html += '</div>';
            });

            html += '</div></div>';
        });

        // Verdict
        var hasAvantaje = consola.avantaje && consola.avantaje.length > 0;
        var hasDezavantaje = consola.dezavantaje && consola.dezavantaje.length > 0;

        if (hasAvantaje || hasDezavantaje) {
            html += '<div class="specs-group">';
            html += '<h3 class="specs-group-title">Verdict</h3>';
            html += '<div class="specs-grid">';

            if (hasAvantaje) {
                html += '<div class="spec-card"><h4>Avantaje</h4>';
                html += '<ul class="verdict-list pros-list">';
                consola.avantaje.forEach(function (p) {
                    html += '<li class="pro-item">\u2713 ' + p + '</li>';
                });
                html += '</ul></div>';
            }

            if (hasDezavantaje) {
                html += '<div class="spec-card"><h4>Dezavantaje</h4>';
                html += '<ul class="verdict-list cons-list">';
                consola.dezavantaje.forEach(function (c) {
                    html += '<li class="con-item">\u2717 ' + c + '</li>';
                });
                html += '</ul></div>';
            }

            html += '</div></div>';
        }

        container.innerHTML = html;
    }

    function showError(msg) {
        var container = document.querySelector('.specs-section .container');
        if (container) {
            container.innerHTML =
                '<h2 class="section-title">Eroare</h2>' +
                '<p class="console-loading">' + msg + '</p>';
        }
    }

    // Main init
    function init() {
        cleanupConsolePageChrome();

        var consoleId = getConsoleId();
        if (!consoleId) {
            showError('Nu s-a putut determina consola din URL.');
            return;
        }

        // Load image dimensions and console data
        Promise.all([
            loadImageDimensions(),
            (function () {
                var path = '../../../js/data/consoles.json';
                if (window.location.protocol === 'file:') {
                    return loadJsonWithXhr(path);
                }
                return fetch(path).then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                });
            })()
        ])
            .then(function (results) {
                var data = results[1];
                var consola = null;
                for (var i = 0; i < data.length; i++) {
                    if (data[i].id === consoleId) {
                        consola = data[i];
                        break;
                    }
                }
                if (!consola) {
                    showError('Consola "' + consoleId + '" nu a fost găsită în baza de date.');
                    return;
                }
                renderHero(consola);
                renderHistory(consola);
                renderSpecs(consola);
            })
            .catch(function (err) {
                console.warn('Fallback: fetch failed', err);
                showError('Nu s-au putut încărca datele. Deschideți pagina printr-un server HTTP.');
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
