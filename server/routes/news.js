const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { fetchAndStore } = require('../services/newsFetcher');

router.use(auth);

const PERIODS = {
    day:   'INTERVAL 1 DAY',
    week:  'INTERVAL 7 DAY',
    month: 'INTERVAL 30 DAY',
    year:  'INTERVAL 365 DAY',
};

// GET /api/news?period=day|week|month|year&source=...
router.get('/', async (req, res) => {
    try {
        const period = PERIODS[req.query.period] || PERIODS.week;
        const source = req.query.source;

        let sql = `SELECT id, titulo, descripcion, link, source, image_url, fecha_publicacion
                   FROM noticias
                   WHERE fecha_publicacion >= DATE_SUB(NOW(), ${period})`;
        const params = [];

        if (source) {
            sql += ' AND source = ?';
            params.push(source);
        }

        sql += ' ORDER BY fecha_publicacion DESC LIMIT 100';

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching news:', err);
        res.status(500).json({ message: 'Error obteniendo noticias' });
    }
});

// GET /api/news/sources — lista única de fuentes disponibles
router.get('/sources', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT source, COUNT(*) AS total
             FROM noticias
             WHERE fecha_publicacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY source
             ORDER BY total DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching sources:', err);
        res.status(500).json({ message: 'Error obteniendo fuentes' });
    }
});

// POST /api/news/refresh — fuerza un fetch manual
router.post('/refresh', async (req, res) => {
    try {
        fetchAndStore().catch(err => console.error('Manual refresh failed', err));
        res.json({ message: 'Refresh iniciado en segundo plano' });
    } catch (err) {
        console.error('Error refreshing news:', err);
        res.status(500).json({ message: 'Error refrescando noticias' });
    }
});

module.exports = router;
