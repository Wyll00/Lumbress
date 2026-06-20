// Comprueba que la API responde y avisa por email al admin si se cae (o se recupera).
// Pensado para ejecutarse por cron en el VPS, p. ej. cada 5 minutos:
//   */5 * * * * cd /var/www/lumbres/server && /usr/bin/node scripts/healthcheck.js >> /var/log/lumbres-health.log 2>&1
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const pool = require('../db');
const { sendAlert, isConfigured } = require('../services/mailer');

const URL = process.env.HEALTHCHECK_URL || 'https://lumbress.com/api/health';
const STATE_FILE = path.join(os.tmpdir(), 'lumbres_health.state');

const readState = () => { try { return fs.readFileSync(STATE_FILE, 'utf8').trim(); } catch { return 'ok'; } };
const writeState = (s) => { try { fs.writeFileSync(STATE_FILE, s); } catch { /* noop */ } };

async function getAdminEmail() {
    try {
        const [r] = await pool.query('SELECT email FROM usuarios WHERE is_admin = 1 ORDER BY id LIMIT 1');
        return r[0]?.email || null;
    } catch { return null; }
}

(async () => {
    let ok = false;
    let detalle = '';
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const r = await fetch(URL, { signal: ctrl.signal });
        clearTimeout(t);
        ok = r.ok;
        detalle = `HTTP ${r.status}`;
    } catch (e) {
        ok = false;
        detalle = e.name === 'AbortError' ? 'sin respuesta (timeout)' : e.message;
    }

    const prev = readState();
    const now = ok ? 'ok' : 'down';
    console.log(`[health] ${new Date().toISOString()} ${URL} -> ${now} (${detalle})`);

    // Solo avisamos cuando cambia el estado (caída o recuperación), no en cada chequeo.
    if (now !== prev) {
        writeState(now);
        const email = await getAdminEmail();
        if (email && isConfigured()) {
            const cuando = new Date().toLocaleString('es-ES');
            if (now === 'down') {
                await sendAlert({
                    toEmail: email,
                    subject: '🔴 Lumbres CAÍDA — la web no responde',
                    text: `El chequeo a ${URL} ha fallado.\nDetalle: ${detalle}\nHora: ${cuando}\n\nRevisa el servidor (pm2, MariaDB, nginx).\n\n— Monitor de Lumbres`,
                });
            } else {
                await sendAlert({
                    toEmail: email,
                    subject: '✅ Lumbres recuperada — la web vuelve a responder',
                    text: `La web vuelve a estar disponible.\nDetalle: ${detalle}\nHora: ${cuando}\n\n— Monitor de Lumbres`,
                });
            }
        }
    }
    process.exit(0);
})();
