const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const auth = require('../middleware/auth');
const { getPlan } = require('../middleware/plan');

router.use(auth);

// Borra el archivo físico (EPUB/PDF) de un libro y descuenta su tamaño del almacenamiento del usuario.
async function removeBookFile(relUrl, userId) {
    if (!relUrl || !/^\/uploads\/books\/[\w.-]+$/.test(relUrl)) return;
    const filePath = path.join(__dirname, '..', relUrl);
    try {
        const { size } = fs.statSync(filePath);
        fs.unlinkSync(filePath);
        await pool.query('UPDATE usuarios SET storage_used_bytes = GREATEST(0, storage_used_bytes - ?) WHERE id = ?', [size, userId]);
    } catch { /* el archivo ya no existe */ }
}

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
            fileUrl: b.archivo_url,
            fileType: b.archivo_tipo,
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

        const { title, author, genre, formato, status, impacto_emocional, cita_memorable, rating, totalPages, pagesRead, fecha_inicio, fecha_fin, coverUrl, fileUrl, fileType, notes, categoryIds } = req.body;

        const stringifiedNotes = notes ? JSON.stringify(notes) : '[]';
        const trimStr = (v) => (typeof v === 'string' ? v.trim() : v);

        const [result] = await pool.query(
            `INSERT INTO libros (usuario_id, titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, numero_paginas, paginas_leidas, fecha_inicio, fecha_fin, portada_url, archivo_url, archivo_tipo, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, trimStr(title), trimStr(author), trimStr(genre) || '', formato || '', status || 'Pendiente', impacto_emocional || '', cita_memorable || '', rating || 0, totalPages || 0, pagesRead || 0, fecha_inicio || null, fecha_fin || null, coverUrl || '', fileUrl || null, fileType || null, stringifiedNotes]
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
            fileUrl: b.archivo_url,
            fileType: b.archivo_tipo,
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

        // Archivo del libro (EPUB/PDF): si se reemplaza o se quita, borrar el físico anterior
        if (updates.fileUrl !== undefined) {
            const [prev] = await pool.query('SELECT archivo_url FROM libros WHERE id = ? AND usuario_id = ?', [bookId, req.user.id]);
            const oldUrl = prev[0]?.archivo_url;
            if (oldUrl && oldUrl !== updates.fileUrl) await removeBookFile(oldUrl, req.user.id);
            fields.push('archivo_url=?'); values.push(updates.fileUrl || null);
            fields.push('archivo_tipo=?'); values.push(updates.fileType || null);
        }

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
            fileUrl: b.archivo_url,
            fileType: b.archivo_tipo,
            notes: b.notas ? (typeof b.notas === 'string' ? JSON.parse(b.notas) : b.notas) : [],
            categories: b.categorias ? b.categorias.split('||') : []
        });
    } catch (err) {
        console.error("Error actualizando el libro:", err);
        res.status(500).json({ message: 'Error actualizando el libro' });
    }
});

// === Subrayados del lector (EPUB) ===

// GET /api/books/:id/highlights — subrayados del usuario en este libro
router.get('/:id/highlights', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT s.id, s.cfi_range, s.texto, s.color, s.created_at
             FROM subrayados s JOIN libros l ON s.libro_id = l.id
             WHERE s.libro_id = ? AND l.usuario_id = ?
             ORDER BY s.created_at`,
            [req.params.id, req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error obteniendo subrayados:', err);
        res.status(500).json({ message: 'Error obteniendo subrayados' });
    }
});

// POST /api/books/:id/highlights { cfiRange, text, color }
router.post('/:id/highlights', async (req, res) => {
    try {
        const [own] = await pool.query('SELECT id FROM libros WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.id]);
        if (own.length === 0) return res.status(404).json({ message: 'Libro no encontrado o sin permisos' });

        const cfiRange = String(req.body.cfiRange || '').slice(0, 500);
        if (!cfiRange) return res.status(400).json({ message: 'Falta la posición del subrayado' });
        const texto = String(req.body.text || '').slice(0, 1000);
        const color = String(req.body.color || 'amber').slice(0, 20);

        const [result] = await pool.query(
            'INSERT INTO subrayados (usuario_id, libro_id, cfi_range, texto, color) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, req.params.id, cfiRange, texto, color]
        );
        const [rows] = await pool.query('SELECT id, cfi_range, texto, color, created_at FROM subrayados WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error guardando subrayado:', err);
        res.status(500).json({ message: 'Error guardando el subrayado' });
    }
});

// DELETE /api/books/:id/highlights/:hid
router.delete('/:id/highlights/:hid', async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM subrayados WHERE id = ? AND libro_id = ? AND usuario_id = ?',
            [req.params.hid, req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Subrayado no encontrado' });
        res.json({ message: 'Subrayado eliminado', id: Number(req.params.hid) });
    } catch (err) {
        console.error('Error eliminando subrayado:', err);
        res.status(500).json({ message: 'Error eliminando el subrayado' });
    }
});

// DELETE /api/books/:id
router.delete('/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        const [prev] = await pool.query('SELECT archivo_url FROM libros WHERE id = ? AND usuario_id = ?', [bookId, req.user.id]);
        const [result] = await pool.query('DELETE FROM libros WHERE id = ? AND usuario_id = ?', [bookId, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Libro no encontrado o sin permisos' });
        }

        // Liberar el archivo EPUB/PDF asociado (y su cuota de almacenamiento)
        if (prev[0]?.archivo_url) await removeBookFile(prev[0].archivo_url, req.user.id);

        res.json({ message: 'Libro eliminado con éxito', id: bookId });
    } catch (err) {
        res.status(500).json({ message: 'Error interno eliminando libro' });
    }
});

module.exports = router;
