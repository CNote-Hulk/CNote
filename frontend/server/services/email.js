/**
 * Email service â€” sends verification, password-reset, and login-alert emails.
 *
 * Configure via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * If SMTP is not configured, emails are logged to the console (dev mode).
 */

const nodemailer = require('nodemailer');

// Build transporter lazily so the module loads even without SMTP config
let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        // Dev fallback â€” create an Ethereal test account later or just log
        return null;
    }

    _transporter = nodemailer.createTransport({
        host,
        port,
        // Gmail on port 587 uses STARTTLS (not implicit TLS)
        secure: false,
        auth: { user, pass },
        tls: {
            rejectUnauthorized: false
        }
    });

    _transporter.verify((error) => {
        if (error) {
            console.error('SMTP verify failed:', error.message || error);
            return;
        }
        console.log('SMTP server is ready to send emails.');
    });

    return _transporter;
}

const FROM = () => process.env.SMTP_FROM || 'Console Notebook <bgigi6104@gmail.com>';
const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';

/**
 * Send an email. Falls back to console.log if SMTP is not configured.
 */
async function sendMail(to, subject, html) {
    const transporter = getTransporter();

    if (!transporter) {
        console.log('â”€â”€â”€â”€ EMAIL (dev mode â€” no SMTP) â”€â”€â”€â”€');
        console.log(`  To:      ${to}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Body:    ${html.replace(/<[^>]+>/g, ' ').substring(0, 300)}...`);
        console.log('â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€');
        return true;
    }

    await transporter.sendMail({
        from: FROM(),
        to,
        subject,
        html
    });
    return true;
}

// â”€â”€â”€ Email templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function sendVerificationEmail(email, username, token) {
    const link = `${BASE_URL()}/html/pages/verify-success.html?token=${encodeURIComponent(token)}`;

    const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">
        <h2 style="color:#d4a24e;margin-bottom:8px;">Bine ai venit, ${escapeHtml(username)}!</h2>
        <p>MulÈ›umim cÄƒ te-ai Ã®nregistrat pe <strong>Console Notebook</strong>.</p>
        <p>ConfirmÄƒ adresa de email fÄƒcÃ¢nd click pe butonul de mai jos:</p>
        <p style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;padding:12px 28px;background:#d4a24e;color:#1e1a17;text-decoration:none;font-weight:600;border-radius:8px;">VerificÄƒ Emailul</a>
        </p>
        <p style="font-size:13px;color:#a89880;">Linkul expirÄƒ Ã®n 24 de ore. DacÄƒ nu ai solicitat acest email, ignorÄƒ-l.</p>
    </div>`;

    return sendMail(email, 'VerificÄƒ adresa de email â€” Console Notebook', html);
}

async function sendPasswordResetEmail(email, username, token) {
    const link = `${BASE_URL()}/html/pages/reset-password.html?token=${encodeURIComponent(token)}`;

    const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">
        <h2 style="color:#d4a24e;margin-bottom:8px;">Resetare parolÄƒ</h2>
        <p>Salut, <strong>${escapeHtml(username)}</strong>!</p>
        <p>Am primit o cerere de resetare a parolei. FoloseÈ™te butonul de mai jos pentru a seta o parolÄƒ nouÄƒ:</p>
        <p style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;padding:12px 28px;background:#d4a24e;color:#1e1a17;text-decoration:none;font-weight:600;border-radius:8px;">ReseteazÄƒ Parola</a>
        </p>
        <p style="font-size:13px;color:#a89880;">Linkul expirÄƒ Ã®n 24 de ore. DacÄƒ nu ai solicitat resetarea, ignorÄƒ acest email.</p>
    </div>`;

    return sendMail(email, 'Resetare parolÄƒ â€” Console Notebook', html);
}

async function sendNewLoginAlert(email, username, deviceInfo) {
    const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#1e1a17;color:#e0d6cc;border-radius:12px;">
        <h2 style="color:#d4a24e;margin-bottom:8px;">Autentificare nouÄƒ detectatÄƒ</h2>
        <p>Salut, <strong>${escapeHtml(username)}</strong>!</p>
        <p>Contul tÄƒu a fost accesat de pe un dispozitiv nou:</p>
        <table style="margin:16px 0;font-size:14px;color:#e0d6cc;">
            <tr><td style="padding:4px 12px 4px 0;color:#a89880;">Browser:</td><td>${escapeHtml(deviceInfo.browser)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#a89880;">Sistem:</td><td>${escapeHtml(deviceInfo.os)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#a89880;">Dispozitiv:</td><td>${escapeHtml(deviceInfo.deviceType)}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#a89880;">IP:</td><td>${escapeHtml(deviceInfo.ip)}</td></tr>
        </table>
        <p style="font-size:13px;color:#a89880;">DacÄƒ nu ai fost tu, schimbÄƒ imediat parola din SetÄƒrile contului.</p>
    </div>`;

    return sendMail(email, 'Autentificare nouÄƒ â€” Console Notebook', html);
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
    sendNewLoginAlert
};


