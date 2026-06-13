const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/shelves — estanterías del usuario con nº de libros
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT e.id, e.nombre, e.emoji, e.created_at,
                   COUNT(el.libro_id) AS libros
            FROM estanterias e
            LEFT JOIN estanterias_libros el ON el.estanteria_id = e.id
            WHERE e.usuario_id = ?
            GROUP BY e.id
            ORDER BY e.nombre ASC
        `, [req.user.id]);
        res.json(rows.map(r => ({ ...r, libros: Number(r.libros) })));
    } catch (err) {
        console.error('Error obteniendo estanterías:', err);
        res.status(500).json({ message: 'Error obteniendo estanterías' });
    }
});

// POST /api/shelves { nombre, emoji }
router.post('/', async (req, res) => {
    try {
        const nombre = String(req.body.nombre || '').trim().slice(0, 60);
        const emoji = String(req.body.emoji || '📚').trim().slice(0, 16) || '📚';
        if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

        const [result] = await pool.query(
            'INSERT INTO estanterias (usuario_id, nombre, emoji) VALUES (?, ?, ?)',
            [req.user.id, nombre, emoji]
        );
        res.status(201).json({ id: result.insertId, nombre, emoji, libros: 0 });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya tienes una estantería con ese nombre' });
        }
        console.error('Error creando estantería:', err);
        res.status(500).json({ message: 'Error creando la estantería' });
    }
});

// PUT /api/shelves/:id { nombre, emoji } — renombrar / cambiar emoji
router.put('/:id', async (req, res) => {
    try {
        const fields = [];
        const values = [];
        if (req.body.nombre !== undefined) { fields.push('nombre = ?'); values.push(String(req.body.nombre).trim().slice(0, 60)); }
        if (req.body.emoji !== undefined) { fields.push('emoji = ?'); values.push(String(req.body.emoji).trim().slice(0, 16) || '📚'); }
        if (fields.length === 0) return res.status(400).json({ message: 'Nada que actualizar' });

        values.push(req.params.id, req.user.id);
        const [result] = await pool.query(
            `UPDATE estanterias SET ${fields.join(', ')} WHERE id = ? AND usuario_id = ?`,
            values
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Estantería no encontrada' });
        res.json({ message: 'Estantería actualizada' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya tienes una estantería con ese nombre' });
        }
        console.error('Error actualizando estantería:', err);
        res.status(500).json({ message: 'Error actualizando la estantería' });
    }
});

// DELETE /api/shelves/:id — borra la estantería (los libros NO se borran, solo se desvinculan)
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM estanterias WHERE id = ? AND usuario_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Estantería no encontrada' });
        res.json({ message: 'Estantería eliminada', id: Number(req.params.id) });
    } catch (err) {
        console.error('Error eliminando estantería:', err);
        res.status(500).json({ message: 'Error eliminando la estantería' });
    }
});

// Comprueba que tanto la estantería como el libro son del usuario
async function ownsBoth(userId, shelfId, bookId) {
    const [s] = await pool.query('SELECT id FROM estanterias WHERE id = ? AND usuario_id = ?', [shelfId, userId]);
    if (s.length === 0) return false;
    const [b] = await pool.query('SELECT id FROM libros WHERE id = ? AND usuario_id = ?', [bookId, userId]);
    return b.length > 0;
}

// POST /api/shelves/:id/books { libro_id } — añadir libro a la estantería
router.post('/:id/books', async (req, res) => {
    try {
        const { libro_id } = req.body;
        if (!(await ownsBoth(req.user.id, req.params.id, libro_id))) {
            return res.status(403).json({ message: 'Sin permisos sobre la estantería o el libro' });
        }
        await pool.query('INSERT IGNORE INTO estanterias_libros (estanteria_id, libro_id) VALUES (?, ?)', [req.params.id, libro_id]);
        res.json({ message: 'Libro añadido a la estantería' });
    } catch (err) {
        console.error('Error añadiendo libro a estantería:', err);
        res.status(500).json({ message: 'Error añadiendo el libro' });
    }
});

// DELETE /api/shelves/:id/books/:libroId — quitar libro de la estantería
router.delete('/:id/books/:libroId', async (req, res) => {
    try {
        if (!(await ownsBoth(req.user.id, req.params.id, req.params.libroId))) {
            return res.status(403).json({ message: 'Sin permisos sobre la estantería o el libro' });
        }
        await pool.query('DELETE FROM estanterias_libros WHERE estanteria_id = ? AND libro_id = ?', [req.params.id, req.params.libroId]);
        res.json({ message: 'Libro quitado de la estantería' });
    } catch (err) {
        console.error('Error quitando libro de estantería:', err);
        res.status(500).json({ message: 'Error quitando el libro' });
    }
});

module.exports = router;
