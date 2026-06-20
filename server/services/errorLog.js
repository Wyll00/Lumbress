const crypto = require('crypto');
const pool = require('../db');
const { sendAlert, isConfigured } = require('./mailer');

// Email del admin (cacheado 1h para no consultar la BD en cada error).
let adminEmail = null;
let adminEmailAt = 0;
async function getAdminEmail() {
    if (adminEmail && Date.now() - adminEmailAt < 3600000) return adminEmail;
    try {
        const [r] = await pool.query('SELECT email FROM usuarios WHERE is_admin = 1 ORDER BY id LIMIT 1');
        adminEmail = r[0]?.email || null;
        adminEmailAt = Date.now();
    } catch { /* noop */ }
    return adminEmail;
}

// Tope de emails de error por hora (anti-spam): registramos todos en BD, pero avisamos como mucho 6/h.
let emailsHora = 0;
let horaInicio = Date.now();
function puedeEmail() {
    if (Date.now() - horaInicio > 3600000) { horaInicio = Date.now(); emailsHora = 0; }
    if (emailsHora >= 6) return false;
    emailsHora += 1;
    return true;
}

// Registra un error agrupándolo por "huella" (mensaje+ruta). Avisa por email solo
// la primera vez que aparece una huella nueva. Nunca lanza (no debe romper nada).
async function logError(err, ctx = {}) {
    try {
        const mensaje = String(err?.message || err || 'Error desconocido').slice(0, 1000);
        const stack = String(err?.stack || '').slice(0, 4000);
        const ruta = String(ctx.ruta || '').slice(0, 255);
        const metodo = String(ctx.metodo || '').slice(0, 8);
        const status = Number(ctx.status) || 500;
        const usuarioId = ctx.usuarioId || null;
        const huella = crypto.createHash('sha256').update(`${mensaje}|${ruta}`).digest('hex').slice(0, 64);

        const [res] = await pool.query(
            `INSERT INTO errores (huella, mensaje, stack, ruta, metodo, status, usuario_id, veces, primera_vez, ultima_vez, resuelto)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), 0)
             ON DUPLICATE KEY UPDATE
                veces = veces + 1, ultima_vez = NOW(), resuelto = 0,
                mensaje = VALUES(mensaje), stack = VALUES(stack), status = VALUES(status), usuario_id = VALUES(usuario_id)`,
            [huella, mensaje, stack, ruta, metodo, status, usuarioId]
        );

        // affectedRows === 1 → fila nueva (huella nunca vista) → avisar
        if (res.affectedRows === 1 && isConfigured() && puedeEmail()) {
            const toEmail = await getAdminEmail();
            if (toEmail) {
                const appUrl = process.env.APP_URL || 'https://lumbress.com';
                sendAlert({
                    toEmail,
                    subject: `⚠️ Nuevo error en Lumbres: ${mensaje.slice(0, 70)}`,
                    text:
                        `Se ha registrado un error NUEVO en Lumbres.\n\n` +
                        `Mensaje: ${mensaje}\n` +
                        `Dónde: ${metodo} ${ruta}\n` +
                        `Estado: ${status}\n` +
                        `Hora: ${new Date().toLocaleString('es-ES')}\n\n` +
                        `Revísalo en tu panel: ${appUrl}/admin\n\n— Monitor de Lumbres`,
                }).catch(() => { /* noop */ });
            }
        }
    } catch { /* el registro de errores jamás debe romper nada */ }
}

module.exports = { logError };
