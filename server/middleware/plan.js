const pool = require('../db');

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
    const plan = rows[0]?.plan === 'premium' ? 'premium' : 'free';
    return { plan, status: rows[0]?.plan_status || null, storageUsed: Number(rows[0]?.storage_used_bytes) || 0, limits: LIMITS[plan] };
}

// Middleware: bloquea la ruta si el usuario no es premium (respuesta 402 con CTA de upgrade).
function requirePremium(req, res, next) {
    getPlan(req.user.id)
        .then(({ plan }) => {
            if (plan !== 'premium') {
                return res.status(402).json({ code: 'PREMIUM_REQUIRED', message: 'Esta función es de Códice Premium.' });
            }
            next();
        })
        .catch(next);
}

module.exports = { LIMITS, getPlan, requirePremium };
