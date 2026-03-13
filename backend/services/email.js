const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
    if (_transporter) return _transporter;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }

    _transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    console.log('Nodemailer Gmail transporter initialized');
    return _transporter;
}

const FROM = () => `Console Notebook <${process.env.EMAIL_USER || 'console.notebook.app@gmail.com'}>`;
const BASE_URL = () => process.env.BASE_URL || 'http://localhost:3000';
const CONTACT_TO = () => process.env.CONTACT_RECEIVER_EMAIL || 'console.notebook.app@gmail.com';

async function sendMail(to, subject, html) {
    const transporter = getTransporter();

    if (!transporter) {
        console.log('---- EMAIL (dev mode - no Gmail credentials) ----');
        console.log('  To:      ' + to);
        console.log('  Subject: ' + subject);
        console.log('  Body:    ' + html.replace(/<[^>]+>/g, ' ').substring(0, 300) + '...');
        console.log('----------------------------------------------');
        return true;
    }

    const info = await transporter.sendMail({
        from: FROM(),
        to,
        subject,
        html
    });

    console.log('Email sent successfully to:', to, '| Id:', info?.messageId);
    return true;
}

function buildCardEmail(title, intro, buttonLabel, buttonLink, footer) {
    return '' +
        '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#16110f;color:#f5eee6;border-radius:16px;border:1px solid #2b221d;">' +
            '<div style="margin-bottom:20px;">' +
                '<div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#a89880;">CNote</div>' +
                '<h2 style="margin:8px 0 0;color:#d4a24e;font-size:24px;line-height:1.2;">' + escapeHtml(title) + '</h2>' +
            '</div>' +
            '<p style="font-size:15px;line-height:1.7;color:#e0d6cc;margin:0 0 24px;">' + intro + '</p>' +
            '<div style="margin:0 0 24px;">' +
                '<a href="' + buttonLink + '" style="display:inline-block;padding:12px 24px;background:#d4a24e;color:#1a1411;text-decoration:none;font-weight:700;border-radius:10px;">' + escapeHtml(buttonLabel) + '</a>' +
            '</div>' +
            '<p style="font-size:13px;line-height:1.6;color:#a89880;margin:0;">' + footer + '</p>' +
        '</div>';
}

async function sendVerificationEmail(to, token, baseUrl) {
    const link = String(baseUrl || BASE_URL()).replace(/\/$/, '') + '/html/pages/verify-success.html?token=' + encodeURIComponent(token);
    const html = buildCardEmail(
        'Verifica adresa de email',
        'Bine ai venit in Console Notebook. Confirma adresa de email pentru a activa complet contul si a putea folosi toate functiile comunitatii.',
        'Verifica emailul',
        link,
        'Linkul expira in 24 de ore. Daca nu ti-ai creat cont, poti ignora acest mesaj.'
    );

    return sendMail(to, 'Verifica adresa de email - CNote', html);
}

async function sendPasswordResetEmail(to, token, baseUrl) {
    const link = String(baseUrl || BASE_URL()).replace(/\/$/, '') + '/html/pages/reset-password.html?token=' + encodeURIComponent(token);
    const html = buildCardEmail(
        'Resetare parola',
        'Am primit o cerere de resetare a parolei. Foloseste butonul de mai jos pentru a seta o parola noua pentru contul tau CNote.',
        'Reseteaza parola',
        link,
        'Linkul expira in 24 de ore. Daca nu ai solicitat resetarea, ignora acest email.'
    );

    return sendMail(to, 'Resetare parola - CNote', html);
}

function buildCodeEmail(title, intro, code, footer) {
    return '' +
        '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#16110f;color:#f5eee6;border-radius:16px;border:1px solid #2b221d;">' +
            '<div style="margin-bottom:20px;">' +
                '<div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#a89880;">CNote</div>' +
                '<h2 style="margin:8px 0 0;color:#d4a24e;font-size:24px;line-height:1.2;">' + escapeHtml(title) + '</h2>' +
            '</div>' +
            '<p style="font-size:15px;line-height:1.7;color:#e0d6cc;margin:0 0 24px;">' + escapeHtml(intro) + '</p>' +
            '<div style="margin:0 0 24px;text-align:center;">' +
                '<div style="display:inline-block;padding:16px 32px;background:#211915;border:2px solid #d4a24e;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#d4a24e;">' + escapeHtml(code) + '</div>' +
            '</div>' +
            '<p style="font-size:13px;line-height:1.6;color:#a89880;margin:0;">' + escapeHtml(footer) + '</p>' +
        '</div>';
}

async function sendTwoFactorEmail(to, code) {
    const html = buildCodeEmail(
        'Codul tau de verificare',
        'Foloseste codul de mai jos pentru a te autentifica in contul tau CNote.',
        code,
        'Codul expira in 10 minute. Daca nu ai solicitat acest cod, ignora mesajul.'
    );
    return sendMail(to, 'Codul tau de verificare - CNote', html);
}

async function sendContactEmail(from, name, subject, message) {
    const adminHtml = '' +
        '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#16110f;color:#f5eee6;border-radius:16px;border:1px solid #2b221d;">' +
            '<div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#a89880;margin-bottom:8px;">CNote Contact</div>' +
            '<h2 style="margin:0 0 12px;color:#d4a24e;font-size:24px;">Mesaj nou din formularul de contact</h2>' +
            '<p style="margin:0 0 6px;"><strong>Nume:</strong> ' + escapeHtml(name) + '</p>' +
            '<p style="margin:0 0 6px;"><strong>Email:</strong> ' + escapeHtml(from) + '</p>' +
            '<p style="margin:0 0 16px;"><strong>Subiect:</strong> ' + escapeHtml(subject) + '</p>' +
            '<div style="padding:16px;border-radius:12px;background:#211915;border:1px solid #352923;white-space:pre-wrap;line-height:1.6;">' + escapeHtml(message) + '</div>' +
        '</div>';

    const confirmationHtml = buildCardEmail(
        'Am primit mesajul tau',
        'Iti multumim ca ne-ai contactat. Iti vom raspunde in cel mai scurt timp.',
        'Inapoi la site',
        String(BASE_URL()).replace(/\/$/, '') + '/html/pages/index.html#contact',
        'Acesta este un mesaj automat de confirmare din partea CNote.'
    );

    await sendMail(CONTACT_TO(), `CNote Contact: ${subject}`, adminHtml);
    await sendMail(from, 'Am primit mesajul tau - CNote', confirmationHtml);
    return true;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;');
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendTwoFactorEmail,
    sendContactEmail,
    getTransporter
};
