const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/authors/search?q=carlos
// Sugerencias de autores vía Open Library (gratis, sin API key).
// A prueba de fallos: ante cualquier error devuelve [] para que el campo siga siendo texto libre.
router.get('/search', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    try {
        const url = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(q)}&limit=10`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const r = await fetch(url, {
            headers: { 'User-Agent': 'Lumbres/0.9 (lecturas-sociales)' },
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!r.ok) return res.json([]);
        const data = await r.json();

        const seen = new Set();
        const results = [];
        for (const d of (data.docs || [])) {
            const name = (d.name || '').replace(/\s+/g, ' ').trim();
            if (!name) continue;
            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            results.push({
                name,
                topWork: (d.top_work || '').trim() || null,
                workCount: d.work_count || 0,
            });
            if (results.length >= 8) break;
        }

        res.json(results);
    } catch (err) {
        console.error('[authors] Error buscando autores:', err.message);
        res.json([]);
    }
});

module.exports = router;
