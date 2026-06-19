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

// Días que conservamos los registros de tráfico (analítica). Más antiguos se borran.
const TRAFFIC_TTL_DAYS = Math.max(1, parseInt(process.env.TRAFFIC_TTL_DAYS, 10) || 90);

// Borra registros de tráfico antiguos para que la tabla no crezca sin límite.
async function purgeTraffic() {
    try {
        const [res] = await pool.query(
            `DELETE FROM trafico WHERE created_at < (NOW() - INTERVAL ${TRAFFIC_TTL_DAYS} DAY)`
        );
        if (res.affectedRows > 0) {
            console.log(`[cleanup] Tráfico antiguo purgado (filas afectadas: ${res.affectedRows})`);
        }
    } catch (err) {
        // La tabla puede no existir aún en un entorno recién creado: no es crítico.
        if (err.code !== 'ER_NO_SUCH_TABLE') console.error('[cleanup] Error purgando tráfico:', err.message);
    }
}

// Ejecuta al arrancar (tras un pequeño retardo) y luego cada 6 horas.
function startCleanupScheduler() {
    setTimeout(purgeUnverified, 30 * 1000);
    setTimeout(purgeTraffic, 45 * 1000);
    setInterval(purgeUnverified, 6 * 60 * 60 * 1000);
    setInterval(purgeTraffic, 12 * 60 * 60 * 1000);
}

module.exports = { startCleanupScheduler, purgeUnverified, purgeTraffic };
