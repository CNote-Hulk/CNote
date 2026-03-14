/* ─────────────────────────────────────────
   FILE: email.js
   DESCRIPTION: Email service using Resend API. Handles
   verification, password reset, 2FA codes, and contact
   form emails with branded HTML templates.
   ───────────────────────────────────────── */
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Console Notebook <noreply@consolenotebook.com>';
const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';
const CONTACT_TO = () => process.env.CONTACT_RECEIVER_EMAIL || 'console.notebook.app@gmail.com';

/**
 * escapeHtml
 * @description Prevents XSS by escaping HTML special characters.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * wrapTemplate
 * @description Wraps email content in the branded CNote HTML template.
 */
function wrapTemplate(title, content) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a14;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e,#16213e);border-bottom:1px solid rgba(232,213,183,0.1);">
    <tr>
      <td style="padding:32px 48px;">
        <p style="margin:0;font-size:11px;letter-spacing:3px;color:#a89880;text-transform:uppercase;">Console Notebook</p>
        <h1 style="margin:8px 0 0;font-size:26px;color:#e8d5b7;font-weight:600;">${title}</h1>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a14;">
    <tr>
      <td style="padding:48px 48px 40px;">
        ${content}
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1a;border-top:1px solid rgba(232,213,183,0.07);">
    <tr>
      <td style="padding:24px 48px;">
        <p style="margin:0;font-size:12px;color:#4a4060;line-height:1.6;">
          Dacă nu ai solicitat acest email, îl poți ignora în siguranță.<br>
          &copy; 2026 Console Notebook &middot; <a href="https://consolenotebook.com" style="color:#6a5a7a;text-decoration:none;">consolenotebook.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * sendVerificationEmail
 * @description Email: sent to user after registration to verify their address.
 */
async function sendVerificationEmail(to, token, baseUrl) {
    const verifyLink = String(baseUrl || BASE_URL()).replace(/\/$/, '') + '/html/pages/verify-success.html?token=' + encodeURIComponent(token);
    const html = wrapTemplate('Verifică Adresa de Email', `
              <p style="color:#c8b99a;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Bine ai venit pe Console Notebook! Pentru a-ți activa contul,
                verifică adresa de email apăsând butonul de mai jos.
              </p>
              <a href="${verifyLink}" style="display:inline-block;background:#e8d5b7;color:#0a0a14;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Verifică Emailul
              </a>
              <p style="color:#5a5070;font-size:12px;margin:20px 0 0;">
                Linkul expiră în 24 de ore.
              </p>`);

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject: 'Verifică adresa de email — CNote',
            html
        });
        if (error) {
            console.error('Resend error (verification):', error);
            return { success: false, error: error.message };
        }
        console.log('Verification email sent to:', to, '| Id:', data?.id);
        return { success: true };
    } catch (err) {
        console.error('Resend exception (verification):', err);
        return { success: false, error: err.message };
    }
}

/**
 * sendPasswordResetEmail
 * @description Email: sent to user when they request a password reset.
 */
async function sendPasswordResetEmail(to, token, baseUrl) {
    const resetLink = String(baseUrl || BASE_URL()).replace(/\/$/, '') + '/html/pages/reset-password.html?token=' + encodeURIComponent(token);
    const html = wrapTemplate('Resetare Parolă', `
              <p style="color:#c8b99a;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Am primit o cerere de resetare a parolei pentru contul tău CNote.
                Dacă tu ai făcut această cerere, apasă butonul de mai jos.
              </p>
              <a href="${resetLink}" style="display:inline-block;background:#e8d5b7;color:#0a0a14;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Resetează Parola
              </a>
              <p style="color:#5a5070;font-size:12px;margin:20px 0 0;">
                Linkul expiră în 24 de ore.
              </p>`);

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject: 'Resetare parolă — CNote',
            html
        });
        if (error) {
            console.error('Resend error (password reset):', error);
            return { success: false, error: error.message };
        }
        console.log('Password reset email sent to:', to, '| Id:', data?.id);
        return { success: true };
    } catch (err) {
        console.error('Resend exception (password reset):', err);
        return { success: false, error: err.message };
    }
}

/**
 * sendTwoFactorEmail
 * @description Email: sent to user as 2FA verification code (10 min expiry).
 */
async function sendTwoFactorEmail(to, code) {
    const safeCode = escapeHtml(String(code));
    const html = wrapTemplate('Cod de Verificare', `
              <p style="color:#c8b99a;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Codul tău de verificare în doi pași este:
              </p>
              <div style="background:#0a0a14;border:1px solid rgba(232,213,183,0.15);border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#e8d5b7;font-family:monospace;">
                  ${safeCode}
                </span>
              </div>
              <p style="color:#5a5070;font-size:12px;margin:0;">
                Codul este valabil 10 minute. Nu îl împărtăși nimănui.
              </p>`);

    try {
        const { data, error } = await resend.emails.send({
            from: FROM,
            to,
            subject: 'Codul tău de verificare — CNote',
            html
        });
        if (error) {
            console.error('Resend error (2FA):', error);
            return { success: false, error: error.message };
        }
        console.log('2FA email sent to:', to, '| Id:', data?.id);
        return { success: true };
    } catch (err) {
        console.error('Resend exception (2FA):', err);
        return { success: false, error: err.message };
    }
}

/**
 * sendContactEmail
 * @description Email: sends contact form to admin + auto-confirmation to sender.
 *              Two emails: 1) full message to admin, 2) thank-you to user.
 */
async function sendContactEmail(from, name, subject, message) {
    const safeName = escapeHtml(name);
    const safeFrom = escapeHtml(from);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const adminHtml = wrapTemplate('Mesaj Nou — Contact', `
              <p style="color:#c8b99a;font-size:14px;margin:0 0 20px;">
                Ai primit un mesaj nou prin formularul de contact.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:8px 0;border-bottom:1px solid rgba(232,213,183,0.07);">
                  <span style="color:#5a5070;font-size:12px;text-transform:uppercase;letter-spacing:1px;">De la</span><br>
                  <span style="color:#e8d5b7;font-size:14px;">${safeName} &middot; ${safeFrom}</span>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid rgba(232,213,183,0.07);">
                  <span style="color:#5a5070;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Subiect</span><br>
                  <span style="color:#e8d5b7;font-size:14px;">${safeSubject}</span>
                </td></tr>
                <tr><td style="padding:16px 0 0;">
                  <span style="color:#5a5070;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Mesaj</span><br>
                  <p style="color:#c8b99a;font-size:14px;line-height:1.7;margin:8px 0 0;">${safeMessage}</p>
                </td></tr>
              </table>`);

    const siteLink = String(BASE_URL()).replace(/\/$/, '') + '/html/pages/index.html#contact';
    const confirmationHtml = wrapTemplate('Mulțumim pentru mesaj', `
              <p style="color:#c8b99a;font-size:15px;line-height:1.7;margin:0 0 24px;">
                Îți mulțumim că ne-ai contactat. Îți vom răspunde în cel mai scurt timp.
              </p>
              <a href="${siteLink}" style="display:inline-block;background:#e8d5b7;color:#0a0a14;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
                Înapoi la site
              </a>`);

    try {
        const { error: adminErr } = await resend.emails.send({
            from: FROM,
            to: CONTACT_TO(),
            subject: `CNote Contact: ${subject}`,
            html: adminHtml
        });
        if (adminErr) {
            console.error('Resend error (contact admin):', adminErr);
            return { success: false, error: adminErr.message };
        }

        const { error: confirmErr } = await resend.emails.send({
            from: FROM,
            to: from,
            subject: 'Am primit mesajul tău — CNote',
            html: confirmationHtml
        });
        if (confirmErr) {
            console.error('Resend error (contact confirmation):', confirmErr);
        }

        console.log('Contact emails sent for:', from);
        return { success: true };
    } catch (err) {
        console.error('Resend exception (contact):', err);
        return { success: false, error: err.message };
    }
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendTwoFactorEmail,
    sendContactEmail
};
