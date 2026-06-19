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
            usuarios, usuarios7d, sinVerificar, libros, conArchivo, posts, anuncios,
            mensajes, suscripciones, subrayados, almacenamiento,
        ] = await Promise.all([
            q('SELECT COUNT(*) n FROM usuarios WHERE email_verified = 1'),
            q('SELECT COUNT(*) n FROM usuarios WHERE email_verified = 1 AND created_at >= NOW() - INTERVAL 7 DAY'),
            q('SELECT COUNT(*) n FROM usuarios WHERE email_verified = 0'),
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
            usuariosSinVerificar: sinVerificar.n,
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
            SELECT u.id, u.username, u.email, u.plan, u.is_verified, u.email_verified, u.created_at,
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

// GET /api/admin/traffic — analítica de tráfico (peticiones, visitas, países, páginas)
router.get('/traffic', async (req, res) => {
    try {
        const rows = async (sql) => (await pool.query(sql))[0];
        const one = async (sql) => (await rows(sql))[0];

        const [
            reqHoy, req7, req30, reqTotal,
            pvHoy, pv7, pvTotal,
            uniq7, uniq30,
        ] = await Promise.all([
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='request' AND created_at >= CURDATE()"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='request' AND created_at >= NOW() - INTERVAL 7 DAY"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='request' AND created_at >= NOW() - INTERVAL 30 DAY"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='request'"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='pageview' AND created_at >= CURDATE()"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='pageview' AND created_at >= NOW() - INTERVAL 7 DAY"),
            one("SELECT COUNT(*) n FROM trafico WHERE tipo='pageview'"),
            one("SELECT COUNT(DISTINCT ip) n FROM trafico WHERE ip IS NOT NULL AND created_at >= NOW() - INTERVAL 7 DAY"),
            one("SELECT COUNT(DISTINCT ip) n FROM trafico WHERE ip IS NOT NULL AND created_at >= NOW() - INTERVAL 30 DAY"),
        ]);

        const porPais = await rows(`
            SELECT COALESCE(pais, 'Desconocido') AS pais, pais_codigo AS codigo, COUNT(*) AS total
            FROM trafico WHERE created_at >= NOW() - INTERVAL 30 DAY
            GROUP BY pais, pais_codigo ORDER BY total DESC LIMIT 12`);
        const topPaginas = await rows(`
            SELECT ruta, COUNT(*) AS total
            FROM trafico WHERE tipo='pageview' AND created_at >= NOW() - INTERVAL 30 DAY
            GROUP BY ruta ORDER BY total DESC LIMIT 10`);
        const porDia = await rows(`
            SELECT DATE(created_at) AS dia,
                   SUM(tipo='request') AS peticiones,
                   SUM(tipo='pageview') AS visitas
            FROM trafico WHERE created_at >= NOW() - INTERVAL 13 DAY
            GROUP BY DATE(created_at) ORDER BY dia`);

        res.json({
            peticiones: { hoy: reqHoy.n, semana: req7.n, mes: req30.n, total: reqTotal.n },
            visitas: { hoy: pvHoy.n, semana: pv7.n, total: pvTotal.n },
            unicos: { semana: uniq7.n, mes: uniq30.n },
            porPais: porPais.map((p) => ({ ...p, total: Number(p.total) })),
            topPaginas: topPaginas.map((p) => ({ ...p, total: Number(p.total) })),
            porDia: porDia.map((d) => ({ dia: d.dia, peticiones: Number(d.peticiones), visitas: Number(d.visitas) })),
        });
    } catch (err) {
        console.error('[admin] traffic error:', err);
        res.status(500).json({ message: 'Error obteniendo el tráfico' });
    }
});

module.exports = router;
