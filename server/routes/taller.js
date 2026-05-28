const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/taller — devuelve el documento del usuario (o null si no existe)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT data FROM taller_novela WHERE usuario_id = ?',
            [req.user.id]
        );
        if (rows.length === 0) return res.json({ data: null });
        let data = rows[0].data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch { /* dejar tal cual */ }
        }
        res.json({ data });
    } catch (err) {
        console.error('Error fetching taller:', err);
        res.status(500).json({ message: 'Error obteniendo el taller' });
    }
});

// PUT /api/taller — upsert del documento completo del usuario
router.put('/', async (req, res) => {
    try {
        const incoming = req.body?.data;
        if (!incoming || typeof incoming !== 'object') {
            return res.status(400).json({ message: 'Datos no válidos' });
        }
        const payload = JSON.stringify(incoming);

        await pool.query(
            `INSERT INTO taller_novela (usuario_id, data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data)`,
            [req.user.id, payload]
        );
        res.json({ saved: true });
    } catch (err) {
        console.error('Error saving taller:', err);
        res.status(500).json({ message: 'Error guardando el taller' });
    }
});

module.exports = router;
