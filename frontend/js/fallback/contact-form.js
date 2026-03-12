/**
 * ===========================
 * CONTACT FORM HANDLER (Fallback Script)
 * ===========================
 * Handles form submission, validation, and UI feedback
 * Works without ES6 modules (for file:// protocol support)
 * 
 * Features:
 * - Real-time field validation
 * - FormSubmit.co integration
 * - Success/error message display with animations
 * - Loading state during submission
 * - Honeypot spam protection
 * ===========================
 */

document.addEventListener('DOMContentLoaded', function () {
    if (window.__CONTACT_FORM_INITIALIZED__) {
        console.log('✉️ Contact form already initialized by module, skipping fallback');
        return;
    }

    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const originalBtnText = submitBtn?.textContent || 'Trimite mesajul';
    let isSubmitting = false;
    const isLocalFile = window.location.protocol === 'file:';

    // Form field validation helper
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
        const inputs = contactForm.querySelectorAll('input[type="text"], input[type="email"], textarea');
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

    // Util: Show message with animation
    function showMessage(messageEl, duration = 5000) {
        if (!messageEl) return;
        messageEl.style.display = 'block';
        messageEl.classList.add('message-visible');
        messageEl.classList.remove('message-hidden');

        setTimeout(() => {
            messageEl.classList.remove('message-visible');
            messageEl.classList.add('message-hidden');
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 300);
        }, duration);
    }

    // Util: Set loading state
    function setLoading(isLoading) {
        if (!submitBtn) return;
        isSubmitting = isLoading;
        submitBtn.disabled = isLoading;
        submitBtn.textContent = isLoading ? 'Se trimite…' : originalBtnText;
        submitBtn.classList.toggle('button-loading', isLoading);
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

    function sendLocalMailto(name, email, message) {
        const subject = encodeURIComponent('Mesaj nou de pe website');
        const body = encodeURIComponent(
            'Nume: ' + name + '\n' +
            'Email: ' + email + '\n\n' +
            'Mesaj:\n' + message
        );

        window.location.href = 'mailto:andrei.halcu.07@licmarghilomanbz.ro?subject=' + subject + '&body=' + body;
    }

    if (contactForm && submitBtn) {
        window.__CONTACT_FORM_INITIALIZED__ = true;

        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (isSubmitting) return;

            const honeypot = contactForm.querySelector('input[name="_honey"]');
            if (honeypot && honeypot.value.trim() !== '') {
                console.warn('Honeypot triggered');
                return;
            }

            const nameEl = document.getElementById('contact-name');
            const emailEl = document.getElementById('contact-email');
            const messageEl = document.getElementById('contact-message');
            const name = nameEl ? nameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const message = messageEl ? messageEl.value.trim() : '';

            if (!name || !email || !message) {
                showMessage(errorMessage, 5000);
                smoothScrollToMessage(errorMessage || contactForm);
                return;
            }

            setLoading(true);

            try {
                const isNameValid = validateField(nameEl);
                const isEmailValid = validateField(emailEl);
                const isMessageValid = validateField(messageEl);

                if (!isNameValid || !isEmailValid || !isMessageValid) {
                    showMessage(errorMessage, 5000);
                    smoothScrollToMessage(errorMessage || contactForm);
                    return;
                }

                if (isLocalFile) {
                    sendLocalMailto(name, email, message);
                    showMessage(successMessage, 5000);
                    smoothScrollToMessage(successMessage || contactForm);
                    contactForm.reset();
                    return;
                }

                const formData = new FormData(contactForm);
                formData.append('_captcha', 'false');
                formData.append('_subject', 'Mesaj nou de pe website');
                formData.append('_template', 'table');

                const response = await fetch('https://formsubmit.co/andrei.halcu.07@licmarghilomanbz.ro', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    showMessage(successMessage, 5000);
                    smoothScrollToMessage(successMessage || contactForm);
                    contactForm.reset();
                } else {
                    throw new Error('Server responded with error');
                }
            } catch (error) {
                console.error('Contact form error:', error);
                showMessage(errorMessage, 5000);
                smoothScrollToMessage(errorMessage || contactForm);
            } finally {
                setLoading(false);
            }
        });
    }
});