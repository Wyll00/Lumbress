// Crea el producto "Lumbres Premium" con precio mensual y anual en Stripe (modo TEST),
// y deja configurado el Customer Portal (gestionar/cancelar sin tocar el Dashboard).
// Uso: desde la carpeta server/  ->  node scripts/setup_stripe.js
// Requiere STRIPE_SECRET_KEY (sk_test_...) en server/.env

require('dotenv').config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error('Falta STRIPE_SECRET_KEY en server/.env');
    process.exit(1);
}
const stripe = require('stripe')(stripeKey);

(async () => {
    console.log('Creando "Lumbres Premium" (mensual + anual) en Stripe...\n');

    const product = await stripe.products.create({
        name: 'Lumbres Premium',
        description: 'Biblioteca ilimitada, anotaciones, sincronización y estadísticas.',
    });

    const monthly = await stripe.prices.create({
        product: product.id,
        unit_amount: 499, // 4,99 €/mes
        currency: 'eur',
        recurring: { interval: 'month' },
        nickname: 'Premium mensual',
    });
    const yearly = await stripe.prices.create({
        product: product.id,
        unit_amount: 4499, // 44,99 €/año (≈ 2 meses gratis)
        currency: 'eur',
        recurring: { interval: 'year' },
        nickname: 'Premium anual',
    });

    console.log(`  Producto: ${product.id}`);
    console.log(`  Mensual:  ${monthly.id} (4,99 €/mes)`);
    console.log(`  Anual:    ${yearly.id} (44,99 €/año)`);

    // Customer Portal: permitir cancelar y cambiar entre mensual/anual
    await stripe.billingPortal.configurations.create({
        business_profile: { headline: 'Lumbres — gestiona tu suscripción' },
        features: {
            customer_update: { enabled: true, allowed_updates: ['email'] },
            invoice_history: { enabled: true },
            payment_method_update: { enabled: true },
            subscription_cancel: { enabled: true, mode: 'at_period_end' },
            subscription_update: {
                enabled: true,
                default_allowed_updates: ['price'],
                products: [{ product: product.id, prices: [monthly.id, yearly.id] }],
            },
        },
    });
    console.log('  Customer Portal configurado ✓');

    console.log('\nCopia estas líneas en server/.env y reinicia el backend:\n');
    console.log(`STRIPE_PRICE_PREMIUM_MES=${monthly.id}`);
    console.log(`STRIPE_PRICE_PREMIUM_ANO=${yearly.id}`);
})().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
