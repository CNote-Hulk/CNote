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

        if (!contactForm || !submitBtn) return;

        window.__CONTACT_FORM_INITIALIZED__ = true;

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

        const setLoading = (isLoading) => {
            isSubmitting = isLoading;
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? 'Se trimite...' : originalBtnText;
            submitBtn.classList.toggle('button-loading', isLoading);
        };

        const showInlineError = (msg) => {
            const errorEl = document.getElementById('error-message');
            if (!errorEl) return;
            errorEl.textContent = msg;
            errorEl.hidden = false;
        };

        const clearInlineError = () => {
            const errorEl = document.getElementById('error-message');
            if (errorEl) errorEl.hidden = true;
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

            clearInlineError();

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
                showInlineError('Completează toate câmpurile formularului.');
                return;
            }

            setLoading(true);

            try {
                if (isLocalFile) {
                    sendLocalMailto(name, email, subject, message);
                    contactForm.reset();
                    contactForm.hidden = true;
                    successMessage.hidden = false;
                    smoothScrollToMessage(successMessage);
                    return;
                }

                const payload = { name, email, subject, message, _honey: honeypot ? honeypot.value : '' };

                const response = await fetch(API_BASE_URL + '/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });

                const data = await response.json().catch(() => ({}));

                if (response.ok && data.success) {
                    contactForm.reset();
                    contactForm.hidden = true;
                    successMessage.hidden = false;
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
};


