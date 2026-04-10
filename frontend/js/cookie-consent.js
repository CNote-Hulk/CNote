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
  hideBanner();
  loadGA();
  loadYouTubeEmbeds();
}

function acceptEssential() {
  localStorage.setItem(CONSENT_KEY, 'essential');
  hideBanner();
}

function hideBanner() {
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.remove();
}

function initConsent() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'all') { loadGA(); loadYouTubeEmbeds(); return; }
  if (consent === 'essential') return;

  const banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <div class="cookie-banner-text">
        <span class="cookie-banner-title">🍪 Cookies</span>
        <p>Folosim cookies pentru analytics (Google Analytics) și videoclipuri (YouTube). Cookies esențiale sunt întotdeauna active.</p>
      </div>
      <div class="cookie-banner-actions">
        <button class="cookie-btn-essential" onclick="acceptEssential()">Doar esențiale</button>
        <button class="cookie-btn-accept" onclick="acceptAll()">Acceptă toate</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);
}

window.acceptAll = acceptAll;
window.acceptEssential = acceptEssential;
document.addEventListener('DOMContentLoaded', initConsent);
