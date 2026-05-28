const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/events - Obtener todos los eventos del usuario
router.get('/', auth, async (req, res) => {
    try {
        const [events] = await pool.query(
            'SELECT * FROM calendar_events WHERE usuario_id = ? ORDER BY fecha ASC, hora ASC',
            [req.user.id]
        );
        res.json(events);
    } catch (err) {
        console.error('Error fetching events:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/events - Crear un nuevo evento
router.post('/', auth, async (req, res) => {
    try {
        const { titulo, fecha, hora } = req.body;

        if (!titulo || !fecha || !hora) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const [result] = await pool.query(
            'INSERT INTO calendar_events (usuario_id, titulo, fecha, hora) VALUES (?, ?, ?, ?)',
            [req.user.id, titulo, fecha, hora]
        );

        res.status(201).json({
            id: result.insertId,
            usuario_id: req.user.id,
            titulo,
            fecha,
            hora
        });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ message: 'Error al crear evento' });
    }
});

// DELETE /api/events/:id - Eliminar evento
router.delete('/:id', auth, async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM calendar_events WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Evento no encontrado o sin permisos' });
        }

        res.json({ message: 'Evento eliminado exitosamente' });
    } catch (err) {
        console.error('Error deleting event:', err);
        res.status(500).json({ message: 'Error al eliminar evento' });
    }
});

module.exports = router;
