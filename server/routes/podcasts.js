const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { safeHttpUrl } = require('../utils/url');

router.use(auth);

const ESTADOS_VALIDOS = ['por_escuchar', 'escuchando', 'escuchado'];

const sanitize = (body) => ({
    nombre: typeof body.nombre === 'string' ? body.nombre.trim() : '',
    autor: typeof body.autor === 'string' ? body.autor.trim() : null,
    descripcion: typeof body.descripcion === 'string' ? body.descripcion : null,
    url_fuente: safeHttpUrl(body.url_fuente), // solo http/https (se muestra como enlace)
    audio_url: typeof body.audio_url === 'string' ? body.audio_url.trim() : null,
    portada_url: typeof body.portada_url === 'string' ? body.portada_url : null,
    categoria: typeof body.categoria === 'string' ? body.categoria.trim() : null,
    estado: ESTADOS_VALIDOS.includes(body.estado) ? body.estado : 'por_escuchar',
    rating: Number.isInteger(body.rating) && body.rating >= 0 && body.rating <= 5 ? body.rating : null,
    notas: typeof body.notas === 'string' ? body.notas : null,
    episodios_total: Number.isInteger(body.episodios_total) && body.episodios_total >= 0 ? body.episodios_total : 0,
    episodios_escuchados: Number.isInteger(body.episodios_escuchados) && body.episodios_escuchados >= 0 ? body.episodios_escuchados : 0,
});

// GET /api/podcasts
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM podcasts WHERE usuario_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching podcasts:', err);
        res.status(500).json({ message: 'Error obteniendo podcasts' });
    }
});

// POST /api/podcasts
router.post('/', async (req, res) => {
    try {
        const data = sanitize(req.body);
        if (!data.nombre) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        const [result] = await pool.query(
            `INSERT INTO podcasts
             (usuario_id, nombre, autor, descripcion, url_fuente, audio_url, portada_url, categoria, estado, rating, notas, episodios_total, episodios_escuchados)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, data.nombre, data.autor, data.descripcion, data.url_fuente, data.audio_url, data.portada_url, data.categoria, data.estado, data.rating, data.notas, data.episodios_total, data.episodios_escuchados]
        );

        const [rows] = await pool.query('SELECT * FROM podcasts WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating podcast:', err);
        res.status(500).json({ message: 'Error creando podcast' });
    }
});

// PUT /api/podcasts/:id
router.put('/:id', async (req, res) => {
    try {
        const data = sanitize(req.body);
        if (!data.nombre) {
            return res.status(400).json({ message: 'El nombre es obligatorio' });
        }

        const [result] = await pool.query(
            `UPDATE podcasts SET
                nombre = ?, autor = ?, descripcion = ?, url_fuente = ?, audio_url = ?, portada_url = ?,
                categoria = ?, estado = ?, rating = ?, notas = ?,
                episodios_total = ?, episodios_escuchados = ?
             WHERE id = ? AND usuario_id = ?`,
            [data.nombre, data.autor, data.descripcion, data.url_fuente, data.audio_url, data.portada_url, data.categoria, data.estado, data.rating, data.notas, data.episodios_total, data.episodios_escuchados, req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Podcast no encontrado' });
        }

        const [rows] = await pool.query('SELECT * FROM podcasts WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error updating podcast:', err);
        res.status(500).json({ message: 'Error actualizando podcast' });
    }
});

// PATCH /api/podcasts/:id — actualización parcial (estado, rating, episodios escuchados)
router.patch('/:id', async (req, res) => {
    try {
        const fields = [];
        const values = [];

        if (ESTADOS_VALIDOS.includes(req.body.estado)) {
            fields.push('estado = ?');
            values.push(req.body.estado);
        }
        if (Number.isInteger(req.body.rating) && req.body.rating >= 0 && req.body.rating <= 5) {
            fields.push('rating = ?');
            values.push(req.body.rating);
        }
        if (Number.isInteger(req.body.episodios_escuchados) && req.body.episodios_escuchados >= 0) {
            fields.push('episodios_escuchados = ?');
            values.push(req.body.episodios_escuchados);
        }

        if (fields.length === 0) {
            return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
        }

        values.push(req.params.id, req.user.id);
        const [result] = await pool.query(
            `UPDATE podcasts SET ${fields.join(', ')} WHERE id = ? AND usuario_id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Podcast no encontrado' });
        }

        const [rows] = await pool.query('SELECT * FROM podcasts WHERE id = ?', [req.params.id]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error patching podcast:', err);
        res.status(500).json({ message: 'Error actualizando podcast' });
    }
});

// DELETE /api/podcasts/:id
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM podcasts WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Podcast no encontrado' });
        }
        res.json({ message: 'Podcast eliminado' });
    } catch (err) {
        console.error('Error deleting podcast:', err);
        res.status(500).json({ message: 'Error eliminando podcast' });
    }
});

module.exports = router;
