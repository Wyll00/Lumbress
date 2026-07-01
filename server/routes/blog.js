const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { safeMediaUrl } = require('../utils/url');

router.use(auth);

const ESTADOS = ['publicado', 'borrador'];

async function esAdmin(userId) {
    const [r] = await pool.query('SELECT is_admin FROM usuarios WHERE id = ?', [userId]);
    return !!r[0]?.is_admin;
}

// Normaliza el cuerpo de un artículo desde req.body
function sanitizar(body) {
    return {
        titulo: String(body.titulo || '').trim().slice(0, 255),
        resumen: String(body.resumen || '').trim().slice(0, 400) || null,
        contenido: String(body.contenido || '').trim().slice(0, 50000),
        portada_url: safeMediaUrl(body.portada_url),
        categoria: String(body.categoria || '').trim().slice(0, 80) || null,
        estado: ESTADOS.includes(body.estado) ? body.estado : 'publicado',
    };
}

// GET /api/blog — listado (publicados para todos; el admin ve también borradores)
router.get('/', async (req, res) => {
    try {
        const admin = await esAdmin(req.user.id);
        const where = admin ? '' : "WHERE b.estado = 'publicado'";
        const [rows] = await pool.query(`
            SELECT b.id, b.usuario_id, b.titulo, b.resumen, b.portada_url, b.categoria,
                   b.estado, b.created_at, u.username AS autor
            FROM blog b LEFT JOIN usuarios u ON u.id = b.usuario_id
            ${where}
            ORDER BY b.created_at DESC
            LIMIT 100
        `);
        res.json({ posts: rows, isAdmin: admin });
    } catch (err) {
        console.error('Error obteniendo blog:', err);
        res.status(500).json({ message: 'Error obteniendo el blog' });
    }
});

// GET /api/blog/:id — artículo completo
router.get('/:id', async (req, res) => {
    try {
        const admin = await esAdmin(req.user.id);
        const [rows] = await pool.query(`
            SELECT b.id, b.usuario_id, b.titulo, b.resumen, b.contenido, b.portada_url,
                   b.categoria, b.estado, b.created_at, b.updated_at, u.username AS autor
            FROM blog b LEFT JOIN usuarios u ON u.id = b.usuario_id
            WHERE b.id = ?
        `, [req.params.id]);
        const post = rows[0];
        if (!post) return res.status(404).json({ message: 'Artículo no encontrado.' });
        if (post.estado !== 'publicado' && !admin) return res.status(404).json({ message: 'Artículo no encontrado.' });
        res.json({ post, isAdmin: admin });
    } catch (err) {
        console.error('Error obteniendo artículo:', err);
        res.status(500).json({ message: 'Error obteniendo el artículo' });
    }
});

// POST /api/blog — crear (solo admin)
router.post('/', async (req, res) => {
    try {
        if (!(await esAdmin(req.user.id))) return res.status(403).json({ message: 'Solo administración.' });
        const d = sanitizar(req.body);
        if (!d.titulo) return res.status(400).json({ message: 'El título es obligatorio.' });
        if (!d.contenido) return res.status(400).json({ message: 'El contenido es obligatorio.' });

        const [r] = await pool.query(
            `INSERT INTO blog (usuario_id, titulo, resumen, contenido, portada_url, categoria, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, d.titulo, d.resumen, d.contenido, d.portada_url, d.categoria, d.estado]
        );
        res.status(201).json({ id: r.insertId });
    } catch (err) {
        console.error('Error creando artículo:', err);
        res.status(500).json({ message: 'Error al crear el artículo.' });
    }
});

// PUT /api/blog/:id — editar (solo admin)
router.put('/:id', async (req, res) => {
    try {
        if (!(await esAdmin(req.user.id))) return res.status(403).json({ message: 'Solo administración.' });
        const d = sanitizar(req.body);
        if (!d.titulo) return res.status(400).json({ message: 'El título es obligatorio.' });
        if (!d.contenido) return res.status(400).json({ message: 'El contenido es obligatorio.' });

        const [r] = await pool.query(
            `UPDATE blog SET titulo=?, resumen=?, contenido=?, portada_url=?, categoria=?, estado=? WHERE id=?`,
            [d.titulo, d.resumen, d.contenido, d.portada_url, d.categoria, d.estado, req.params.id]
        );
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Artículo no encontrado.' });
        res.json({ message: 'Artículo actualizado', id: Number(req.params.id) });
    } catch (err) {
        console.error('Error actualizando artículo:', err);
        res.status(500).json({ message: 'Error al actualizar el artículo.' });
    }
});

// DELETE /api/blog/:id — borrar (solo admin)
router.delete('/:id', async (req, res) => {
    try {
        if (!(await esAdmin(req.user.id))) return res.status(403).json({ message: 'Solo administración.' });
        const [r] = await pool.query('DELETE FROM blog WHERE id = ?', [req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ message: 'Artículo no encontrado.' });
        res.json({ message: 'Artículo eliminado', id: Number(req.params.id) });
    } catch (err) {
        console.error('Error eliminando artículo:', err);
        res.status(500).json({ message: 'Error al eliminar el artículo.' });
    }
});

module.exports = router;
