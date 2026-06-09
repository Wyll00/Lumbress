const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { getPlan } = require('../middleware/plan');

router.use(auth);

// GET /api/books
router.get('/', async (req, res) => {
    try {
        const [books] = await pool.query(`
            SELECT l.*, GROUP_CONCAT(e.nombre SEPARATOR '||') as categorias
            FROM libros l
            LEFT JOIN libros_etiquetas le ON l.id = le.libro_id
            LEFT JOIN etiquetas_literarias e ON le.etiqueta_id = e.id
            WHERE l.usuario_id = ?
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `, [req.user.id]);

        const mappedBooks = books.map(b => ({
            id: b.id.toString(),
            title: b.titulo,
            author: b.autor,
            genre: b.genero,
            formato: b.formato,
            status: b.estado_lectura,
            impacto_emocional: b.impacto_emocional,
            cita_memorable: b.cita_memorable,
            rating: b.calificacion,
            totalPages: b.numero_paginas,
            pagesRead: b.paginas_leidas || 0,
            fecha_inicio: b.fecha_inicio,
            fecha_fin: b.fecha_fin,
            coverUrl: b.portada_url,
            notes: b.notas ? (typeof b.notas === 'string' ? JSON.parse(b.notas) : b.notas) : [],
            categories: b.categorias ? b.categorias.split('||') : []
        }));
        res.json(mappedBooks);
    } catch (err) {
        res.status(500).json({ message: 'Error interno obteniendo libros' });
    }
});

// POST /api/books
router.post('/', async (req, res) => {
    try {
        // Plan gratis: biblioteca limitada (palanca de conversión). Premium: sin límite.
        const { plan, limits } = await getPlan(req.user.id);
        if (plan !== 'premium') {
            const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM libros WHERE usuario_id = ?', [req.user.id]);
            if (total >= limits.maxBooks) {
                return res.status(402).json({
                    code: 'LIMIT_REACHED',
                    message: `El plan gratuito permite hasta ${limits.maxBooks} libros. Pásate a Premium para biblioteca ilimitada.`,
                });
            }
        }

        const { title, author, genre, formato, status, impacto_emocional, cita_memorable, rating, totalPages, pagesRead, fecha_inicio, fecha_fin, coverUrl, notes, categoryIds } = req.body;
        
        const stringifiedNotes = notes ? JSON.stringify(notes) : '[]';
        const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);

        const [result] = await pool.query(
            `INSERT INTO libros (usuario_id, titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, numero_paginas, paginas_leidas, fecha_inicio, fecha_fin, portada_url, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, trimStr(title), trimStr(author), trimStr(genre) || '', formato || '', status || 'Pendiente', impacto_emocional || '', cita_memorable || '', rating || 0, totalPages || 0, pagesRead || 0, fecha_inicio || null, fecha_fin || null, coverUrl || '', stringifiedNotes]
        );
        
        const newBookId = result.insertId;

        if (categoryIds && Array.isArray(categoryIds)) {
            const limited = categoryIds.slice(0, 4);
            for (const catId of limited) {
                await pool.query('INSERT IGNORE INTO libros_etiquetas (libro_id, etiqueta_id) VALUES (?, ?)', [newBookId, catId]);
            }
        }
        
        const [newBook] = await pool.query('SELECT l.*, GROUP_CONCAT(e.nombre SEPARATOR "||") as categorias FROM libros l LEFT JOIN libros_etiquetas le ON l.id = le.libro_id LEFT JOIN etiquetas_literarias e ON le.etiqueta_id = e.id WHERE l.id = ? GROUP BY l.id', [newBookId]);
        const b = newBook[0];
        res.status(201).json({
            id: b.id.toString(),
            title: b.titulo,
            author: b.autor,
            genre: b.genero,
            formato: b.formato,
            status: b.estado_lectura,
            impacto_emocional: b.impacto_emocional,
            cita_memorable: b.cita_memorable,
            rating: b.calificacion,
            totalPages: b.numero_paginas,
            pagesRead: b.paginas_leidas || 0,
            fecha_inicio: b.fecha_inicio,
            fecha_fin: b.fecha_fin,
            coverUrl: b.portada_url,
            notes: b.notas ? (typeof b.notas === 'string' ? JSON.parse(b.notas) : b.notas) : [],
            categories: b.categorias ? b.categorias.split('||') : []
        });
    } catch (err) {
        console.error("Error creando el libro:", err);
        res.status(500).json({ message: 'Error creando el libro' });
    }
});

// POST /api/books/import — alta masiva desde CSV { books: [...] }
router.post('/import', async (req, res) => {
    try {
        const incoming = Array.isArray(req.body.books) ? req.body.books : [];
        const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);
        const values = [];
        for (const b of incoming.slice(0, 1000)) {
            const title = trimStr(b.title);
            if (!title) continue;
            values.push([
                req.user.id, title, trimStr(b.author) || '', trimStr(b.genre) || '', '',
                b.status || 'To Read', '', '',
                Number(b.rating) || 0, Number(b.totalPages) || 0, 0,
                null, b.fecha_fin || null, '', '[]',
            ]);
        }
        if (values.length === 0) return res.json({ imported: 0 });

        await pool.query(
            `INSERT INTO libros
               (usuario_id, titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable,
                calificacion, numero_paginas, paginas_leidas, fecha_inicio, fecha_fin, portada_url, notas)
             VALUES ?`,
            [values]
        );
        res.status(201).json({ imported: values.length });
    } catch (err) {
        console.error('Error importando libros:', err);
        res.status(500).json({ message: 'Error al importar los libros' });
    }
});

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        const updates = req.body;
        
        // Build dynamic query
        const fields = [];
        const values = [];
        const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);

        if (updates.title !== undefined) { fields.push('titulo=?'); values.push(trimStr(updates.title)); }
        if (updates.author !== undefined) { fields.push('autor=?'); values.push(trimStr(updates.author)); }
        if (updates.genre !== undefined) { fields.push('genero=?'); values.push(trimStr(updates.genre)); }
        if (updates.formato !== undefined) { fields.push('formato=?'); values.push(updates.formato); }
        if (updates.status !== undefined) { fields.push('estado_lectura=?'); values.push(updates.status); }
        if (updates.impacto_emocional !== undefined) { fields.push('impacto_emocional=?'); values.push(updates.impacto_emocional); }
        if (updates.cita_memorable !== undefined) { fields.push('cita_memorable=?'); values.push(updates.cita_memorable); }
        if (updates.rating !== undefined) { fields.push('calificacion=?'); values.push(updates.rating); }
        if (updates.totalPages !== undefined) { fields.push('numero_paginas=?'); values.push(updates.totalPages); }
        if (updates.pagesRead !== undefined) { fields.push('paginas_leidas=?'); values.push(updates.pagesRead); }
        if (updates.fecha_inicio !== undefined) { fields.push('fecha_inicio=?'); values.push(updates.fecha_inicio); }
        if (updates.fecha_fin !== undefined) { fields.push('fecha_fin=?'); values.push(updates.fecha_fin); }
        if (updates.coverUrl !== undefined) { fields.push('portada_url=?'); values.push(updates.coverUrl); }
        
        if (updates.notes !== undefined) { 
            fields.push('notas=?'); 
            values.push(updates.notes ? JSON.stringify(updates.notes) : '[]'); 
        }

        if (fields.length > 0) {
            values.push(bookId, req.user.id);
            const query = `UPDATE libros SET ${fields.join(', ')} WHERE id=? AND usuario_id=?`;
            const [result] = await pool.query(query, values);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Libro no encontrado o sin permisos' });
            }
        }

        if (updates.categoryIds && Array.isArray(updates.categoryIds)) {
            await pool.query('DELETE FROM libros_etiquetas WHERE libro_id = ?', [bookId]);
            const limited = updates.categoryIds.slice(0, 4);
            for (const catId of limited) {
                await pool.query('INSERT IGNORE INTO libros_etiquetas (libro_id, etiqueta_id) VALUES (?, ?)', [bookId, catId]);
            }
        }

        const [updatedBook] = await pool.query('SELECT l.*, GROUP_CONCAT(e.nombre SEPARATOR "||") as categorias FROM libros l LEFT JOIN libros_etiquetas le ON l.id = le.libro_id LEFT JOIN etiquetas_literarias e ON le.etiqueta_id = e.id WHERE l.id = ? GROUP BY l.id', [bookId]);
        const b = updatedBook[0];
        res.json({
            id: b.id.toString(),
            title: b.titulo,
            author: b.autor,
            genre: b.genero,
            formato: b.formato,
            status: b.estado_lectura,
            impacto_emocional: b.impacto_emocional,
            cita_memorable: b.cita_memorable,
            rating: b.calificacion,
            totalPages: b.numero_paginas,
            pagesRead: b.paginas_leidas || 0,
            fecha_inicio: b.fecha_inicio,
            fecha_fin: b.fecha_fin,
            coverUrl: b.portada_url,
            notes: b.notas ? (typeof b.notas === 'string' ? JSON.parse(b.notas) : b.notas) : [],
            categories: b.categorias ? b.categorias.split('||') : []
        });
    } catch (err) {
        console.error("Error actualizando el libro:", err);
        res.status(500).json({ message: 'Error actualizando el libro' });
    }
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        const [result] = await pool.query('DELETE FROM libros WHERE id = ? AND usuario_id = ?', [bookId, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Libro no encontrado o sin permisos' });
        }

        res.json({ message: 'Libro eliminado con éxito', id: bookId });
    } catch (err) {
        res.status(500).json({ message: 'Error interno eliminando libro' });
    }
});

module.exports = router;
