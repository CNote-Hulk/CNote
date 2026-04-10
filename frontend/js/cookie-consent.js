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
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.classList.add('yt-iframe');
    placeholder.replaceWith(iframe);
  });
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
