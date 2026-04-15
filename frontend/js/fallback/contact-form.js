/**
 * ===========================
 * CONTACT FORM HANDLER (Fallback Script)
 * ===========================
 * Handles form submission, validation, and UI feedback
 * Works without ES6 modules (for file:// protocol support)
 * 
 * Features:
 * - Real-time field validation
 * - Backend API integration for Nodemailer delivery
 * - Success/error message display with animations
 * - Loading state during submission
 * - Honeypot spam protection
 * ===========================
 */

document.addEventListener('DOMContentLoaded', function () {
    if (window.__CONTACT_FORM_INITIALIZED__) {
        console.log('Contact form already initialized by module, skipping fallback');
        return;
    }

    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMessage = document.getElementById('success-message');
    const originalBtnText = submitBtn?.textContent || 'Send message';
    let isSubmitting = false;
    const isLocalFile = window.location.protocol === 'file:';
    const API_BASE_URL = (window.CN_API_BASE_URL || '/api').replace(/\/$/, '');

    // Auto-fill Name & Email from session
    try {
        const raw = localStorage.getItem('cn_session');
        if (raw) {
            const session = JSON.parse(raw);
            const nameEl = document.getElementById('contact-name');
            const emailEl = document.getElementById('contact-email');
            if (session.username && nameEl) {
                nameEl.value = session.username;
                nameEl.closest('.input-group')?.querySelector('label')?.classList.add('label-active');
            }
            if (session.email && emailEl) {
                emailEl.value = session.email;
                emailEl.closest('.input-group')?.querySelector('label')?.classList.add('label-active');
            }
        }
    } catch (e) {}

    // Form field validation helper
    /** Validate a single form input and toggle valid/invalid CSS classes */
    function validateField(input) {
        if (!input) return false;
        const value = input.value.trim();
        const isValid = input.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length > 0 : value.length > 0;
        input.classList.remove('input-valid', 'input-invalid');
        if (value.length > 0) {
            input.classList.add(isValid ? 'input-valid' : 'input-invalid');
        }
        return isValid || value.length === 0; // Allow empty on blur, just show feedback
    }

    // Add validation listeners to form inputs
    if (contactForm) {
        const inputs = contactForm.querySelectorAll('input[type="text"], input[type="email"], textarea, select');
        inputs.forEach(input => {
            const inputGroup = input.closest('.input-group');
            const label = inputGroup ? inputGroup.querySelector('label') : null;

            input.addEventListener('focus', () => {
                if (label) label.classList.add('label-active');
            });

            input.addEventListener('blur', () => {
                if (!input.value.trim() && label) {
                    label.classList.remove('label-active');
                }
                validateField(input);
            });

            input.addEventListener('input', () => {
                if (input.value.trim() && label) {
                    label.classList.add('label-active');
                } else if (!input.value.trim() && label) {
                    label.classList.remove('label-active');
                }
                if (input.classList.contains('input-valid') || input.classList.contains('input-invalid')) {
                    validateField(input);
                }
            });
        });
    }

    // Util: Set loading state
    /** Toggle loading spinner on submit button */
    function setLoading(isLoading) {
        if (!submitBtn) return;
        isSubmitting = isLoading;
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Se trimite...' : originalBtnText;
        submitBtn.classList.toggle('button-loading', isLoading);
    }

    function showInlineError(msg) {
        var errorEl = document.getElementById('error-message');
        if (!errorEl) return;
        errorEl.textContent = msg;
        errorEl.hidden = false;
    }

    function clearInlineError() {
        var errorEl = document.getElementById('error-message');
        if (errorEl) errorEl.hidden = true;
    }

    // Util: Smooth scroll to message (centered)
    function smoothScrollToMessage(messageEl) {
        if (!messageEl) return;
        setTimeout(() => {
            if (typeof messageEl.scrollIntoView === 'function') {
                messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 120);
    }

    /** Fallback: open mailto: link when API is unavailable (file:// mode) */
    function sendLocalMailto(name, email, subject, message) {
        const encodedSubject = encodeURIComponent(subject || 'New message from website');
        const body = encodeURIComponent(
            'Nume: ' + name + '\n' +
            'Email: ' + email + '\n\n' +
            'Subiect: ' + subject + '\n\n' +
            'Message:\n' + message
        );

        window.location.href = 'mailto:console.notebook.app@gmail.com?subject=' + encodedSubject + '&body=' + body;
    }

    if (contactForm && submitBtn) {
        window.__CONTACT_FORM_INITIALIZED__ = true;

        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isSubmitting) return;

            clearInlineError();

            var honeypot = contactForm.querySelector('input[name="_honey"]');
            if (honeypot && honeypot.value.trim() !== '') return;

            var nameEl = document.getElementById('contact-name');
            var emailEl = document.getElementById('contact-email');
            var subjectEl = document.getElementById('contact-subject');
            var messageEl = document.getElementById('contact-message');
            var name = nameEl ? nameEl.value.trim() : '';
            var email = emailEl ? emailEl.value.trim() : '';
            var subject = subjectEl ? subjectEl.value.trim() : '';
            var message = messageEl ? messageEl.value.trim() : '';

            if (!name || !email || !subject || !message) {
                showInlineError('Completează toate câmpurile formularului.');
                return;
            }

            setLoading(true);

            try {
                if (isLocalFile) {
                    sendLocalMailto(name, email, subject, message);
                    contactForm.reset();
                    contactForm.hidden = true;
                    if (successMessage) successMessage.hidden = false;
                    smoothScrollToMessage(successMessage);
                    return;
                }

                var payload = { name: name, email: email, subject: subject, message: message, _honey: honeypot ? honeypot.value : '' };

                var response = await fetch(API_BASE_URL + '/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                var data = await response.json().catch(function() { return {}; });

                if (response.ok && data.success) {
                    contactForm.reset();
                    contactForm.hidden = true;
                    if (successMessage) successMessage.hidden = false;
                    smoothScrollToMessage(successMessage);
                } else {
                    throw new Error(data.error || 'Nu am putut trimite mesajul. Încearcă din nou.');
                }
            } catch (error) {
                console.error('Contact form error:', error);
                showInlineError(error.message || 'Nu am putut trimite mesajul. Încearcă din nou.');
            } finally {
                setLoading(false);
            }
        });
    }
});

