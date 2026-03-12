/**
 * Email service — sends verification, password-reset, and login-alert emails
 * using the Resend API.
 *
 * Configure via environment variable:
 *   RESEND_API_KEY
 *
 * If Resend is not configured, emails are logged to the console (dev mode).
 */

const { Resend } = require('resend');

let _resend = null;

function getResend() {
    if (_resend) return _resend;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return null;
    }

    _resend = new Resend(apiKey);
    console.log('Resend email client initialized');
    return _resend;
}

const FROM = 'Console Notebook <onboarding@resend.dev>';
const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';

/**
 * Send an email. Falls back to console.log if Resend is not configured.
 */
async function sendMail(to, subject, html) {
    console.log('Attempting to send email to:', to, '| Subject:', subject);
    const resend = getResend();

    if (!resend) {
        console.log('---- EMAIL (dev mode - no Resend API key) ----');
        console.log('  To:      ' + to);
        console.log('  Subject: ' + subject);
        console.log('  Body:    ' + html.replace(/<[^>]+>/g, ' ').substring(0, 300) + '...');
        console.log('----------------------------------------------');
        return true;
    }

    const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject,
        html
    });

    if (error) {
        console.error('Resend email error:', error);
        throw new Error(error.message || 'Email sending failed');
    }

    console.log('Email sent successfully to:', to, '| Id:', data?.id);
    return true;
}

// --- Email templates ---

async function sendVerificationEmail(email, username, token) {
    const link = BASE_URL() + '/html/pages/verify-success.html?token=' + encodeURIComponent(token);

    const html =
    '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">' +
        '<h2 style="color:#d4a24e;margin-bottom:8px;">Bine ai venit, ' + escapeHtml(username) + '!</h2>' +
        '<p>Mul\u021bumim c\u0103 te-ai \u00eenregistrat pe <strong>Console Notebook</strong>.</p>' +
        '<p>Confirm\u0103 adresa de email f\u0103c\u00e2nd click pe butonul de mai jos:</p>' +
        '<p style="text-align:center;margin:24px 0;">' +
            '<a href="' + link + '" style="display:inline-block;padding:12px 28px;background:#d4a24e;color:#1e1a17;text-decoration:none;font-weight:600;border-radius:8px;">Verific\u0103 Emailul</a>' +
        '</p>' +
        '<p style="font-size:13px;color:#a89880;">Linkul expir\u0103 \u00een 24 de ore. Dac\u0103 nu ai solicitat acest email, ignor\u0103-l.</p>' +
    '</div>';

    return sendMail(email, 'Verific\u0103 adresa de email \u2014 Console Notebook', html);
}

async function sendPasswordResetEmail(email, username, token) {
    const link = BASE_URL() + '/html/pages/reset-password.html?token=' + encodeURIComponent(token);

    const html =
    '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">' +
        '<h2 style="color:#d4a24e;margin-bottom:8px;">Resetare parol\u0103</h2>' +
        '<p>Salut, <strong>' + escapeHtml(username) + '</strong>!</p>' +
        '<p>Am primit o cerere de resetare a parolei. Folose\u0219te butonul de mai jos pentru a seta o parol\u0103 nou\u0103:</p>' +
        '<p style="text-align:center;margin:24px 0;">' +
            '<a href="' + link + '" style="display:inline-block;padding:12px 28px;background:#d4a24e;color:#1e1a17;text-decoration:none;font-weight:600;border-radius:8px;">Reseteaz\u0103 Parola</a>' +
        '</p>' +
        '<p style="font-size:13px;color:#a89880;">Linkul expir\u0103 \u00een 24 de ore. Dac\u0103 nu ai solicitat resetarea, ignor\u0103 acest email.</p>' +
    '</div>';

    return sendMail(email, 'Resetare parol\u0103 \u2014 Console Notebook', html);
}

async function sendNewLoginAlert(email, username, deviceInfo) {
    const html =
    '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">' +
        '<h2 style="color:#d4a24e;margin-bottom:8px;">Autentificare nou\u0103 detectat\u0103</h2>' +
        '<p>Salut, <strong>' + escapeHtml(username) + '</strong>!</p>' +
        '<p>Contul t\u0103u a fost accesat de pe un dispozitiv nou:</p>' +
        '<table style="margin:16px 0;font-size:14px;color:#e0d6cc;">' +
            '<tr><td style="padding:4px 12px 4px 0;color:#a89880;">Browser:</td><td>' + escapeHtml(deviceInfo.browser) + '</td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#a89880;">Sistem:</td><td>' + escapeHtml(deviceInfo.os) + '</td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#a89880;">Dispozitiv:</td><td>' + escapeHtml(deviceInfo.deviceType) + '</td></tr>' +
            '<tr><td style="padding:4px 12px 4px 0;color:#a89880;">IP:</td><td>' + escapeHtml(deviceInfo.ip) + '</td></tr>' +
        '</table>' +
        '<p style="font-size:13px;color:#a89880;">Dac\u0103 nu ai fost tu, schimb\u0103 imediat parola din Set\u0103rile contului.</p>' +
    '</div>';

    return sendMail(email, 'Autentificare nou\u0103 \u2014 Console Notebook', html);
}

/** Escape HTML to prevent XSS in email templates */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendNewLoginAlert,
    getResend
};