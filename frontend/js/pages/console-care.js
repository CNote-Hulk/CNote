// Console Care page: renders + filters the "Identify Your Model" hardware directory.
// MODELS is intentionally flat data (no build step) — see INDEX.md before editing structure.

import { I18nModule } from '../modules/i18n.js';

const MODELS = [
    // ── Xbox ─────────────────────────────────
    // Microsoft never gave the original Xbox or the "fat" 360 an official
    // model number — v1.0-v1.6 and Xenon/Zephyr/Falcon/Jasper are the
    // community/repair-tech identification convention used industry-wide.
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.0', note: 'Separate USB controller daughterboard, GPU has its own fan (2001)' },
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.1', note: 'MCPX chip revised, GPU fan removed (2002)' },
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.2', note: 'New board layout, ATX-style power connector (2003)' },
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.3', note: 'A common early mod-chip trace disconnected (2003)' },
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.4', note: 'Video encoder switched to Focus (2003–04)' },
    { mfr: 'Xbox', console: 'Xbox (original)', code: 'v1.6', note: 'BIOS moved off the removable chip, new "Tuscany" board (2004–05)' },
    { mfr: 'Xbox', console: 'Xbox 360', code: 'Xenon', note: 'Launch board — 90nm CPU/GPU, no HDMI (2005)' },
    { mfr: 'Xbox', console: 'Xbox 360', code: 'Zephyr', note: 'HDMI output added (2007)' },
    { mfr: 'Xbox', console: 'Xbox 360', code: 'Falcon', note: '65nm CPU, lower power draw (2007)' },
    { mfr: 'Xbox', console: 'Xbox 360', code: 'Jasper', note: '65nm GPU too — smallest power supply of the "fat" generation (2008)' },
    { mfr: 'Xbox', console: 'Xbox 360 S', code: '1439', note: '"Trinity"/"Corona" — unified single-die CPU+GPU, official model numbers begin here (2010)' },
    { mfr: 'Xbox', console: 'Xbox 360 E', code: '1538', note: '"Winchester" board, closes off the RGH/JTAG exploit chain (2013)' },
    { mfr: 'Xbox', console: 'Xbox One', code: '1540', note: 'Launch board ("Durango"), mandatory Kinect at launch (2013)' },
    { mfr: 'Xbox', console: 'Xbox One S', code: '1681', note: 'About 40% smaller chassis, 4K/HDR10 upscaling, internal power supply (2016)' },
    { mfr: 'Xbox', console: 'Xbox One X', code: '1787', note: 'Native 4K rendering, vapor-chamber cooling (2017)' },
    { mfr: 'Xbox', console: 'Xbox Series X', code: '1882', note: 'Custom Zen 2 CPU + RDNA2 GPU, native 4K/120fps target (2020)' },
    { mfr: 'Xbox', console: 'Xbox Series S', code: '1883', note: 'Same CPU family, cut-down GPU, no disc drive (2020)' },

    // ── PlayStation ──────────────────────────
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-1000', note: 'Japan launch unit — the only PS1 model with an S-Video output (1994)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-1001', note: 'North America launch — S-Video port removed (1995)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-1002', note: 'PAL launch unit (1995)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-3000 / 3001 / 3002 / 3003', note: 'Cost-reduced board across Japan/NA/PAL/Asia (1995–96)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-5000 / 5001 / 5002 / 5003', note: 'CD drive relocated away from the power supply, fixing an overheating issue (1997)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-5903', note: 'Southeast Asia only — white case, Video CD playback support (rare)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-7000 / 7001 / 7002 / 7003', note: 'Further cost reduction; DualShock now standard pack-in (1998)' },
    { mfr: 'PlayStation', console: 'PS1', code: 'SCPH-9000 / 9001 / 9002 / 9003', note: 'Parallel/expansion port removed entirely — last "fat" PS1 board (1999)' },
    { mfr: 'PlayStation', console: 'PSone', code: 'SCPH-100 / 101 / 102 / 103', note: 'Redesign — about 45% smaller, external power brick, serial port removed (2000)' },
    { mfr: 'PlayStation', console: 'PS2', code: 'SCPH-10000', note: 'Japan launch — PCMCIA slot, no expansion bay yet (2000)' },
    { mfr: 'PlayStation', console: 'PS2', code: 'SCPH-18000', note: 'Japan, bundled DVD remote' },
    { mfr: 'PlayStation', console: 'PS2', code: 'SCPH-30000 / 30001', note: 'First with the expansion bay (HDD/Network Adaptor support) and i.LINK port (2000–01)' },
    { mfr: 'PlayStation', console: 'PS2', code: 'SCPH-39000 / 39001 / 39004', note: 'Last "fat" revision with the i.LINK (FireWire) port (2002)' },
    { mfr: 'PlayStation', console: 'PS2', code: 'SCPH-50000 / 50001 / 50004', note: 'i.LINK removed, IR remote receiver added — last "fat" PS2 ever made (2003)' },
    { mfr: 'PlayStation', console: 'PS2 Slim', code: 'SCPH-70000 / 70001 / 70004', note: 'Slimline debut — expansion bay and HDD support removed entirely, built-in Ethernet (2004)' },
    { mfr: 'PlayStation', console: 'PS2 Slim', code: 'SCPH-75000 / 75001 / 75004', note: 'Internal I/O processor redesign (2005)' },
    { mfr: 'PlayStation', console: 'PS2 Slim', code: 'SCPH-77000 / 77001 / 77004', note: 'Emotion Engine and Graphics Synthesizer merged onto a single chip (2006)' },
    { mfr: 'PlayStation', console: 'PS2 Slim', code: 'SCPH-79000 / 79001 / 79004', note: 'Lightest slim revision, roughly 600g (2007)' },
    { mfr: 'PlayStation', console: 'PS2 Slim', code: 'SCPH-90000 / 90001 / 90004', note: 'Final revision — internal power supply reintegrated (2007)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHA', note: '20GB — full hardware PS2 backward compatibility, real Emotion Engine + Graphics Synthesizer chips (2006)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHB', note: '20GB — same full-hardware-BC generation as CECHA (2006)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHC', note: '60GB — hybrid BC: real GS chip, Emotion Engine emulated in software (2006)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHE', note: '80GB — last PS3 model with any PS2 disc compatibility (2007)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHG / CECHH / CECHJ', note: '40GB — PS2 backward compatibility dropped entirely (2007)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHK / CECHL / CECHM', note: '80GB, no BC — DualShock 3 rumble restored (2008)' },
    { mfr: 'PlayStation', console: 'PS3', code: 'CECHP / CECHQ', note: '160GB — final "fat" chassis (2008)' },
    { mfr: 'PlayStation', console: 'PS3 Slim', code: 'CECH-2000 / CECH-2100', note: '120GB — smaller chassis, 45nm die shrink, motorized tray (2009)' },
    { mfr: 'PlayStation', console: 'PS3 Slim', code: 'CECH-2500 / CECH-3000', note: '160/320GB — further refinement (2010)' },
    { mfr: 'PlayStation', console: 'PS3 Super Slim', code: 'CECH-4000', note: 'Smallest PS3 chassis — sliding disc-cover door replaces the tray (2012)' },
    { mfr: 'PlayStation', console: 'PS3 Super Slim', code: 'CECH-4200 / CECH-4300', note: '500GB regional refreshes of the Super Slim board (2012–13)' },
    { mfr: 'PlayStation', console: 'PS4', code: 'CUH-1000', note: 'Launch model, 500GB, optical audio out present (2013)' },
    { mfr: 'PlayStation', console: 'PS4', code: 'CUH-1100', note: 'Updated Wi-Fi chip, same board generation as launch (2014)' },
    { mfr: 'PlayStation', console: 'PS4', code: 'CUH-1200', note: 'Lower power draw and weight, physical power/eject buttons (2015)' },
    { mfr: 'PlayStation', console: 'PS4 Slim', code: 'CUH-2000', note: 'About 40% smaller, optical audio port removed (2016)' },
    { mfr: 'PlayStation', console: 'PS4 Pro', code: 'CUH-7000', note: 'First 4K-capable PS4, more powerful GPU (2016)' },
    { mfr: 'PlayStation', console: 'PS4 Pro', code: 'CUH-7100', note: 'Larger stock HDD, quieter fan (2017)' },
    { mfr: 'PlayStation', console: 'PS4 Pro', code: 'CUH-7200', note: 'Smaller power connector, quieter and steadier power draw (2018)' },
    { mfr: 'PlayStation', console: 'PS5', code: 'CFI-1000', note: 'Launch chassis — disc 4.5kg / digital 3.9kg (2020)' },
    { mfr: 'PlayStation', console: 'PS5', code: 'CFI-1100', note: 'Smaller heatsink, no cooling loss, tool-free stand (2021)' },
    { mfr: 'PlayStation', console: 'PS5', code: 'CFI-1200', note: 'SoC die shrink — reduced power draw (2022)' },
    { mfr: 'PlayStation', console: 'PS5 Slim', code: 'CFI-2000', note: 'Smaller chassis, front USB-C, detachable disc drive module (2023)' },
    { mfr: 'PlayStation', console: 'PS5 Pro', code: 'CFI-7000', note: 'Digital only, 2TB SSD, roughly 45% faster GPU (2024)' },
    { mfr: 'PlayStation', console: 'PS5 Pro', code: 'CFI-7100', note: 'New APU stepping — quieter, lower power draw (2025)' },
    { mfr: 'PlayStation', console: 'PSP', code: 'PSP-1000', note: 'Original, 4.3" LCD, IrDA port (2004–05)' },
    { mfr: 'PlayStation', console: 'PSP', code: 'PSP-2000', note: '"Slim & Lite" — about 34% lighter, video-out added, USB charging (2007)' },
    { mfr: 'PlayStation', console: 'PSP', code: 'PSP-3000', note: 'Improved LCD, built-in microphone added (2008)' },
    { mfr: 'PlayStation', console: 'PSP', code: 'PSP Street (E1000)', note: 'Budget PAL-only model — no Wi-Fi, mono speaker (2011)' },
    { mfr: 'PlayStation', console: 'PSP', code: 'PSP Go (N1000)', note: 'Slide-out screen, no UMD drive, 16GB digital-only, Bluetooth (2009)' },
    { mfr: 'PlayStation', console: 'PS Vita', code: 'PCH-1000', note: '5" OLED screen, Wi-Fi and Wi-Fi+3G variants, no internal storage (2011–12)' },
    { mfr: 'PlayStation', console: 'PS Vita', code: 'PCH-1100', note: 'Japan-only Wi-Fi variant, matte black shell (2012)' },
    { mfr: 'PlayStation', console: 'PS Vita Slim', code: 'PCH-2000', note: 'OLED replaced with LCD, thinner/lighter, first with built-in flash storage (2013–14)' },

    // ── Nintendo ─────────────────────────────
    { mfr: 'Nintendo', console: 'Famicom', code: 'HVC-001', note: 'Original Japanese unit, RF-only, hardwired controllers (1983)' },
    { mfr: 'Nintendo', console: 'NES', code: 'NES-001', note: 'Western redesign, front-loading slot, 10NES lockout chip, detachable controllers (1985)' },
    { mfr: 'Nintendo', console: 'Famicom', code: 'HVC-101', note: '"AV Famicom" compact redesign, first with composite AV out (1993)' },
    { mfr: 'Nintendo', console: 'NES', code: 'NES-101', note: '"Top Loader" redesign, no lockout chip, styled like the SNES (1993)' },
    { mfr: 'Nintendo', console: 'Famicom', code: 'AN-500R / AN-500B', note: '"Twin Famicom" — Famicom + Disk System combined, first with composite AV out (1986)' },
    { mfr: 'Nintendo', console: 'Famicom', code: 'AN-505', note: '"Twin Famicom" 1987 revision, bundled turbo-fire controllers' },
    { mfr: 'Nintendo', console: 'Famicom', code: 'AN-510', note: '"Famicom Titler" — video-production unit with S-Video out and subtitle keyboard (1989)' },
    { mfr: 'Nintendo', console: 'Famicom', code: '14C-C1F / 19C-C1F', note: 'Sharp "My Computer TV" — CRT television with a built-in Famicom (1983)' },
    { mfr: 'Nintendo', console: 'NES', code: '19SV111', note: 'Sharp "Nintendo Television" — CRT TV with a built-in NES (1989)' },
    { mfr: 'Nintendo', console: 'Super Famicom', code: 'SHVC-001', note: 'Original Japanese unit (1990)' },
    { mfr: 'Nintendo', console: 'SNES', code: 'SNS-001', note: 'Western casing; 3 internal motherboard revisions without a model change, best RGB on the final "1-CHIP" board' },
    { mfr: 'Nintendo', console: 'Super Famicom', code: 'SHVC-101', note: '"Jr." compact redesign, Japan only (1998)' },
    { mfr: 'Nintendo', console: 'SNES', code: 'SNS-101', note: '"SNES Jr." compact redesign, RF/composite only, no S-Video (1997)' },
    { mfr: 'Nintendo', console: 'Nintendo 64', code: 'NUS-001', note: 'Single worldwide model number — no marketed hardware revision, unlike NES/SNES/GBA (1996)' },
    { mfr: 'Nintendo', console: 'GameCube', code: 'DOL-001', note: 'Has Digital AV Out (component/480p) and a second Serial Port (2001)' },
    { mfr: 'Nintendo', console: 'GameCube', code: 'DOL-101', note: 'Cost-reduced revision — Digital AV Out and Serial Port 2 removed, no 480p (2004)' },
    { mfr: 'Nintendo', console: 'Wii', code: 'RVL-001', note: 'Original — GameCube-compatible, component + RGB SCART support (2006)' },
    { mfr: 'Nintendo', console: 'Wii', code: 'RVL-101', note: '"Family Edition" — GameCube support removed entirely (2011)' },
    { mfr: 'Nintendo', console: 'Wii Mini', code: 'RVL-201', note: 'No Wi-Fi, no SD slot, no component/SCART, top-loading drive (2012, NA/Canada only)' },
    { mfr: 'Nintendo', console: 'Wii U', code: 'WUP-001', note: '"Basic" — white, 8GB (2012)' },
    { mfr: 'Nintendo', console: 'Wii U', code: 'WUP-101', note: '"Deluxe" — black, 32GB, includes GamePad stand + Nintendo Land (2012)' },
    { mfr: 'Nintendo', console: 'Switch', code: 'HAC-001', note: 'Original Tegra X1, roughly 2.5–6.5h battery (2017)' },
    { mfr: 'Nintendo', console: 'Switch', code: 'HAC-001(-01)', note: 'Die-shrunk "Mariko" chip, roughly 4.5–9h battery, same external model number (2019)' },
    { mfr: 'Nintendo', console: 'Switch Lite', code: 'HDH-001', note: 'Handheld-only, no detachable Joy-Con, no TV output (2019)' },
    { mfr: 'Nintendo', console: 'Switch OLED', code: 'HEG-001', note: '7" OLED screen, wired-LAN dock port, 64GB storage (2021)' },
    { mfr: 'Nintendo', console: 'Switch 2', code: 'BEE-001', note: 'From FCC filings — not yet confirmed on an official Nintendo spec sheet' },
    { mfr: 'Nintendo', console: 'Game Boy', code: 'DMG-01', note: 'Original, 4-shade monochrome, no backlight (1989)' },
    { mfr: 'Nintendo', console: 'Game Boy Pocket', code: 'MGB-001', note: 'Smaller, higher-contrast screen (1996)' },
    { mfr: 'Nintendo', console: 'Game Boy Light', code: 'MGB-101', note: 'First built-in backlight — Japan only (1998)' },
    { mfr: 'Nintendo', console: 'Game Boy Color', code: 'CGB-001', note: 'Color screen, backward-compatible with original Game Boy carts (1998)' },
    { mfr: 'Nintendo', console: 'Game Boy Advance', code: 'AGB-001', note: '32-bit hardware, shoulder buttons, non-backlit screen (2001)' },
    { mfr: 'Nintendo', console: 'Game Boy Advance SP', code: 'AGS-001', note: 'Clamshell, rechargeable battery, front-lit screen (2003)' },
    { mfr: 'Nintendo', console: 'Game Boy Advance SP', code: 'AGS-101', note: 'True backlit screen revision, never officially released in Japan (2005)' },
    { mfr: 'Nintendo', console: 'Game Boy Micro', code: 'OXY-001', note: 'Tiny metal unibody, backlit, no Game Boy/Color compatibility (2005)' },
    { mfr: 'Nintendo', console: 'Nintendo DS', code: 'NTR-001', note: 'Dual screens, GBA slot for backward compatibility (2004)' },
    { mfr: 'Nintendo', console: 'Nintendo DS Lite', code: 'USG-001', note: 'Slimmer, adjustable-brightness backlight (2006)' },
    { mfr: 'Nintendo', console: 'Nintendo DSi', code: 'TWL-001', note: 'GBA slot removed, two cameras added, DSiWare store (2008)' },
    { mfr: 'Nintendo', console: 'Nintendo DSi XL', code: 'UTL-001', note: 'Same as DSi with much larger screens (2009)' },
    { mfr: 'Nintendo', console: 'Nintendo 3DS', code: 'CTR-001', note: 'Glasses-free 3D via parallax barrier, DS/DSi backward-compatible (2011)' },
    { mfr: 'Nintendo', console: 'Nintendo 3DS XL', code: 'SPR-001', note: 'Roughly 90% larger screens than CTR-001 (2012)' },
    { mfr: 'Nintendo', console: 'Nintendo 2DS', code: 'FTR-001', note: 'Non-foldable slab, 3D effect removed entirely (2013)' },
    { mfr: 'Nintendo', console: 'New Nintendo 3DS', code: 'KTR-001', note: 'Adds C-Stick, ZL/ZR, face-tracking 3D, faster CPU (2014)' },
    { mfr: 'Nintendo', console: 'New Nintendo 3DS XL', code: 'RED-001', note: 'New Nintendo 3DS internals in the larger XL shell (2014)' },
    { mfr: 'Nintendo', console: 'New Nintendo 2DS XL', code: 'JAN-001', note: 'New Nintendo 3DS internals, foldable, 3D disabled like the 2DS (2017)' },
];

const grid = document.getElementById('care-directory-grid');
const searchInput = document.getElementById('care-directory-search');
const tabs = document.querySelectorAll('.care-tab');
const countEl = document.getElementById('care-directory-count');
const emptyEl = document.getElementById('care-directory-empty');

let activeManufacturer = 'all';

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function render() {
    const query = (searchInput?.value || '').trim().toLowerCase();

    const filtered = MODELS.filter(m => {
        if (activeManufacturer !== 'all' && m.mfr !== activeManufacturer) return false;
        if (!query) return true;
        return (
            m.code.toLowerCase().includes(query) ||
            m.console.toLowerCase().includes(query) ||
            (m.note || '').toLowerCase().includes(query)
        );
    });

    if (countEl) countEl.textContent = String(filtered.length);
    if (emptyEl) emptyEl.classList.toggle('is-visible', filtered.length === 0);
    if (!grid) return;

    const groups = new Map();
    filtered.forEach(m => {
        if (!groups.has(m.console)) groups.set(m.console, []);
        groups.get(m.console).push(m);
    });

    grid.innerHTML = '';
    groups.forEach((models, consoleName) => {
        const group = document.createElement('div');
        group.className = 'care-group';

        const title = document.createElement('h3');
        title.className = 'care-group__title';
        title.textContent = consoleName;
        group.appendChild(title);

        const gridEl = document.createElement('div');
        gridEl.className = 'care-group__grid';

        models.forEach(m => {
            const plate = document.createElement('div');
            plate.className = 'model-plate';
            plate.innerHTML = `
                <span class="model-plate__label">${escapeHtml(I18nModule.t('care_plate_label'))}</span>
                <span class="model-plate__code">${escapeHtml(m.code)}</span>
                <div class="model-plate__meta"><span class="model-plate__console">${escapeHtml(m.console)}</span>${m.note ? ' — ' + escapeHtml(m.note) : ''}</div>
            `;
            gridEl.appendChild(plate);
        });

        group.appendChild(gridEl);
        grid.appendChild(group);
    });
}

searchInput?.addEventListener('input', render);

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        activeManufacturer = tab.dataset.mfr;
        render();
    });
});

render();
window.addEventListener('cn:language-changed', render);
