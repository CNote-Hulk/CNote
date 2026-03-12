/**
 * Custom Video Player — YouTube IFrame API
 * Minimal iPhone-inspired design with warm cinematic accents
 * Full controls: play/pause, skip ±10s, progress seek, volume
 */
(function () {
    'use strict';

    var container = document.querySelector('.custom-player');
    if (!container) return;

    var videoId = container.getAttribute('data-video-id');
    if (!videoId) return;

    /* ── Thumbnail while API loads ── */
    container.style.backgroundImage =
        'url(https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg)';

    /* ── DOM refs ── */
    var overlay      = container.querySelector('.player-overlay');
    var ctrlBar      = container.querySelector('.player-controls');
    var btnPlay      = container.querySelector('.ctrl-play-pause');
    var btnSkipBack  = container.querySelector('.ctrl-skip-back');
    var btnSkipFwd   = container.querySelector('.ctrl-skip-fwd');
    var progressWrap = container.querySelector('.ctrl-progress');
    var progressFill = container.querySelector('.ctrl-progress-fill');
    var progressBuf  = container.querySelector('.ctrl-progress-buffer');
    var timeEl       = container.querySelector('.ctrl-time');
    var volBtn       = container.querySelector('.ctrl-vol-btn');
    var volSlider    = container.querySelector('.ctrl-vol-slider');
    var volFill      = container.querySelector('.ctrl-vol-fill');
    var btnFullscreen= container.querySelector('.ctrl-fullscreen');

    var player    = null;
    var rafId     = null;
    var isReady   = false;
    var hideTimer = null;
    var lastVol   = 80;

    var orientationHint = document.createElement('div');
    orientationHint.className = 'fs-orientation-hint';
    orientationHint.innerHTML = '<span class="fs-orientation-icon">↻</span><span>Rotește telefonul pentru landscape</span>';
    container.appendChild(orientationHint);

    function isMobileLike() {
        return window.matchMedia('(pointer: coarse)').matches;
    }

    function isPortrait() {
        return window.matchMedia('(orientation: portrait)').matches || window.innerHeight > window.innerWidth;
    }

    function syncOrientationHint() {
        var show = isFs() && isMobileLike() && isPortrait();
        container.classList.toggle('show-orientation-hint', show);
    }

    function isFs() {
        return document.fullscreenElement === container || document.webkitFullscreenElement === container;
    }

    function syncFsUI() {
        container.classList.toggle('is-fullscreen', isFs());
        syncOrientationHint();
    }

    function enterFs() {
        if (container.requestFullscreen) return container.requestFullscreen();
        if (container.webkitRequestFullscreen) return container.webkitRequestFullscreen();
    }

    function exitFs() {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    }

    function toggleFs() {
        if (isFs()) {
            exitFs();
        } else {
            enterFs();
        }
    }

    /* ══════════════════════════════════════
       YouTube IFrame API
       ══════════════════════════════════════ */
    function boot() {
        player = new YT.Player(container.querySelector('.yt-placeholder'), {
            videoId: videoId,
            playerVars: {
                controls:       0,
                modestbranding: 1,
                rel:            0,
                showinfo:       0,
                iv_load_policy: 3,
                fs:             0,
                disablekb:      1,
                playsinline:    1,
                cc_load_policy: 0,
                origin:         location.origin
            },
            events: { onReady: onReady, onStateChange: onState }
        });
    }

    function onReady() {
        isReady = true;
        container.classList.add('ready');
        player.setVolume(lastVol);
        updateVolUI(lastVol);
    }

    /* Load API once globally */
    if (window.YT && window.YT.Player) {
        boot();
    } else {
        var prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            if (prev) prev();
            boot();
        };
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            var s = document.createElement('script');
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        }
    }

    /* ══════════════════════════════════════
       State machine
       ══════════════════════════════════════ */
    function onState(e) {
        var s = e.data;
        if (s === YT.PlayerState.PLAYING)  { setPlaying(true);  startTick(); }
        if (s === YT.PlayerState.PAUSED)   { setPlaying(false); stopTick(); }
        if (s === YT.PlayerState.ENDED)    { setPlaying(false); stopTick(); progressFill.style.width = '100%'; }
        if (s === YT.PlayerState.BUFFERING){ container.classList.add('buffering'); }
        if (s !== YT.PlayerState.BUFFERING){ container.classList.remove('buffering'); }
    }

    function togglePlay() {
        if (!player || !isReady) return;
        var s = player.getPlayerState();
        s === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
    }

    function setPlaying(on) {
        container.classList.toggle('playing', on);
        container.classList.toggle('paused', !on);
        if (on) {
            overlay.classList.add('hidden');
            scheduleHide();
        } else {
            overlay.classList.remove('hidden');
            ctrlBar.classList.add('visible');
        }
    }

    /* ══════════════════════════════════════
       Skip ±10 s
       ══════════════════════════════════════ */
    function skip(delta) {
        if (!player || !isReady) return;
        var t = player.getCurrentTime();
        var d = player.getDuration();
        player.seekTo(Math.max(0, Math.min(d, t + delta)), true);
    }

    /* ══════════════════════════════════════
       Progress tick (requestAnimationFrame)
       ══════════════════════════════════════ */
    function startTick() {
        (function tick() {
            if (!player) return;
            var t = player.getCurrentTime() || 0;
            var d = player.getDuration()    || 0;
            if (d > 0) {
                progressFill.style.width = ((t / d) * 100) + '%';
                timeEl.textContent = fmt(t) + ' / ' + fmt(d);
            }
            /* buffer indicator */
            if (progressBuf && d > 0) {
                var buf = player.getVideoLoadedFraction() || 0;
                progressBuf.style.width = (buf * 100) + '%';
            }
            rafId = requestAnimationFrame(tick);
        })();
    }
    function stopTick() { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }

    function fmt(s) {
        var h = Math.floor(s / 3600);
        var m = Math.floor((s % 3600) / 60);
        var sec = Math.floor(s % 60);
        var out = m + ':' + (sec < 10 ? '0' : '') + sec;
        if (h) out = h + ':' + (m < 10 ? '0' : '') + out;
        return out;
    }

    /* ══════════════════════════════════════
       Progress seek (click + drag)
       ══════════════════════════════════════ */
    function seekFromX(clientX) {
        if (!player || !isReady) return;
        var r   = progressWrap.getBoundingClientRect();
        var pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        player.seekTo(pct * player.getDuration(), true);
        progressFill.style.width = (pct * 100) + '%';
    }

    var draggingProgress = false;
    progressWrap.addEventListener('mousedown', function (e) { e.stopPropagation(); draggingProgress = true; seekFromX(e.clientX); });
    document.addEventListener('mousemove', function (e) { if (draggingProgress) seekFromX(e.clientX); });
    document.addEventListener('mouseup', function () { draggingProgress = false; });

    progressWrap.addEventListener('touchstart', function (e) { draggingProgress = true; seekFromX(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (draggingProgress) seekFromX(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchend', function () { draggingProgress = false; });

    /* ══════════════════════════════════════
       Volume (iPhone-style slider)
       ══════════════════════════════════════ */
    function updateVolUI(v) {
        volFill.style.width = v + '%';
        volBtn.classList.toggle('muted', v === 0);
    }

    function volFromX(clientX) {
        if (!player || !isReady) return;
        var r   = volSlider.getBoundingClientRect();
        var pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
        pct = Math.round(pct);
        player.setVolume(pct);
        lastVol = pct || lastVol;
        updateVolUI(pct);
    }

    var draggingVol = false;
    volSlider.addEventListener('mousedown', function (e) { e.stopPropagation(); draggingVol = true; volFromX(e.clientX); });
    document.addEventListener('mousemove', function (e) { if (draggingVol) volFromX(e.clientX); });
    document.addEventListener('mouseup', function () { draggingVol = false; });

    volSlider.addEventListener('touchstart', function (e) { draggingVol = true; volFromX(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchmove', function (e) { if (draggingVol) volFromX(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('touchend', function () { draggingVol = false; });

    /* Mute toggle */
    volBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!player || !isReady) return;
        if (player.getVolume() > 0) {
            lastVol = player.getVolume();
            player.setVolume(0);
            updateVolUI(0);
        } else {
            player.setVolume(lastVol || 50);
            updateVolUI(lastVol || 50);
        }
    });

    /* ══════════════════════════════════════
       Event wiring
       ══════════════════════════════════════ */
    overlay.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); togglePlay(); });
    btnPlay.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });
    btnSkipBack.addEventListener('click', function (e) { e.stopPropagation(); skip(-10); showControls(); });
    btnSkipFwd.addEventListener('click', function (e) { e.stopPropagation(); skip(10);  showControls(); });
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleFs();
            showControls();
        });
    }

    /* Click/tap on player area toggles play */
    container.addEventListener('click', function (e) {
        if (e.target.closest('.player-controls') || e.target.closest('.player-overlay')) return;
        togglePlay();
    });

    /* ══════════════════════════════════════
       Auto-hide controls
       ══════════════════════════════════════ */
    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
            if (container.classList.contains('playing')) ctrlBar.classList.remove('visible');
        }, 3000);
    }
    function showControls() {
        ctrlBar.classList.add('visible');
        scheduleHide();
    }

    container.addEventListener('mousemove', showControls);
    container.addEventListener('mouseleave', function () {
        if (container.classList.contains('playing')) {
            clearTimeout(hideTimer);
            ctrlBar.classList.remove('visible');
        }
    });
    container.addEventListener('touchstart', showControls, { passive: true });

    document.addEventListener('fullscreenchange', syncFsUI);
    document.addEventListener('webkitfullscreenchange', syncFsUI);
    window.addEventListener('resize', syncOrientationHint);
    window.addEventListener('orientationchange', syncOrientationHint);

    /* Keyboard shortcuts when player focused */
    container.setAttribute('tabindex', '0');
    container.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); skip(-10); showControls(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); skip(10);  showControls(); }
        if (e.key === 'ArrowUp')    { e.preventDefault(); var v = Math.min(100, (player ? player.getVolume() : 80) + 10); if (player) player.setVolume(v); updateVolUI(v); }
        if (e.key === 'ArrowDown')  { e.preventDefault(); var v2 = Math.max(0, (player ? player.getVolume() : 80) - 10); if (player) player.setVolume(v2); updateVolUI(v2); }
        if (e.key === 'm')          { volBtn.click(); }
        if (e.key === 'f')          { e.preventDefault(); toggleFs(); }
    });
})();
