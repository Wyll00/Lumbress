const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

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
        const { title, author, genre, formato, status, impacto_emocional, cita_memorable, rating, totalPages, pagesRead, fecha_inicio, fecha_fin, coverUrl, notes, categoryIds } = req.body;
        
        const stringifiedNotes = notes ? JSON.stringify(notes) : '[]';

        const [result] = await pool.query(
            `INSERT INTO libros (usuario_id, titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, numero_paginas, paginas_leidas, fecha_inicio, fecha_fin, portada_url, notas) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, title, author, genre || '', formato || '', status || 'Pendiente', impacto_emocional || '', cita_memorable || '', rating || 0, totalPages || 0, pagesRead || 0, fecha_inicio || null, fecha_fin || null, coverUrl || '', stringifiedNotes]
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

// PUT /api/books/:id
router.put('/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        const updates = req.body;
        
        // Build dynamic query
        const fields = [];
        const values = [];

        if (updates.title !== undefined) { fields.push('titulo=?'); values.push(updates.title); }
        if (updates.author !== undefined) { fields.push('autor=?'); values.push(updates.author); }
        if (updates.genre !== undefined) { fields.push('genero=?'); values.push(updates.genre); }
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
