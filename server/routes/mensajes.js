const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendNewMessageEmail } = require('../services/mailer');

router.use(auth);

// GET /api/mensajes/conversaciones — lista de conversaciones del usuario
// (el otro usuario, último mensaje, fecha, nº no leídos)
router.get('/conversaciones', async (req, res) => {
    try {
        const uid = req.user.id;
        const [rows] = await pool.query(
            `SELECT
                otro.id AS user_id,
                otro.username,
                otro.profile_image,
                (SELECT contenido FROM mensajes m2
                   WHERE (m2.emisor_id = uid AND m2.receptor_id = otro.id)
                      OR (m2.emisor_id = otro.id AND m2.receptor_id = uid)
                   ORDER BY m2.created_at DESC LIMIT 1) AS ultimo_mensaje,
                (SELECT created_at FROM mensajes m3
                   WHERE (m3.emisor_id = uid AND m3.receptor_id = otro.id)
                      OR (m3.emisor_id = otro.id AND m3.receptor_id = uid)
                   ORDER BY m3.created_at DESC LIMIT 1) AS ultima_fecha,
                (SELECT COUNT(*) FROM mensajes m4
                   WHERE m4.emisor_id = otro.id AND m4.receptor_id = uid AND m4.leido = 0) AS no_leidos
             FROM (
                SELECT ? AS uid
             ) vars
             JOIN usuarios otro ON otro.id IN (
                SELECT CASE WHEN emisor_id = ? THEN receptor_id ELSE emisor_id END
                FROM mensajes
                WHERE emisor_id = ? OR receptor_id = ?
             )
             ORDER BY ultima_fecha DESC`,
            [uid, uid, uid, uid]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching conversaciones:', err);
        res.status(500).json({ message: 'Error obteniendo conversaciones' });
    }
});

// GET /api/mensajes/no-leidos — total de mensajes no leídos (badge)
router.get('/no-leidos', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT COUNT(*) AS total FROM mensajes WHERE receptor_id = ? AND leido = 0',
            [req.user.id]
        );
        res.json({ total: rows[0].total });
    } catch (err) {
        console.error('Error fetching no-leidos:', err);
        res.status(500).json({ message: 'Error' });
    }
});

// GET /api/mensajes/:userId — mensajes con un usuario (y marca como leídos los recibidos)
router.get('/:userId', async (req, res) => {
    try {
        const uid = req.user.id;
        const otro = Number(req.params.userId);
        if (!Number.isInteger(otro)) {
            return res.status(400).json({ message: 'Usuario no válido' });
        }

        const [rows] = await pool.query(
            `SELECT m.id, m.emisor_id, m.receptor_id, m.contenido, m.leido, m.created_at, m.anuncio_id
             FROM mensajes m
             WHERE (m.emisor_id = ? AND m.receptor_id = ?)
                OR (m.emisor_id = ? AND m.receptor_id = ?)
             ORDER BY m.created_at ASC`,
            [uid, otro, otro, uid]
        );

        // Marcar como leídos los que me envió el otro
        await pool.query(
            'UPDATE mensajes SET leido = 1 WHERE emisor_id = ? AND receptor_id = ? AND leido = 0',
            [otro, uid]
        );

        // Datos del otro usuario
        const [u] = await pool.query('SELECT id, username, profile_image FROM usuarios WHERE id = ?', [otro]);

        // Anuncio del que trata la conversación (el más reciente con anuncio_id entre ambos)
        const [anuncioRows] = await pool.query(
            `SELECT a.id, a.titulo_libro, a.precio, a.moneda, a.imagen_url, a.vendido
             FROM mensajes m JOIN anuncios a ON a.id = m.anuncio_id
             WHERE m.anuncio_id IS NOT NULL
               AND ((m.emisor_id = ? AND m.receptor_id = ?) OR (m.emisor_id = ? AND m.receptor_id = ?))
             ORDER BY m.created_at DESC LIMIT 1`,
            [uid, otro, otro, uid]
        );

        res.json({ mensajes: rows, usuario: u[0] || null, anuncio: anuncioRows[0] || null });
    } catch (err) {
        console.error('Error fetching mensajes:', err);
        res.status(500).json({ message: 'Error obteniendo mensajes' });
    }
});

// POST /api/mensajes — enviar { receptor_id, contenido }
router.post('/', async (req, res) => {
    try {
        const receptor_id = Number(req.body.receptor_id);
        const contenido = typeof req.body.contenido === 'string' ? req.body.contenido.trim() : '';

        if (!Number.isInteger(receptor_id) || !contenido) {
            return res.status(400).json({ message: 'Destinatario y mensaje son obligatorios' });
        }
        if (receptor_id === req.user.id) {
            return res.status(400).json({ message: 'No puedes enviarte mensajes a ti mismo' });
        }
        if (contenido.length > 2000) {
            return res.status(400).json({ message: 'El mensaje es demasiado largo' });
        }

        // Verificar que el receptor existe (y traer datos para el aviso por email)
        const [exists] = await pool.query('SELECT id, username, email FROM usuarios WHERE id = ?', [receptor_id]);
        if (exists.length === 0) {
            return res.status(404).json({ message: 'El destinatario no existe' });
        }
        const receptor = exists[0];

        // Anuncio opcional del que trata la conversación (al contactar desde una oferta)
        const anuncioIdRaw = Number(req.body.anuncio_id);
        const anuncio_id = Number.isInteger(anuncioIdRaw) && anuncioIdRaw > 0 ? anuncioIdRaw : null;

        const [result] = await pool.query(
            'INSERT INTO mensajes (emisor_id, receptor_id, contenido, anuncio_id) VALUES (?, ?, ?, ?)',
            [req.user.id, receptor_id, contenido, anuncio_id]
        );

        const [rows] = await pool.query('SELECT * FROM mensajes WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);

        // Aviso "urgente" por email al destinatario.
        // No se hace await: la respuesta ya salió y un fallo de email nunca debe romper el envío del mensaje.
        sendNewMessageEmail({
            toEmail: receptor.email,
            toName: receptor.username,
            fromName: req.user.username,
            preview: contenido,
        }).catch((e) => console.error('[mail] fallo no crítico:', e.message));
    } catch (err) {
        console.error('Error sending mensaje:', err);
        res.status(500).json({ message: 'Error enviando el mensaje' });
    }
});

module.exports = router;
