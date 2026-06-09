const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/geo-search?q=...
// Autocompletado de direcciones vía Photon (Komoot / OpenStreetMap). Gratis, sin API key.
// Nota: el instancia pública de Photon tiene uso razonable; para producción a escala conviene
// auto-hospedar Photon/Nominatim o usar un proveedor de pago (Google/Mapbox).
// A prueba de fallos: ante cualquier error devuelve [].
router.get('/', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 3) return res.json([]);

    try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const r = await fetch(url, {
            headers: { 'User-Agent': 'Codice/0.9 (lecturas-sociales)' },
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!r.ok) return res.json([]);
        const data = await r.json();

        const seen = new Set();
        const results = [];
        for (const f of (data.features || [])) {
            const p = f.properties || {};
            const street = p.street || p.name || '';
            const direccion = [street, p.housenumber].filter(Boolean).join(' ').trim();
            const ciudad = p.city || p.town || p.village || p.municipality || p.county || '';
            const label = [direccion || p.name, p.postcode, ciudad, p.state, p.country]
                .filter(Boolean).join(', ');
            if (!label || seen.has(label)) continue;
            seen.add(label);
            results.push({
                label,
                direccion: direccion || p.name || '',
                codigo_postal: p.postcode || '',
                ciudad,
                provincia: p.state || '',
                pais: p.country || '',
            });
            if (results.length >= 6) break;
        }

        res.json(results);
    } catch (err) {
        console.error('[geo-search] Error buscando direcciones:', err.message);
        res.json([]);
    }
});

module.exports = router;
