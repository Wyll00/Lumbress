const pool = require('../db');

// ===== INTERRUPTOR DE SUSCRIPCIONES (cobro) =====
// false = fase gratis: TODOS los usuarios son premium (sin límites de libros ni
// almacenamiento). Pon true (aquí Y en SUBSCRIPTIONS_ENABLED de src/config.js)
// para reactivar el cobro. Se puede forzar por .env: SUBSCRIPTIONS_ENABLED=true
const SUBSCRIPTIONS_ENABLED = process.env.SUBSCRIPTIONS_ENABLED === 'true';

// Límites por plan (doc: estrategia de suscripción). Ajustables por .env sin tocar código.
const LIMITS = {
    free: {
        maxBooks: Number(process.env.FREE_MAX_BOOKS || 5),
        maxStorageBytes: Number(process.env.FREE_MAX_STORAGE_MB || 500) * 1024 * 1024,
    },
    premium: {
        maxBooks: Infinity,
        maxStorageBytes: Number(process.env.PREMIUM_MAX_STORAGE_GB || 20) * 1024 * 1024 * 1024,
    },
};

// Lee el plan efectivo del usuario (usuarios.plan lo mantienen el webhook/sync de Stripe).
async function getPlan(userId) {
    const [rows] = await pool.query('SELECT plan, plan_status, storage_used_bytes FROM usuarios WHERE id = ?', [userId]);
    const storageUsed = Number(rows[0]?.storage_used_bytes) || 0;
    // Fase gratis (cobro desactivado): todos premium, sin límites.
    const plan = !SUBSCRIPTIONS_ENABLED ? 'premium' : (rows[0]?.plan === 'premium' ? 'premium' : 'free');
    return { plan, status: rows[0]?.plan_status || null, storageUsed, limits: LIMITS[plan] };
}

// Middleware: bloquea la ruta si el usuario no es premium (respuesta 402 con CTA de upgrade).
function requirePremium(req, res, next) {
    getPlan(req.user.id)
        .then(({ plan }) => {
            if (plan !== 'premium') {
                return res.status(402).json({ code: 'PREMIUM_REQUIRED', message: 'Esta función es de Lumbres Premium.' });
            }
            next();
        })
        .catch(next);
}

module.exports = { LIMITS, getPlan, requirePremium };
