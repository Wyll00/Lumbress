// Crea los productos y precios de las suscripciones en Stripe (modo TEST) y muestra los Price IDs.
// Uso: desde la carpeta server/  ->  node scripts/setup_stripe.js
// Requiere STRIPE_SECRET_KEY (sk_test_...) en server/.env

require('dotenv').config();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
    console.error('Falta STRIPE_SECRET_KEY en server/.env');
    process.exit(1);
}
const stripe = require('stripe')(stripeKey);

const plans = [
    { key: 'lector', name: 'Plan Lector', amount: 1599 },
    { key: 'bibliofilo', name: 'Plan Bibliófilo', amount: 2399 },
    { key: 'coleccionista', name: 'Plan Coleccionista', amount: 2999 },
];

(async () => {
    console.log('Creando productos y precios en Stripe (EUR, mensual)...\n');
    const lines = [];
    for (const p of plans) {
        const product = await stripe.products.create({ name: p.name });
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: p.amount,
            currency: 'eur',
            recurring: { interval: 'month' },
        });
        lines.push(`STRIPE_PRICE_${p.key.toUpperCase()}=${price.id}`);
        console.log(`  ${p.name}: ${price.id}`);
    }
    console.log('\nCopia estas líneas en server/.env y reinicia el backend:\n');
    console.log(lines.join('\n'));
})().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
});
