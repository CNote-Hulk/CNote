/**
 * ===========================
 * HELP & SUPPORT PAGE
 * ===========================
 * Hero discover flow, timeline animation,
 * FAQ accordion, and contact form handler.
 * ===========================
 */
document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('.help-hero');
    var discoverBtn = document.getElementById('help-discover-btn');
    var timelineSection = document.getElementById('timeline');
    var steps = document.querySelectorAll('.help-timeline__step');
    var connectors = document.querySelectorAll('.help-timeline__connector');
    var faqQuestions = document.querySelectorAll('.help-faq__question');
    var discovered = localStorage.getItem('helpDiscovered') === 'true';

    if (discovered) {
        // Already discovered — show timeline fully active, scroll enabled
        steps.forEach(function (s) { s.classList.add('active'); });
        connectors.forEach(function (c) { c.classList.add('filled'); });
    } else {
        // Lock page scroll until Discover is clicked
        document.body.style.overflow = 'hidden';
    }

    // --- Discover button ---
    if (discoverBtn) {
        discoverBtn.addEventListener('click', function () {
            document.body.style.overflow = '';
            localStorage.setItem('helpDiscovered', 'true');
            timelineSection.scrollIntoView({ behavior: 'smooth' });
            animateTimeline();
        });
    }

    function animateTimeline() {
        steps.forEach(function (step, i) {
            setTimeout(function () {
                step.classList.add('active');
                if (i > 0 && connectors[i - 1]) {
                    connectors[i - 1].classList.add('filled');
                }
            }, i * 800);
        });
    }

    // --- FAQ accordion ---
    faqQuestions.forEach(function (question) {
        question.addEventListener('click', function () {
            var answer = this.nextElementSibling;
            var icon = this.querySelector('.help-faq__icon');
            var isActive = this.classList.contains('active');

            // Close all
            faqQuestions.forEach(function (q) {
                q.classList.remove('active');
                q.nextElementSibling.style.maxHeight = null;
                q.querySelector('.help-faq__icon').textContent = '+';
            });

            if (!isActive) {
                this.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.textContent = '\u2212'; // minus sign
            }
        });
    });

    // --- Contact form ---
    var contactForm = document.getElementById('help-contact-form');
    var submitBtn = document.getElementById('help-submit-btn');
    var successMsg = document.getElementById('help-success-msg');
    var errorMsg = document.getElementById('help-error-msg');

    if (contactForm && submitBtn) {
        var originalText = submitBtn.textContent;
        var API_BASE = (window.CN_API_BASE_URL || '/api').replace(/\/$/, '');

        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            var honeypot = contactForm.querySelector('input[name="_honey"]');
            if (honeypot && honeypot.value.trim()) return;

            var name = document.getElementById('help-name').value.trim();
            var email = document.getElementById('help-email').value.trim();
            var message = document.getElementById('help-message').value.trim();

            if (!name || !email || !message) {
                showMsg(errorMsg, 'Please fill in all fields.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';

            try {
                var res = await fetch(API_BASE + '/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        subject: 'Help Page Contact',
                        message: message,
                        _honey: ''
                    })
                });
                var data = await res.json().catch(function () { return {}; });

                if (res.ok && data.success) {
                    showMsg(successMsg, data.message || 'Message sent successfully!');
                    contactForm.reset();
                } else {
                    throw new Error(data.error || 'Failed to send message.');
                }
            } catch (err) {
                showMsg(errorMsg, err.message || 'Error sending message. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    function showMsg(el, text) {
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
        setTimeout(function () { el.style.display = 'none'; }, 5000);
    }
});
