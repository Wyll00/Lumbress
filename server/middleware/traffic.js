const pool = require('../db');
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('../utils/cookies');
const { clientIp, lookupCountry } = require('../utils/geo');

// Rutas que NO contamos como petición (ruido o bucle con el propio panel)
const SKIP = [/^\/api\/admin/, /^\/api\/health/, /^\/api\/track/];

// Lee el usuario del token (cookie o Bearer) sin fallar si no hay sesión.
function userIdFrom(req) {
    try {
        const token = req.cookies?.[COOKIE_NAME] || req.header('Authorization')?.replace('Bearer ', '');
        if (token) return jwt.verify(token, process.env.JWT_SECRET).id || null;
    } catch { /* sin sesión válida */ }
    return null;
}

// Registra cada petición a la API (fire-and-forget, nunca bloquea la respuesta).
function logTraffic(req, res, next) {
    res.on('finish', () => {
        try {
            const ruta = (req.originalUrl || req.url).split('?')[0];
            if (SKIP.some((re) => re.test(ruta))) return;
            const ip = clientIp(req);
            const { code, name } = lookupCountry(ip);
            pool.query(
                'INSERT INTO trafico (tipo, metodo, ruta, status, ip, pais, pais_codigo, usuario_id) VALUES (?,?,?,?,?,?,?,?)',
                ['request', req.method, ruta.slice(0, 255), res.statusCode, ip.slice(0, 45) || null, name, code, userIdFrom(req)]
            ).catch(() => { /* no rompemos nada por el logging */ });
        } catch { /* idem */ }
    });
    next();
}

module.exports = { logTraffic, userIdFrom };
