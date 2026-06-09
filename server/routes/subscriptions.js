const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

// Stripe se inicializa solo si hay clave; así el backend arranca aunque aún no esté configurado.
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require('stripe')(stripeKey) : null;

// Modelo Free + Premium: un producto con dos precios (mensual/anual) desde .env
const PRICES = {
    month: process.env.STRIPE_PRICE_PREMIUM_MES,
    year: process.env.STRIPE_PRICE_PREMIUM_ANO,
};
// Planes de pago antiguos (lector/bibliofilo/coleccionista): se tratan como premium.
const LEGACY_PRICES = [
    process.env.STRIPE_PRICE_LECTOR,
    process.env.STRIPE_PRICE_BIBLIOFILO,
    process.env.STRIPE_PRICE_COLECCIONISTA,
].filter(Boolean);

const planByPrice = (priceId) => {
    if (!priceId) return null;
    if (priceId === PRICES.month || priceId === PRICES.year || LEGACY_PRICES.includes(priceId)) return 'premium';
    return null;
};
const intervalByPrice = (priceId) => (priceId === PRICES.year ? 'year' : 'month');
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Estado efectivo del usuario: con suscripción viva -> premium; si no -> free.
const LIVE_STATUSES = ['active', 'trialing', 'past_due'];
async function applyPlanToUser(uid, plan, status) {
    const effective = plan && LIVE_STATUSES.includes(status) ? 'premium' : 'free';
    await pool.query('UPDATE usuarios SET plan = ?, plan_status = ? WHERE id = ?', [effective, status || null, uid]);
    return effective;
}

const router = express.Router();
router.use(auth);

// POST /api/subscriptions/checkout  { interval: 'month'|'year' } -> { url } (Stripe Checkout alojado)
router.post('/checkout', async (req, res) => {
    if (!stripe) return res.status(503).json({ message: 'Stripe no está configurado (falta STRIPE_SECRET_KEY).' });
    const interval = req.body.interval === 'year' ? 'year' : 'month';
    const priceId = PRICES[interval];
    if (!priceId) return res.status(400).json({ message: 'Precio no configurado (ejecuta scripts/setup_stripe.js).' });

    try {
        // Reutilizar/crear el customer de Stripe del usuario
        const [rows] = await pool.query('SELECT stripe_customer_id FROM suscripciones WHERE usuario_id = ?', [req.user.id]);
        let customerId = rows[0]?.stripe_customer_id || null;
        if (!customerId) {
            const [u] = await pool.query('SELECT email, username FROM usuarios WHERE id = ?', [req.user.id]);
            const customer = await stripe.customers.create({
                email: u[0]?.email || undefined,
                name: u[0]?.username || undefined,
                metadata: { usuario_id: String(req.user.id) },
            });
            customerId = customer.id;
            await pool.query(
                `INSERT INTO suscripciones (usuario_id, stripe_customer_id) VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE stripe_customer_id = VALUES(stripe_customer_id)`,
                [req.user.id, customerId]
            );
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${APP_URL}/subscriptions?success=1`,
            cancel_url: `${APP_URL}/subscriptions?canceled=1`,
            metadata: { usuario_id: String(req.user.id), plan: 'premium' },
            subscription_data: { metadata: { usuario_id: String(req.user.id), plan: 'premium' } },
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('[stripe] checkout error:', err.message);
        res.status(500).json({ message: 'No se pudo iniciar el pago.' });
    }
});

// GET /api/subscriptions/me -> plan efectivo + detalle de la suscripción (o plan free)
router.get('/me', async (req, res) => {
    try {
        const [u] = await pool.query('SELECT plan, plan_status, storage_used_bytes FROM usuarios WHERE id = ?', [req.user.id]);
        const [rows] = await pool.query(
            `SELECT plan, status, current_period_end, cancel_at_period_end
             FROM suscripciones WHERE usuario_id = ? AND stripe_subscription_id IS NOT NULL`,
            [req.user.id]
        );
        res.json({
            plan: u[0]?.plan || 'free',
            plan_status: u[0]?.plan_status || null,
            storage_used_bytes: Number(u[0]?.storage_used_bytes) || 0,
            subscription: rows[0] || null,
        });
    } catch (err) {
        console.error('[stripe] me error:', err.message);
        res.status(500).json({ message: 'Error' });
    }
});

// POST /api/subscriptions/portal -> { url } (portal de cliente de Stripe: gestionar/cancelar/cambiar mes-año)
router.post('/portal', async (req, res) => {
    if (!stripe) return res.status(503).json({ message: 'Stripe no está configurado.' });
    try {
        const [rows] = await pool.query('SELECT stripe_customer_id FROM suscripciones WHERE usuario_id = ?', [req.user.id]);
        const customerId = rows[0]?.stripe_customer_id;
        if (!customerId) return res.status(400).json({ message: 'No tienes suscripción todavía.' });
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${APP_URL}/subscriptions`,
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error('[stripe] portal error:', err.message);
        res.status(500).json({ message: 'No se pudo abrir el portal.' });
    }
});

// POST /api/subscriptions/sync -> lee la suscripción del usuario desde Stripe y la guarda (sin depender del webhook)
router.post('/sync', async (req, res) => {
    if (!stripe) return res.status(503).json({ message: 'Stripe no está configurado.' });
    try {
        const [rows] = await pool.query('SELECT stripe_customer_id FROM suscripciones WHERE usuario_id = ?', [req.user.id]);
        const customerId = rows[0]?.stripe_customer_id;
        if (!customerId) return res.json(null);

        const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 5 });
        const active = subs.data.find((s) => LIVE_STATUSES.includes(s.status)) || subs.data[0];
        if (!active) return res.json(null);

        const priceId = active.items?.data?.[0]?.price?.id;
        const plan = planByPrice(priceId) || (active.metadata?.plan ? 'premium' : null);
        const periodEnd = active.current_period_end ? new Date(active.current_period_end * 1000) : null;
        const cancelAtEnd = active.cancel_at_period_end ? 1 : 0;

        await pool.query(
            `INSERT INTO suscripciones (usuario_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                stripe_subscription_id = VALUES(stripe_subscription_id), plan = VALUES(plan), status = VALUES(status),
                current_period_end = VALUES(current_period_end), cancel_at_period_end = VALUES(cancel_at_period_end)`,
            [req.user.id, customerId, active.id, plan, active.status, periodEnd, cancelAtEnd]
        );
        const effective = await applyPlanToUser(req.user.id, plan, active.status);
        res.json({ plan: effective, status: active.status, interval: intervalByPrice(priceId), current_period_end: periodEnd, cancel_at_period_end: cancelAtEnd });
    } catch (err) {
        console.error('[stripe] sync error:', err.message);
        res.status(500).json({ message: 'Error sincronizando.' });
    }
});

// Webhook de Stripe — se monta en server.js con body CRUDO, ANTES de express.json().
async function webhook(req, res) {
    if (!stripe) return res.status(503).end();
    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
    } catch (err) {
        console.error('[stripe] firma de webhook inválida:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (['checkout.session.completed', 'customer.subscription.created',
             'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {

            let sub;
            if (event.type === 'checkout.session.completed') {
                const s = event.data.object;
                if (!s.subscription) return res.json({ received: true });
                sub = await stripe.subscriptions.retrieve(s.subscription);
            } else {
                sub = event.data.object;
            }

            const customerId = sub.customer;
            const priceId = sub.items?.data?.[0]?.price?.id;
            const plan = planByPrice(priceId) || (sub.metadata?.plan ? 'premium' : null);
            const status = event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status;
            const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
            const cancelAtEnd = sub.cancel_at_period_end ? 1 : 0;

            // Localizar al usuario: por metadata o por el customer guardado
            let uid = Number(sub.metadata?.usuario_id) || null;
            if (!uid && customerId) {
                const [r] = await pool.query('SELECT usuario_id FROM suscripciones WHERE stripe_customer_id = ?', [customerId]);
                uid = r[0]?.usuario_id || null;
            }

            if (uid) {
                await pool.query(
                    `INSERT INTO suscripciones (usuario_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        stripe_customer_id = VALUES(stripe_customer_id),
                        stripe_subscription_id = VALUES(stripe_subscription_id),
                        plan = VALUES(plan), status = VALUES(status),
                        current_period_end = VALUES(current_period_end),
                        cancel_at_period_end = VALUES(cancel_at_period_end)`,
                    [uid, customerId, sub.id, plan, status, periodEnd, cancelAtEnd]
                );
                const effective = await applyPlanToUser(uid, plan, status);
                console.log(`[stripe] suscripción ${status} -> plan ${effective} para usuario ${uid}`);
            }
        }
        res.json({ received: true });
    } catch (err) {
        console.error('[stripe] error procesando webhook:', err.message);
        res.status(500).end();
    }
}

module.exports = { router, webhook };
