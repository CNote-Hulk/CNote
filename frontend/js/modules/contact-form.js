/**
 * Contact Form Module
 * Handles validation and submit in module-enabled environments
 */

import { API_BASE_URL } from '../config.js';

export const ContactFormModule = {
    init() {
        if (window.__CONTACT_FORM_INITIALIZED__) return;

        const contactForm = document.getElementById('contact-form');
        const submitBtn = document.getElementById('submit-btn');
        const successMessage = document.getElementById('success-message');
        const errorMessage = document.getElementById('error-message');

        if (!contactForm || !submitBtn) return;

        window.__CONTACT_FORM_INITIALIZED__ = true;

        const originalBtnText = submitBtn.textContent || 'Send message';
        const isLocalFile = window.location.protocol === 'file:';
        let isSubmitting = false;

        const validateField = (input) => {
            if (!input) return false;
            const value = input.value.trim();
            const isValid = input.type === 'email'
                ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length > 0
                : value.length > 0;

            input.classList.remove('input-valid', 'input-invalid');
            if (value.length > 0) {
                input.classList.add(isValid ? 'input-valid' : 'input-invalid');
            }
            return isValid || value.length === 0;
        };

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

        const showMessage = (messageEl, duration = 5000) => {
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
        };

        const setLoading = (isLoading) => {
            isSubmitting = isLoading;
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? 'Sending...' : originalBtnText;
            submitBtn.classList.toggle('button-loading', isLoading);
        };

        const smoothScrollToMessage = (messageEl) => {
            if (!messageEl) return;
            setTimeout(() => {
                if (typeof messageEl.scrollIntoView === 'function') {
                    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 120);
        };

        const setMessageText = (element, text, fallbackText) => {
            if (!element) return;
            element.textContent = text || fallbackText;
        };

        const sendLocalMailto = (name, email, subject, message) => {
            const encodedSubject = encodeURIComponent(subject || 'New message from website');
            const body = encodeURIComponent(
                'Name: ' + name + '\n' +
                'Email: ' + email + '\n\n' +
                'Subject: ' + subject + '\n\n' +
                'Message:\n' + message
            );

            window.location.href = 'mailto:console.notebook.app@gmail.com?subject=' + encodedSubject + '&body=' + body;
        };

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const honeypot = contactForm.querySelector('input[name="_honey"]');
            if (honeypot && honeypot.value.trim() !== '') return;

            const nameEl = document.getElementById('contact-name');
            const emailEl = document.getElementById('contact-email');
            const subjectEl = document.getElementById('contact-subject');
            const messageEl = document.getElementById('contact-message');
            const name = nameEl ? nameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const subject = subjectEl ? subjectEl.value.trim() : '';
            const message = messageEl ? messageEl.value.trim() : '';

            if (!name || !email || !subject || !message) {
                setMessageText(errorMessage, 'Please fill in all form fields.', 'Error sending message.');
                showMessage(errorMessage, 5000);
                smoothScrollToMessage(errorMessage || contactForm);
                return;
            }

            setLoading(true);

            try {
                const isNameValid = validateField(nameEl);
                const isEmailValid = validateField(emailEl);
                const isSubjectValid = validateField(subjectEl);
                const isMessageValid = validateField(messageEl);

                if (!isNameValid || !isEmailValid || !isSubjectValid || !isMessageValid) {
                    setMessageText(errorMessage, 'Check the entered data and try again.', 'Error sending message.');
                    showMessage(errorMessage, 5000);
                    smoothScrollToMessage(errorMessage || contactForm);
                    return;
                }

                if (isLocalFile) {
                    sendLocalMailto(name, email, subject, message);
                    setMessageText(successMessage, 'Message prepared. Check your email app to send it.', 'Message sent successfully!');
                    showMessage(successMessage, 5000);
                    smoothScrollToMessage(successMessage || contactForm);
                    contactForm.reset();
                    return;
                }

                const payload = {
                    name,
                    email,
                    subject,
                    message,
                    _honey: honeypot ? honeypot.value : ''
                };

                const response = await fetch(API_BASE_URL + '/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (response.ok && data.success) {
                    setMessageText(successMessage, data.message || 'Message sent.', 'Message sent.');
                    showMessage(successMessage, 5000);
                    smoothScrollToMessage(successMessage || contactForm);
                    contactForm.reset();
                } else {
                    throw new Error(data.error || 'Server responded with error');
                }
            } catch (error) {
                console.error('Contact form error:', error);
                setMessageText(errorMessage, error.message || 'Could not send message. Try again.', 'Error sending message.');
                showMessage(errorMessage, 5000);
                smoothScrollToMessage(errorMessage || contactForm);
            } finally {
                setLoading(false);
            }
        });
    }
};


