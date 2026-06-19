const express = require('express');
const router = express.Router();
const pool = require('../db');
const { clientIp, lookupCountry } = require('../utils/geo');
const { userIdFrom } = require('../middleware/traffic');

// POST /api/track { path } — registra una "página vista" (navegación del SPA).
// Público (también cuenta visitas sin sesión), pero adjunta el usuario si hay token.
router.post('/', async (req, res) => {
    try {
        const ruta = (String(req.body.path || '/').split('?')[0]).slice(0, 255) || '/';
        const ip = clientIp(req);
        const { code, name } = lookupCountry(ip);
        await pool.query(
            'INSERT INTO trafico (tipo, metodo, ruta, status, ip, pais, pais_codigo, usuario_id) VALUES (?,?,?,?,?,?,?,?)',
            ['pageview', 'GET', ruta, 200, ip.slice(0, 45) || null, name, code, userIdFrom(req)]
        );
        res.json({ ok: true });
    } catch {
        res.json({ ok: false });
    }
});

module.exports = router;
