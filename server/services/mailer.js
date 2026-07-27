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

/**
 * Envía el código de verificación de cuenta (6 dígitos) al correo de registro.
 * Si el SMTP no está configurado, registra el código en consola (útil en desarrollo)
 * y devuelve false para que el endpoint pueda avisar.
 */
async function sendVerificationCode({ toEmail, toName, code } = {}) {
    if (!isConfigured()) {
        console.warn(`[mail] SMTP sin configurar — código de verificación para ${toEmail}: ${code}`);
        return false;
    }
    if (!toEmail || !code) return false;

    const from = process.env.MAIL_FROM || 'Lumbres <no-reply@lumbres.app>';
    const subject = `Tu código de Lumbres: ${code}`;
    const text =
        `Hola ${toName || ''},\n\n` +
        `Tu código de verificación de Lumbres es: ${code}\n\n` +
        `Caduca en 15 minutos. Si no creaste esta cuenta, ignora este correo.\n\n— Lumbres`;

    const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#1a1410;padding:24px;color:#f5efe6">
      <div style="max-width:520px;margin:0 auto;background:#241b14;border:1px solid #e0a93b33;border-radius:16px;overflow:hidden">
        <div style="background:#e0a93b;color:#1a1410;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.5px">
          🔥 LUMBRES · Verifica tu cuenta
        </div>
        <div style="padding:28px 24px;text-align:center">
          <p style="margin:0 0 6px;font-size:16px">Hola <strong>${escapeHtml(toName || '')}</strong>,</p>
          <p style="margin:0 0 20px;color:#cbbfa9">Tu código de verificación es:</p>
          <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#f1c40f;background:#1a1410;border:1px solid #e0a93b55;border-radius:12px;padding:18px 0;margin:0 0 18px">
            ${escapeHtml(code)}
          </div>
          <p style="margin:0;color:#6b5e4a;font-size:13px">Caduca en 15 minutos. Si no creaste esta cuenta, ignora este correo.</p>
        </div>
      </div>
      <p style="text-align:center;color:#6b5e4a;font-size:12px;margin-top:16px">Lumbres · Lecturas Sociales</p>
    </div>`;

    try {
        const info = await getTransporter().sendMail({ from, to: toEmail, subject, text, html });
        console.log(`[mail] Código de verificación enviado a ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        console.error('[mail] Error enviando el código de verificación:', err.message);
        return false;
    }
}

/**
 * Envía el código para restablecer la contraseña (6 dígitos).
 * Si el SMTP no está configurado, registra el código en consola (útil en desarrollo)
 * y devuelve false.
 */
async function sendPasswordResetCode({ toEmail, toName, code } = {}) {
    if (!isConfigured()) {
        console.warn(`[mail] SMTP sin configurar — código de recuperación para ${toEmail}: ${code}`);
        return false;
    }
    if (!toEmail || !code) return false;

    const from = process.env.MAIL_FROM || 'Lumbres <no-reply@lumbres.app>';
    const subject = `Código para recuperar tu contraseña: ${code}`;
    const text =
        `Hola ${toName || ''},\n\n` +
        `Tu código para restablecer la contraseña de Lumbres es: ${code}\n\n` +
        `Caduca en 15 minutos. Si no has pedido cambiarla, ignora este correo: ` +
        `tu contraseña seguirá siendo la misma.\n\n— Lumbres`;

    const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#1a1410;padding:24px;color:#f5efe6">
      <div style="max-width:520px;margin:0 auto;background:#241b14;border:1px solid #e0a93b33;border-radius:16px;overflow:hidden">
        <div style="background:#e0a93b;color:#1a1410;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.5px">
          🔥 LUMBRES · Recuperar contraseña
        </div>
        <div style="padding:28px 24px;text-align:center">
          <p style="margin:0 0 6px;font-size:16px">Hola <strong>${escapeHtml(toName || '')}</strong>,</p>
          <p style="margin:0 0 20px;color:#cbbfa9">Tu código para restablecer la contraseña es:</p>
          <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#f1c40f;background:#1a1410;border:1px solid #e0a93b55;border-radius:12px;padding:18px 0;margin:0 0 18px">
            ${escapeHtml(code)}
          </div>
          <p style="margin:0;color:#6b5e4a;font-size:13px">Caduca en 15 minutos. Si no has pedido cambiarla, ignora este correo: tu contraseña seguirá siendo la misma.</p>
        </div>
      </div>
      <p style="text-align:center;color:#6b5e4a;font-size:12px;margin-top:16px">Lumbres · Lecturas Sociales</p>
    </div>`;

    try {
        const info = await getTransporter().sendMail({ from, to: toEmail, subject, text, html });
        console.log(`[mail] Código de recuperación enviado a ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        console.error('[mail] Error enviando el código de recuperación:', err.message);
        return false;
    }
}

/**
 * Aviso al dueño de un correo cuando alguien intenta registrarse con él.
 * Se usa para NO revelar en el registro si un correo ya tiene cuenta (anti-enumeración):
 * la respuesta al que se registra es idéntica exista o no, pero al dueño real le llega
 * esta guía. Fire-and-forget: nunca lanza.
 */
async function sendAccountExistsNotice({ toEmail, toName } = {}) {
    if (!isConfigured() || !toEmail) return false;
    const from = process.env.MAIL_FROM || 'Lumbres <no-reply@lumbres.app>';
    const subject = 'Ya tienes una cuenta en Lumbres';
    const text =
        `Hola ${toName || ''},\n\n` +
        `Alguien ha intentado registrarse en Lumbres con este correo, que ya tiene una cuenta.\n\n` +
        `Si fuiste tú, no necesitas crear otra: inicia sesión con tu contraseña, o usa ` +
        `"¿Olvidaste tu contraseña?" si no la recuerdas.\n\n` +
        `Si no fuiste tú, puedes ignorar este correo con tranquilidad: tu cuenta sigue segura.\n\n— Lumbres`;
    const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#1a1410;padding:24px;color:#f5efe6">
      <div style="max-width:520px;margin:0 auto;background:#241b14;border:1px solid #e0a93b33;border-radius:16px;overflow:hidden">
        <div style="background:#e0a93b;color:#1a1410;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.5px">
          🔥 LUMBRES · Ya tienes una cuenta
        </div>
        <div style="padding:26px 24px">
          <p style="margin:0 0 12px;font-size:16px">Hola <strong>${escapeHtml(toName || '')}</strong>,</p>
          <p style="margin:0 0 12px;color:#cbbfa9">Alguien ha intentado registrarse en Lumbres con este correo, que <strong>ya tiene una cuenta</strong>.</p>
          <p style="margin:0 0 12px;color:#cbbfa9">Si fuiste tú, no necesitas crear otra: inicia sesión con tu contraseña, o usa <strong>«¿Olvidaste tu contraseña?»</strong> si no la recuerdas.</p>
          <p style="margin:0;color:#6b5e4a;font-size:13px">Si no fuiste tú, ignora este correo con tranquilidad: tu cuenta sigue segura.</p>
        </div>
      </div>
      <p style="text-align:center;color:#6b5e4a;font-size:12px;margin-top:16px">Lumbres · Lecturas Sociales</p>
    </div>`;
    try {
        const info = await getTransporter().sendMail({ from, to: toEmail, subject, text, html });
        console.log(`[mail] Aviso "ya tienes cuenta" enviado a ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        console.error('[mail] Error enviando el aviso de cuenta existente:', err.message);
        return false;
    }
}

/**
 * Aviso genérico para el administrador (errores, caídas, etc.).
 * Fire-and-forget: registra errores pero nunca lanza.
 */
async function sendAlert({ toEmail, subject, text } = {}) {
    if (!isConfigured() || !toEmail) {
        if (!isConfigured()) console.warn('[mail] SMTP sin configurar; se omite el aviso al admin.');
        return false;
    }
    const from = process.env.MAIL_FROM || 'Lumbres <no-reply@lumbres.app>';
    const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#1a1410;padding:24px;color:#f5efe6">
      <div style="max-width:560px;margin:0 auto;background:#241b14;border:1px solid #e0a93b33;border-radius:16px;overflow:hidden">
        <div style="background:#e0a93b;color:#1a1410;padding:14px 20px;font-weight:800;font-size:14px;letter-spacing:.5px">
          🔔 LUMBRES · Aviso de administración
        </div>
        <div style="padding:24px">
          <pre style="margin:0;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#f5efe6">${escapeHtml(text || '')}</pre>
        </div>
      </div>
    </div>`;
    try {
        const info = await getTransporter().sendMail({ from, to: toEmail, subject, text, html, priority: 'high' });
        console.log(`[mail] Aviso al admin enviado a ${toEmail} (messageId: ${info.messageId})`);
        return true;
    } catch (err) {
        console.error('[mail] Error enviando el aviso al admin:', err.message);
        return false;
    }
}

module.exports = { sendNewMessageEmail, sendVerificationCode, sendPasswordResetCode, sendAccountExistsNotice, sendAlert, isConfigured };
