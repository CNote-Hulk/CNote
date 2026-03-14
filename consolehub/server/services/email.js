const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return transporter;
}

async function sendListingDMEmail({ toEmail, ownerName, buyerName, listingTitle, listingPrice, messageContent, conversationLink }) {
    const t = getTransporter();
    if (!t) return;

    await t.sendMail({
        from: `"CNote" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Ai un mesaj nou pe CNote!',
        text:
`Salut ${ownerName},

${buyerName} este interesat de anunțul tău:
👉 ${listingTitle} — ${listingPrice} lei

Mesaj: "${messageContent}"

Răspunde aici: ${conversationLink}

— Echipa CNote`,
        html:
`<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#13141c;color:#e8eaf6;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.05)">
  <div style="background:linear-gradient(135deg,#5b73ff 0%,#3b4fd4 100%);padding:24px 28px">
    <h1 style="margin:0;font-size:20px;color:#fff"><span style="opacity:.7">C:</span>Note</h1>
  </div>
  <div style="padding:28px">
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Salut <strong>${ownerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6"><strong>${buyerName}</strong> este interesat de anunțul tău:</p>
    <div style="background:#1a1c27;border-radius:8px;padding:16px;margin:0 0 16px;border-left:3px solid #5b73ff">
      <p style="margin:0;font-size:14px;color:#9da3c2">👉 <strong style="color:#fff">${listingTitle}</strong> — <span style="color:#5b73ff;font-weight:700">${listingPrice} lei</span></p>
    </div>
    <div style="background:#1a1c27;border-radius:8px;padding:16px;margin:0 0 24px">
      <p style="margin:0;font-size:14px;color:#9da3c2">Mesaj:</p>
      <p style="margin:8px 0 0;font-size:14px;color:#e8eaf6;font-style:italic">"${messageContent}"</p>
    </div>
    <a href="${conversationLink}" style="display:inline-block;background:#5b73ff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px">Răspunde acum →</a>
  </div>
  <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
    <p style="margin:0;font-size:12px;color:#555">© ${new Date().getFullYear()} CNote · Console Community Hub</p>
  </div>
</div>`,
    });
}

module.exports = { sendListingDMEmail };
