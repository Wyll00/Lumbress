const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { safeHttpUrl, safeMediaUrl } = require('../utils/url');

router.use(auth);

const MAX_POR_USUARIO = 10; // tope de promociones activas por usuario (anti-spam)

async function esAdmin(userId) {
    const [r] = await pool.query('SELECT is_admin FROM usuarios WHERE id = ?', [userId]);
    return !!r[0]?.is_admin;
}

// GET /api/novedades — escaparate público (aprobadas), de la más reciente a la más antigua
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT n.id, n.usuario_id, n.titulo, n.autor, n.sinopsis, n.portada_url,
                   n.enlace, n.genero, n.created_at, u.username AS publicado_por
            FROM novedades n
            LEFT JOIN usuarios u ON u.id = n.usuario_id
            WHERE n.estado = 'aprobado'
            ORDER BY n.created_at DESC
            LIMIT 100
        `);
        const admin = await esAdmin(req.user.id);
        res.json(rows.map(r => ({ ...r, isOwner: r.usuario_id === req.user.id || admin })));
    } catch (err) {
        console.error('Error obteniendo novedades:', err);
        res.status(500).json({ message: 'Error obteniendo las novedades' });
    }
});

// POST /api/novedades { titulo, autor, sinopsis, portada_url, enlace, genero }
router.post('/', async (req, res) => {
    try {
        const titulo = String(req.body.titulo || '').trim().slice(0, 255);
        const autor = String(req.body.autor || '').trim().slice(0, 160);
        const sinopsis = String(req.body.sinopsis || '').trim().slice(0, 2000);
        const genero = String(req.body.genero || '').trim().slice(0, 80) || null;
        const enlace = safeHttpUrl(req.body.enlace);
        const portada_url = safeMediaUrl(req.body.portada_url);

        if (!titulo) return res.status(400).json({ message: 'El título es obligatorio.' });
        if (!autor) return res.status(400).json({ message: 'El nombre del autor es obligatorio.' });
        if (!enlace) return res.status(400).json({ message: 'Pon un enlace válido (que empiece por http/https) donde conseguir el libro.' });

        const admin = await esAdmin(req.user.id);
        if (!admin) {
            const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM novedades WHERE usuario_id = ?', [req.user.id]);
            if (n >= MAX_POR_USUARIO) {
                return res.status(400).json({ message: `Has alcanzado el máximo de ${MAX_POR_USUARIO} promociones. Borra alguna para añadir más.` });
            }
        }

        const [result] = await pool.query(
            `INSERT INTO novedades (usuario_id, titulo, autor, sinopsis, portada_url, enlace, genero)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, titulo, autor, sinopsis || null, portada_url, enlace, genero]
        );

        const [r] = await pool.query(`
            SELECT n.id, n.usuario_id, n.titulo, n.autor, n.sinopsis, n.portada_url,
                   n.enlace, n.genero, n.created_at, u.username AS publicado_por
            FROM novedades n LEFT JOIN usuarios u ON u.id = n.usuario_id
            WHERE n.id = ?`, [result.insertId]);
        res.status(201).json({ ...r[0], isOwner: true });
    } catch (err) {
        console.error('Error creando novedad:', err);
        res.status(500).json({ message: 'Error al publicar la promoción.' });
    }
});

// DELETE /api/novedades/:id — borra la propia (o cualquiera si eres admin)
router.delete('/:id', async (req, res) => {
    try {
        const admin = await esAdmin(req.user.id);
        const sql = admin
            ? 'DELETE FROM novedades WHERE id = ?'
            : 'DELETE FROM novedades WHERE id = ? AND usuario_id = ?';
        const params = admin ? [req.params.id] : [req.params.id, req.user.id];
        const [result] = await pool.query(sql, params);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Promoción no encontrada o sin permisos.' });
        res.json({ message: 'Promoción eliminada', id: Number(req.params.id) });
    } catch (err) {
        console.error('Error eliminando novedad:', err);
        res.status(500).json({ message: 'Error eliminando la promoción.' });
    }
});

module.exports = router;
