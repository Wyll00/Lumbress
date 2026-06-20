const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Catálogo de libros gratis y legales (dominio público) vía Project Gutenberg / Gutendex.
const CATALOG_DIR = path.join(__dirname, '..', 'uploads', 'catalogo');
const SUPPORTED_LANGS = ['es', 'en', 'fr', 'it', 'de', 'pt'];
const UA = 'Lumbres/1.0 (lectura social; https://lumbress.com)';

const epubOf = (b) => b.formats?.['application/epub+zip'] || b.formats?.['application/epub+zip; charset=utf-8'] || null;

function mapBook(b) {
    return {
        id: b.id,
        title: b.title,
        author: b.authors?.[0]?.name || 'Anónimo',
        cover: b.formats?.['image/jpeg'] || '',
        languages: b.languages || [],
        downloads: b.download_count || 0,
        hasEpub: !!epubOf(b),
    };
}

// GET /api/catalog/search?q=&lang=es&page=1 — busca en el catálogo (solo libros con EPUB)
router.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().slice(0, 100);
        const lang = SUPPORTED_LANGS.includes(req.query.lang) ? req.query.lang : 'es';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);

        const params = new URLSearchParams({ languages: lang, page: String(page), mime_type: 'application/epub+zip' });
        if (q) params.set('search', q);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const r = await fetch(`https://gutendex.com/books/?${params}`, { signal: controller.signal, headers: { 'User-Agent': UA } });
        clearTimeout(timer);
        if (!r.ok) return res.status(502).json({ message: 'El catálogo no está disponible ahora mismo.' });

        const data = await r.json();
        res.json({
            count: data.count || 0,
            hasNext: !!data.next,
            page,
            results: (data.results || []).map(mapBook).filter((b) => b.hasEpub),
        });
    } catch (err) {
        if (err.name === 'AbortError') return res.status(504).json({ message: 'El catálogo tardó demasiado. Inténtalo de nuevo.' });
        console.error('[catalog] search error:', err.message);
        res.status(502).json({ message: 'No se pudo consultar el catálogo.' });
    }
});

// POST /api/catalog/add { gutenbergId } — añade un libro del catálogo a la biblioteca del usuario.
// Descarga el EPUB a almacenamiento compartido (dedup por id). No cuenta cuota ni límite (origen='catalogo').
router.post('/add', async (req, res) => {
    try {
        const gid = parseInt(req.body.gutenbergId, 10);
        if (!Number.isInteger(gid) || gid <= 0) return res.status(400).json({ message: 'Libro no válido.' });

        const relUrl = `/uploads/catalogo/pg-${gid}.epub`;
        const [dup] = await pool.query('SELECT id FROM libros WHERE usuario_id = ? AND archivo_url = ?', [req.user.id, relUrl]);
        if (dup.length) return res.status(409).json({ message: 'Ya tienes este libro en tu biblioteca.' });

        // Metadatos
        const gr = await fetch(`https://gutendex.com/books/${gid}/`, { headers: { 'User-Agent': UA } });
        if (!gr.ok) return res.status(404).json({ message: 'No se encontró el libro en el catálogo.' });
        const b = await gr.json();
        const epubUrl = epubOf(b);
        if (!epubUrl) return res.status(400).json({ message: 'Ese libro no tiene versión EPUB.' });
        const cover = b.formats?.['image/jpeg'] || '';
        const title = String(b.title || 'Sin título').slice(0, 255);
        const author = String(b.authors?.[0]?.name || 'Anónimo').slice(0, 255);

        // Descarga (compartida; si ya existe el archivo, no lo volvemos a bajar)
        fs.mkdirSync(CATALOG_DIR, { recursive: true });
        const filePath = path.join(CATALOG_DIR, `pg-${gid}.epub`);
        if (!fs.existsSync(filePath)) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30000);
            const er = await fetch(epubUrl, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': UA } });
            clearTimeout(timer);
            if (!er.ok) return res.status(502).json({ message: 'No se pudo descargar el libro.' });
            const ab = await er.arrayBuffer();
            const buf = Buffer.from(ab);
            if (buf.slice(0, 2).toString() !== 'PK') return res.status(502).json({ message: 'El archivo descargado no es un EPUB válido.' });
            fs.writeFileSync(filePath, buf);
        }

        const [result] = await pool.query(
            `INSERT INTO libros (usuario_id, titulo, autor, genero, estado_lectura, portada_url, archivo_url, archivo_tipo, notas, origen)
             VALUES (?, ?, ?, '', 'Pendiente', ?, ?, 'epub', '[]', 'catalogo')`,
            [req.user.id, title, author, cover, relUrl]
        );
        const [[row]] = await pool.query('SELECT * FROM libros WHERE id = ?', [result.insertId]);
        res.status(201).json({
            id: row.id.toString(), title: row.titulo, author: row.autor, genre: row.genero,
            formato: row.formato, status: row.estado_lectura, rating: 0, totalPages: 0, pagesRead: 0,
            coverUrl: row.portada_url, fileUrl: row.archivo_url, fileType: row.archivo_tipo,
            notes: [], categories: [], shelfIds: [], origen: 'catalogo',
        });
    } catch (err) {
        if (err.name === 'AbortError') return res.status(504).json({ message: 'La descarga tardó demasiado. Inténtalo de nuevo.' });
        console.error('[catalog] add error:', err.message);
        res.status(500).json({ message: 'No se pudo añadir el libro.' });
    }
});

module.exports = router;
