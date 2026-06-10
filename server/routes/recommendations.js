const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/recommendations
// "Más libros de tus autores favoritos" — mira los autores que más lees y busca
// otras obras suyas en Open Library, descartando las que ya tienes. A prueba de fallos.
router.get('/', async (req, res) => {
    try {
        const [books] = await pool.query('SELECT titulo, autor FROM libros WHERE usuario_id = ?', [req.user.id]);
        if (books.length === 0) return res.json([]);

        const ownedTitles = new Set(books.map((b) => (b.titulo || '').toLowerCase().replace(/\s+/g, ' ').trim()));
        const authorCount = {};
        for (const b of books) {
            const a = (b.autor || '').replace(/\s+/g, ' ').trim();
            if (a) authorCount[a] = (authorCount[a] || 0) + 1;
        }
        const topAuthors = Object.entries(authorCount).sort((x, y) => y[1] - x[1]).slice(0, 4).map((e) => e[0]);
        if (topAuthors.length === 0) return res.json([]);

        const seen = new Set();
        const recs = [];
        const fields = 'title,author_name,cover_i,first_publish_year,number_of_pages_median,key';

        for (const author of topAuthors) {
            try {
                const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&fields=${fields}&limit=20`;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 6000);
                const r = await fetch(url, {
                    headers: { 'User-Agent': 'Lumbres/0.9 (lecturas-sociales)' },
                    signal: controller.signal,
                });
                clearTimeout(timer);
                if (!r.ok) continue;
                const data = await r.json();

                // Por autor: primero los que tienen portada, máx. 4 nuevos
                const docs = (data.docs || []).slice().sort((a, b) => (b.cover_i ? 1 : 0) - (a.cover_i ? 1 : 0));
                let perAuthor = 0;
                for (const d of docs) {
                    if (perAuthor >= 4) break;
                    const title = (d.title || '').replace(/\s+/g, ' ').trim();
                    if (!title) continue;
                    const tkey = title.toLowerCase();
                    if (ownedTitles.has(tkey) || seen.has(tkey)) continue;
                    seen.add(tkey);
                    recs.push({
                        title,
                        author,
                        coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
                        year: d.first_publish_year || null,
                        totalPages: d.number_of_pages_median || null,
                        key: typeof d.key === 'string' ? d.key : null,
                        reason: author,
                    });
                    perAuthor += 1;
                }
            } catch { /* siguiente autor */ }
        }

        res.json(recs.slice(0, 12));
    } catch (err) {
        console.error('[recommendations] error:', err.message);
        res.json([]);
    }
});

module.exports = router;
