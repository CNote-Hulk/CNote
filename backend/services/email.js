const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Console Notebook <noreply@consolenotebook.com>';
const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';
const CONTACT_TO = () => process.env.CONTACT_RECEIVER_EMAIL || 'console.notebook.app@gmail.com';

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function wrapTemplate(content) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0f0f1a;color:#e8d5b7;font-family:sans-serif;padding:40px;margin:0;">
  <div style="max-width:500px;margin:0 auto;background:#1a1a2e;border-radius:12px;padding:32px;border:1px solid rgba(232,213,183,0.1);">
    <h1 style="color:#e8d5b7;font-size:1.4rem;margin-top:0;">CONSOLE NOTEBOOK</h1>
    <hr style="border:none;border-top:1px solid rgba(232,213,183,0.1);margin:16px 0;">
    ${content}
    <p style="color:#a89880;font-size:0.8rem;margin-top:32px;">
      Dacă nu ai solicitat acest email, îl poți ignora în siguranță.
    </p>
  </div>
</body>
</html>`;
}

async function sendVerificationEmail(to, token, baseUrl) {
    const link = String(baseUrl || BASE_URL()).replace(/\/$/, '') + '/frontend/html/pages/verify-success.html?token=' + encodeURIComponent(token);
    const html = wrapTemplate(`
    <p style="color:#e8d5b7;font-size:0.95rem;line-height:1.6;margin:0 0 24px;">
      Bine ai venit în Console Notebook. Confirmă adresa de email pentru a activa complet contul și a putea folosi toate funcțiile comunității.
    </p>
    <div style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#d4a24e;color:#1a1411;text-decoration:none;font-weight:700;border-radius:10px;">Verifică emailul</a>
    </div>
    <p style="color:#a89880;font-size:0.82rem;">Linkul expiră în 24 de ore.</p>`);

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

async function sendPasswordResetEmail(to, token, baseUrl) {
    const link = String(baseUrl || BASE_URL()).replace(/\/$/, '') + 'html/pages/reset-password.html?token=' + encodeURIComponent(token);
    const html = wrapTemplate(`
    <p style="color:#e8d5b7;font-size:0.95rem;line-height:1.6;margin:0 0 24px;">
      Am primit o cerere de resetare a parolei. Folosește butonul de mai jos pentru a seta o parolă nouă pentru contul tău CNote.
    </p>
    <div style="margin:0 0 24px;">
      <a href="${link}" style="display:inline-block;padding:12px 24px;background:#d4a24e;color:#1a1411;text-decoration:none;font-weight:700;border-radius:10px;">Resetează parola</a>
    </div>
    <p style="color:#a89880;font-size:0.82rem;">Linkul expiră în 24 de ore.</p>`);

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

async function sendTwoFactorEmail(to, code) {
    const safeCode = escapeHtml(String(code));
    const html = wrapTemplate(`
    <p style="color:#e8d5b7;font-size:0.95rem;line-height:1.6;margin:0 0 24px;">
      Folosește codul de mai jos pentru a te autentifica în contul tău CNote.
    </p>
    <div style="margin:0 0 24px;text-align:center;">
      <div style="display:inline-block;padding:16px 32px;background:rgba(212,162,78,0.1);border:2px solid #d4a24e;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#d4a24e;">${safeCode}</div>
    </div>
    <p style="color:#a89880;font-size:0.82rem;">Codul expiră în 10 minute.</p>`);

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

async function sendContactEmail(from, name, subject, message) {
    const adminHtml = wrapTemplate(`
    <h2 style="color:#e8d5b7;font-size:1.1rem;margin:0 0 16px;">Mesaj nou din formularul de contact</h2>
    <p style="color:#e8d5b7;font-size:0.9rem;margin:0 0 6px;"><strong>Nume:</strong> ${escapeHtml(name)}</p>
    <p style="color:#e8d5b7;font-size:0.9rem;margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(from)}</p>
    <p style="color:#e8d5b7;font-size:0.9rem;margin:0 0 16px;"><strong>Subiect:</strong> ${escapeHtml(subject)}</p>
    <div style="padding:16px;border-radius:8px;background:rgba(232,213,183,0.05);border:1px solid rgba(232,213,183,0.1);white-space:pre-wrap;line-height:1.6;color:#e8d5b7;font-size:0.9rem;">${escapeHtml(message)}</div>`);

    const siteLink = String(BASE_URL()).replace(/\/$/, '') + '/frontend/html/pages/index.html#contact';
    const confirmationHtml = wrapTemplate(`
    <p style="color:#e8d5b7;font-size:0.95rem;line-height:1.6;margin:0 0 24px;">
      Îți mulțumim că ne-ai contactat. Îți vom răspunde în cel mai scurt timp.
    </p>
    <div style="margin:0 0 24px;">
      <a href="${siteLink}" style="display:inline-block;padding:12px 24px;background:#d4a24e;color:#1a1411;text-decoration:none;font-weight:700;border-radius:10px;">Înapoi la site</a>
    </div>`);

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
