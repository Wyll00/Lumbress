const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/book-search?q=...
// Busca libros en Open Library y devuelve título, autor, portada, año y páginas.
// A prueba de fallos: ante cualquier error devuelve [].
router.get('/', async (req, res) => {
    const q = (req.query.q || '').trim();
    if (q.length < 3) return res.json([]);

    try {
        const fields = 'key,title,author_name,cover_i,first_publish_year,number_of_pages_median';
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=${fields}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const r = await fetch(url, {
            headers: { 'User-Agent': 'Lumbres/0.9 (lecturas-sociales)' },
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!r.ok) return res.json([]);
        const data = await r.json();

        const results = (data.docs || []).map((d) => ({
            title: (d.title || '').replace(/\s+/g, ' ').trim(),
            author: Array.isArray(d.author_name) && d.author_name.length
                ? d.author_name[0].replace(/\s+/g, ' ').trim()
                : '',
            coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
            year: d.first_publish_year || null,
            totalPages: d.number_of_pages_median || null,
            key: typeof d.key === 'string' ? d.key : null, // /works/OL...W para el fallback de páginas
        })).filter((b) => b.title);

        res.json(results.slice(0, 8));
    } catch (err) {
        console.error('[book-search] Error buscando libros:', err.message);
        res.json([]);
    }
});

// GET /api/book-search/pages?key=/works/OL...W
// Fallback de páginas: cuando la búsqueda no trae number_of_pages_median, mira las ediciones del libro.
router.get('/pages', async (req, res) => {
    const key = (req.query.key || '').trim();
    if (!/^\/works\/OL\d+W$/.test(key)) return res.json({ totalPages: null });

    try {
        const url = `https://openlibrary.org${key}/editions.json?limit=40`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);

        const r = await fetch(url, {
            headers: { 'User-Agent': 'Lumbres/0.9 (lecturas-sociales)' },
            signal: controller.signal,
        });
        clearTimeout(timer);

        if (!r.ok) return res.json({ totalPages: null });
        const data = await r.json();

        const pages = (data.entries || [])
            .map((e) => Number(e.number_of_pages))
            .filter((n) => Number.isFinite(n) && n > 0)
            .sort((a, b) => a - b);

        if (pages.length === 0) return res.json({ totalPages: null });
        res.json({ totalPages: pages[Math.floor(pages.length / 2)] }); // mediana de las ediciones
    } catch (err) {
        console.error('[book-search/pages] Error:', err.message);
        res.json({ totalPages: null });
    }
});

module.exports = router;
