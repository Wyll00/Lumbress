const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// Solo administradores (usuarios.is_admin = 1)
async function requireAdmin(req, res, next) {
    try {
        const [r] = await pool.query('SELECT is_admin FROM usuarios WHERE id = ?', [req.user.id]);
        if (!r[0]?.is_admin) return res.status(403).json({ message: 'Solo para administración.' });
        next();
    } catch (err) { next(err); }
}
router.use(requireAdmin);

// GET /api/admin/stats — métricas globales de la plataforma
router.get('/stats', async (req, res) => {
    try {
        const q = async (sql) => (await pool.query(sql))[0][0];
        const [
            usuarios, usuarios7d, libros, conArchivo, posts, anuncios,
            mensajes, suscripciones, subrayados, almacenamiento,
        ] = await Promise.all([
            q('SELECT COUNT(*) n FROM usuarios'),
            q('SELECT COUNT(*) n FROM usuarios WHERE created_at >= NOW() - INTERVAL 7 DAY'),
            q('SELECT COUNT(*) n FROM libros'),
            q('SELECT COUNT(*) n FROM libros WHERE archivo_url IS NOT NULL'),
            q('SELECT COUNT(*) n FROM posts'),
            q('SELECT COUNT(*) n FROM anuncios'),
            q('SELECT COUNT(*) n FROM mensajes'),
            q("SELECT COUNT(*) n FROM suscripciones WHERE status IN ('active','trialing')"),
            q('SELECT COUNT(*) n FROM subrayados'),
            q('SELECT COALESCE(SUM(storage_used_bytes),0) n FROM usuarios'),
        ]);
        res.json({
            usuarios: usuarios.n,
            usuariosUltimos7d: usuarios7d.n,
            libros: libros.n,
            librosConArchivo: conArchivo.n,
            posts: posts.n,
            anuncios: anuncios.n,
            mensajes: mensajes.n,
            suscripcionesActivas: suscripciones.n,
            subrayados: subrayados.n,
            almacenamientoBytes: Number(almacenamiento.n),
        });
    } catch (err) {
        console.error('[admin] stats error:', err);
        res.status(500).json({ message: 'Error obteniendo estadísticas' });
    }
});

// GET /api/admin/users — lista de usuarios con su actividad
router.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT u.id, u.username, u.email, u.plan, u.is_verified, u.created_at,
                   COUNT(DISTINCT l.id) AS libros,
                   COALESCE(u.storage_used_bytes, 0) AS storage_bytes
            FROM usuarios u
            LEFT JOIN libros l ON l.usuario_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT 200
        `);
        res.json(rows);
    } catch (err) {
        console.error('[admin] users error:', err);
        res.status(500).json({ message: 'Error obteniendo usuarios' });
    }
});

module.exports = router;
