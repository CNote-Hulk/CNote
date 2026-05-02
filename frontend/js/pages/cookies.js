(function () {
  var CONSENT_KEY = 'cn_cookie_consent';

  function getStoredConsent() {
    try {
      return JSON.parse(localStorage.getItem(CONSENT_KEY));
    } catch (e) {
      return null;
    }
  }

  function initSettingsPanel() {
    var toggle = document.getElementById('cookie-analytics-toggle');
    var saveBtn = document.getElementById('cookie-settings-save');
    if (!toggle || !saveBtn) return;

    var consent = getStoredConsent();
    toggle.checked = consent ? !!consent.analytics : false;

    saveBtn.addEventListener('click', function () {
      var newConsent = { necessary: true, analytics: toggle.checked };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(newConsent));
      window.location.reload();
    });
  }

  function initScrollSpy() {
    var links = document.querySelectorAll('.terms-sidebar__link');
    var sections = Array.from(links).map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    });
    function onScroll() {
      var scrollY = window.scrollY + 120;
      var active = sections[0];
      sections.forEach(function (s) { if (s && s.offsetTop <= scrollY) active = s; });
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + (active && active.id));
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSettingsPanel();
    initScrollSpy();
  });
})();
