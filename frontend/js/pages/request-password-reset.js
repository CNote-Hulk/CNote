/**
 * Request Password Reset Page Script
 * Sends password reset request to API and displays result.
 */
import { API_BASE_URL } from '../config.js';

document.getElementById('request-reset-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const errorEl = document.getElementById('reset-request-error');
    const successEl = document.getElementById('reset-request-success');
    const submitBtn = document.getElementById('reset-submit-btn');

    errorEl.classList.remove('visible');
    successEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
        const res = await fetch(API_BASE_URL + '/request-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
            successEl.textContent = data.message || 'Check your inbox for the reset link.';
            successEl.classList.add('visible');
        } else {
            errorEl.textContent = data.error || 'An error occurred.';
            errorEl.classList.add('visible');
        }
    } catch {
        errorEl.textContent = 'Unable to contact the server. Please try again.';
        errorEl.classList.add('visible');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send reset link';
    }
});
