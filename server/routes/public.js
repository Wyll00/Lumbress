const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/public/shelf/:username — estantería pública (SIN login).
// Solo responde si el usuario la activó (public_shelf=1). Expone únicamente datos seguros:
// nombre, avatar, stats y libros (título/autor/género/valoración/portada). Nunca email/teléfono/etc.
router.get('/shelf/:username', async (req, res) => {
    try {
        const username = (req.params.username || '').trim();
        if (!username) return res.status(404).json({ message: 'No encontrado' });

        const [users] = await pool.query(
            'SELECT id, username, profile_image, reading_hours, public_shelf FROM usuarios WHERE username = ?',
            [username]
        );
        const u = users[0];
        if (!u || !u.public_shelf) {
            return res.status(404).json({ message: 'Estantería no encontrada o privada' });
        }

        const [books] = await pool.query(
            `SELECT titulo AS title, autor AS author, genero AS genre, calificacion AS rating,
                    estado_lectura AS status, portada_url AS coverUrl, cita_memorable
             FROM libros WHERE usuario_id = ? ORDER BY created_at DESC`,
            [u.id]
        );

        const read = books.filter((b) => b.status === 'Read').length;
        const genres = new Set(books.map((b) => (b.genre || '').trim().toLowerCase()).filter(Boolean)).size;

        res.json({
            username: u.username,
            avatar: u.profile_image || null,
            stats: { total: books.length, read, hours: u.reading_hours || 0, genres },
            books,
        });
    } catch (err) {
        console.error('[public] shelf error:', err.message);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
