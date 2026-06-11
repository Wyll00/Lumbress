const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

const ESTADOS_LIBRO = ['Nuevo', 'Como nuevo', 'Buen estado', 'Aceptable'];

const sanitize = (body) => ({
    titulo_libro: typeof body.titulo_libro === 'string' ? body.titulo_libro.trim().slice(0, 255) : '',
    autor: typeof body.autor === 'string' ? body.autor.trim().slice(0, 255) : null,
    precio: Number.isFinite(Number(body.precio)) && Number(body.precio) >= 0 ? Number(body.precio) : 0,
    moneda: ['€', '$', '£'].includes(body.moneda) ? body.moneda : '€',
    estado_libro: ESTADOS_LIBRO.includes(body.estado_libro) ? body.estado_libro : 'Buen estado',
    genero: typeof body.genero === 'string' ? body.genero.trim().slice(0, 100) : null,
    descripcion: typeof body.descripcion === 'string' ? body.descripcion.slice(0, 2000) : null,
    imagen_url: typeof body.imagen_url === 'string' ? body.imagen_url.trim().slice(0, 500) : null,
    contacto: typeof body.contacto === 'string' ? body.contacto.trim().slice(0, 200) : null,
    telefono: typeof body.telefono === 'string' ? body.telefono.trim().slice(0, 30) : null,
    direccion: typeof body.direccion === 'string' ? body.direccion.trim().slice(0, 255) : null,
    codigo_postal: typeof body.codigo_postal === 'string' ? body.codigo_postal.trim().slice(0, 15) : null,
    ciudad: typeof body.ciudad === 'string' ? body.ciudad.trim().slice(0, 100) : null,
    provincia: typeof body.provincia === 'string' ? body.provincia.trim().slice(0, 100) : null,
    pais: typeof body.pais === 'string' ? body.pais.trim().slice(0, 100) : null,
    ubicacion: typeof body.ubicacion === 'string' ? body.ubicacion.trim().slice(0, 150) : null,
});

// GET /api/anuncios — lista pública (SIN la dirección exacta: calle/número y CP)
// La dirección exacta solo se entrega vía /:id/contacto.
router.get('/', async (req, res) => {
    try {
        const soloDisponibles = req.query.disponibles === '1';
        const [rows] = await pool.query(
            `SELECT a.id, a.usuario_id, a.titulo_libro, a.autor, a.precio, a.moneda,
                    a.estado_libro, a.genero, a.descripcion, a.imagen_url, a.contacto, a.telefono,
                    a.ciudad, a.provincia, a.pais, a.ubicacion, a.vendido, a.created_at,
                    u.username AS vendedor, u.profile_image AS vendedor_avatar, u.is_verified AS vendedor_verificado
             FROM anuncios a
             JOIN usuarios u ON a.usuario_id = u.id
             ${soloDisponibles ? 'WHERE a.vendido = 0' : ''}
             ORDER BY a.vendido ASC, a.created_at DESC
             LIMIT 200`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching anuncios:', err);
        res.status(500).json({ message: 'Error obteniendo anuncios' });
    }
});

// GET /api/anuncios/:id/contacto — dirección exacta (calle, número, CP)
// Se solicita explícitamente cuando el comprador quiere contactar/recoger.
router.get('/:id/contacto', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT direccion, codigo_postal, ciudad, provincia, pais, telefono, contacto FROM anuncios WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Anuncio no encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching contacto:', err);
        res.status(500).json({ message: 'Error obteniendo la dirección' });
    }
});

// GET /api/anuncios/mios — anuncios del usuario logueado
router.get('/mios', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM anuncios WHERE usuario_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching mis anuncios:', err);
        res.status(500).json({ message: 'Error obteniendo tus anuncios' });
    }
});

// POST /api/anuncios — crear anuncio
router.post('/', async (req, res) => {
    try {
        const data = sanitize(req.body);
        if (!data.titulo_libro) {
            return res.status(400).json({ message: 'El título del libro es obligatorio' });
        }

        const [result] = await pool.query(
            `INSERT INTO anuncios
             (usuario_id, titulo_libro, autor, precio, moneda, estado_libro, genero, descripcion, imagen_url,
              contacto, telefono, direccion, codigo_postal, ciudad, provincia, pais, ubicacion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, data.titulo_libro, data.autor, data.precio, data.moneda, data.estado_libro,
             data.genero, data.descripcion, data.imagen_url, data.contacto, data.telefono,
             data.direccion, data.codigo_postal, data.ciudad, data.provincia, data.pais, data.ubicacion]
        );

        const [rows] = await pool.query(
            `SELECT a.*, u.username AS vendedor, u.profile_image AS vendedor_avatar, u.is_verified AS vendedor_verificado
             FROM anuncios a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?`,
            [result.insertId]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating anuncio:', err);
        res.status(500).json({ message: 'Error creando el anuncio' });
    }
});

// PUT /api/anuncios/:id — editar anuncio completo
router.put('/:id', async (req, res) => {
    try {
        const data = sanitize(req.body);
        if (!data.titulo_libro) {
            return res.status(400).json({ message: 'El título del libro es obligatorio' });
        }
        const [result] = await pool.query(
            `UPDATE anuncios SET
                titulo_libro = ?, autor = ?, precio = ?, moneda = ?, estado_libro = ?,
                genero = ?, descripcion = ?, imagen_url = ?, contacto = ?, telefono = ?,
                direccion = ?, codigo_postal = ?, ciudad = ?, provincia = ?, pais = ?, ubicacion = ?
             WHERE id = ? AND usuario_id = ?`,
            [data.titulo_libro, data.autor, data.precio, data.moneda, data.estado_libro,
             data.genero, data.descripcion, data.imagen_url, data.contacto, data.telefono,
             data.direccion, data.codigo_postal, data.ciudad, data.provincia, data.pais, data.ubicacion,
             req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Anuncio no encontrado o sin permisos' });
        }
        const [rows] = await pool.query(
            `SELECT a.*, u.username AS vendedor, u.profile_image AS vendedor_avatar, u.is_verified AS vendedor_verificado
             FROM anuncios a JOIN usuarios u ON a.usuario_id = u.id WHERE a.id = ?`,
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating anuncio:', err);
        res.status(500).json({ message: 'Error actualizando el anuncio' });
    }
});

// PATCH /api/anuncios/:id — marcar vendido/disponible
router.patch('/:id', async (req, res) => {
    try {
        if (typeof req.body.vendido === 'undefined') {
            return res.status(400).json({ message: 'No hay cambios válidos' });
        }
        const vendido = req.body.vendido ? 1 : 0;
        const [result] = await pool.query(
            'UPDATE anuncios SET vendido = ? WHERE id = ? AND usuario_id = ?',
            [vendido, req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Anuncio no encontrado o sin permisos' });
        }
        res.json({ message: 'Anuncio actualizado', vendido });
    } catch (err) {
        console.error('Error patching anuncio:', err);
        res.status(500).json({ message: 'Error actualizando el anuncio' });
    }
});

// DELETE /api/anuncios/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM anuncios WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Anuncio no encontrado o sin permisos' });
        }
        res.json({ message: 'Anuncio eliminado' });
    } catch (err) {
        console.error('Error deleting anuncio:', err);
        res.status(500).json({ message: 'Error eliminando el anuncio' });
    }
});

module.exports = router;
