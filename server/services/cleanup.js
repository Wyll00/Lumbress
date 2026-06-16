const pool = require('../db');

// Horas que damos para verificar antes de borrar la cuenta abandonada/falsa.
// Entero saneado (va inline en el SQL porque MySQL no acepta ? en el INTERVAL).
const HOURS = Math.max(1, parseInt(process.env.UNVERIFIED_TTL_HOURS, 10) || 24);

// Borra cuentas sin verificar más antiguas que HOURS (y sus etiquetas sembradas, si las hubiera).
// Las cuentas verificadas y los datos reales NO se tocan.
async function purgeUnverified() {
    try {
        const [res] = await pool.query(
            `DELETE u, e
             FROM usuarios u
             LEFT JOIN etiquetas_literarias e ON e.usuario_id = u.id
             WHERE u.email_verified = 0
               AND u.created_at < (NOW() - INTERVAL ${HOURS} HOUR)`
        );
        if (res.affectedRows > 0) {
            console.log(`[cleanup] Cuentas sin verificar purgadas (filas afectadas: ${res.affectedRows})`);
        }
    } catch (err) {
        console.error('[cleanup] Error purgando cuentas sin verificar:', err.message);
    }
}

// Ejecuta al arrancar (tras un pequeño retardo) y luego cada 6 horas.
function startCleanupScheduler() {
    setTimeout(purgeUnverified, 30 * 1000);
    setInterval(purgeUnverified, 6 * 60 * 60 * 1000);
}

module.exports = { startCleanupScheduler, purgeUnverified };
