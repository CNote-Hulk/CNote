const CONSENT_KEY = 'cn_cookie_consent';

function loadGA() {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-Q07J9XCMJP';
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-Q07J9XCMJP');
}

function loadYouTubeEmbeds() {
  document.querySelectorAll('.yt-placeholder').forEach(placeholder => {
    const videoId = placeholder.dataset.videoId;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.classList.add('yt-iframe');
    iframe.dataset.videoId = videoId;

    iframe.addEventListener('error', () => showYtFallback(iframe, videoId));

    placeholder.replaceWith(iframe);
  });

  // YouTube sends error 153 (embedding disabled) via postMessage — 'error' event won't fire
  window.addEventListener('message', function onYtMessage(e) {
    if (e.origin !== 'https://www.youtube-nocookie.com' && e.origin !== 'https://www.youtube.com') return;
    try {
      const data = JSON.parse(e.data);
      if (data.event === 'error') {
        document.querySelectorAll('iframe.yt-iframe').forEach(iframe => {
          if (iframe.contentWindow === e.source) {
            showYtFallback(iframe, iframe.dataset.videoId);
          }
        });
      }
    } catch (_) {}
  });
}

function showYtFallback(placeholder, videoId) {
  const fallback = document.createElement('div');
  fallback.className = 'yt-fallback';
  fallback.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <p>Videoclipul nu poate fi afișat direct.</p>
    <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer" class="yt-fallback__link">Vizionează pe YouTube →</a>
  `;
  placeholder.replaceWith(fallback);
}

function acceptAll() {
  localStorage.setItem(CONSENT_KEY, 'all');
  hideModal();
  loadGA();
  loadYouTubeEmbeds();
}

function acceptEssential() {
  localStorage.setItem(CONSENT_KEY, 'essential');
  hideModal();
}

function hideModal() {
  const overlay = document.getElementById('cookie-overlay');
  if (overlay) overlay.remove();
}

function initConsent() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'all') { loadGA(); loadYouTubeEmbeds(); return; }
  if (consent === 'essential') return;

  const overlay = document.createElement('div');
  overlay.id = 'cookie-overlay';

  const modal = document.createElement('div');
  modal.id = 'cookie-modal';
  modal.innerHTML = `
    <span class="cookie-modal-icon">🍪</span>
    <p class="cookie-modal-title">Preferințe cookies</p>
    <p class="cookie-modal-body">Folosim cookies pentru analytics (Google Analytics) și videoclipuri (YouTube). Cookies esențiale sunt întotdeauna active.</p>
    <div class="cookie-modal-actions">
      <button class="cookie-btn-accept" onclick="acceptAll()">Acceptă toate</button>
      <button class="cookie-btn-essential" onclick="acceptEssential()">Doar esențiale</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

window.acceptAll = acceptAll;
window.acceptEssential = acceptEssential;
document.addEventListener('DOMContentLoaded', initConsent);
