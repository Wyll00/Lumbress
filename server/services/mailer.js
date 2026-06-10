const nodemailer = require('nodemailer');

// Configurado solo si hay host + credenciales en server/.env
const isConfigured = () =>
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
    if (!isConfigured()) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // 465 => true, 587 => false (STARTTLS)
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    }
    return transporter;
};

const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Envía un aviso "urgente" de nuevo mensaje al destinatario.
 * Fire-and-forget: registra errores pero NUNCA lanza, para no romper el envío del mensaje.
 */
async function sendNewMessageEmail({ toEmail, toName, fromName, preview } = {}) {
    if (!isConfigured()) {
        console.warn('[mail] SMTP sin configurar (SMTP_HOST/SMTP_USER/SMTP_PASS en server/.env); se omite el aviso por email.');
        return;
    }
    if (!toEmail) return;

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const from = process.env.MAIL_FROM || 'Lumbres <no-reply@lumbres.app>';
    const sender = fromName || 'alguien';
    const snippet = (preview || '').slice(0, 160);

    const subject = `🔴 URGENTE: Nuevo mensaje de @${sender} en Lumbres`;

    const text =
        `Hola ${toName || ''},\n\n` +
        `Tienes un nuevo mensaje URGENTE de @${sender} en Lumbres:\n\n` +
        `"${snippet}"\n\n` +
        `Ábrelo aquí: ${appUrl}/mensajes\n\n— Lumbres`;

    const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#1a1410;padding:24px;color:#f5efe6">
      <div style="max-width:520px;margin:0 auto;background:#241b14;border:1px solid #e0a93b33;border-radius:16px;overflow:hidden">
        <div style="background:#e0a93b;color:#1a1410;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.5px">
          🔴 URGENTE · CÓDICE
        </div>
        <div style="padding:24px">
          <p style="margin:0 0 8px;font-size:16px">Hola <strong>${escapeHtml(toName || '')}</strong>,</p>
          <p style="margin:0 0 16px;color:#cbbfa9">Tienes un <strong style="color:#f1c40f">nuevo mensaje</strong> de
            <strong>@${escapeHtml(sender)}</strong>:</p>
          <blockquote style="margin:0 0 20px;padding:14px 16px;background:#1a1410;border-left:3px solid #e0a93b;border-radius:8px;color:#f5efe6">
            ${escapeHtml(snippet) || '(mensaje)'}
          </blockquote>
          <a href="${appUrl}/mensajes" style="display:inline-block;background:#e0a93b;color:#1a1410;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">
            Leer el mensaje &rarr;
          </a>
        </div>
      </div>
      <p style="text-align:center;color:#6b5e4a;font-size:12px;margin-top:16px">Lumbres · Lecturas Sociales</p>
    </div>`;

    try {
        const info = await getTransporter().sendMail({
            from,
            to: toEmail,
            subject,
            text,
            html,
            priority: 'high', // cabeceras X-Priority / Importance: high
        });
        console.log(`[mail] Aviso enviado a ${toEmail} (messageId: ${info.messageId})`);
    } catch (err) {
        console.error('[mail] Error enviando el aviso por email:', err.message);
    }
}

module.exports = { sendNewMessageEmail, isConfigured };
