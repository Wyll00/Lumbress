const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/users/me — Obtener perfil del usuario autenticado
router.get('/me', auth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, username, email, phone, profile_image, reading_hours, podcast_seconds, reading_goal, public_shelf FROM usuarios WHERE id = ?',
            [req.user.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me — Actualizar perfil (username, email, phone, profile_image)
router.put('/me', auth, async (req, res) => {
    try {
        const { username, email, phone, profile_image } = req.body;

        // Check if email/username already belongs to another user
        if (email || username) {
            const [conflict] = await pool.query(
                'SELECT id FROM usuarios WHERE (email = ? OR username = ?) AND id != ?',
                [email || '', username || '', req.user.id]
            );
            if (conflict.length > 0) {
                return res.status(400).json({ message: 'El nombre de usuario o email ya está en uso por otra cuenta.' });
            }
        }

        await pool.query(
            'UPDATE usuarios SET username = COALESCE(?, username), email = COALESCE(?, email), phone = COALESCE(?, phone), profile_image = COALESCE(?, profile_image) WHERE id = ?',
            [username || null, email || null, phone || null, profile_image || null, req.user.id]
        );

        const [updated] = await pool.query(
            'SELECT id, username, email, phone, profile_image, reading_hours, podcast_seconds, reading_goal, public_shelf FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        res.json({ message: 'Perfil actualizado correctamente', user: updated[0] });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me/password — Cambiar contraseña
router.put('/me/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Debes proporcionar la contraseña actual y la nueva.' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        }

        const [rows] = await pool.query('SELECT password FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashed, req.user.id]);

        res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me/reading-hours — Añadir horas de lectura
router.put('/me/reading-hours', auth, async (req, res) => {
    try {
        const { hoursToAdd } = req.body;
        
        if (typeof hoursToAdd !== 'number' || hoursToAdd <= 0) {
            return res.status(400).json({ message: 'Por favor, introduce una cantidad válida de horas.' });
        }

        // Increment hours
        await pool.query(
            'UPDATE usuarios SET reading_hours = reading_hours + ? WHERE id = ?',
            [hoursToAdd, req.user.id]
        );

        // Registrar en el historial de lectura de hoy
        await pool.query(
            'INSERT INTO reading_logs (user_id, hours, log_date) VALUES (?, ?, CURRENT_DATE)',
            [req.user.id, hoursToAdd]
        );

        // Fetch updated user
        const [updated] = await pool.query(
            'SELECT id, username, email, phone, profile_image, reading_hours, podcast_seconds, reading_goal, public_shelf FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        res.json({ message: 'Horas añadidas correctamente', user: updated[0] });
    } catch (err) {
        console.error('Error adding reading hours:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/users/me/reading-stats — Obtener estadísticas de lectura (últimos 7 días)
router.get('/me/reading-stats', auth, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                log_date, 
                SUM(hours) as total_hours 
            FROM reading_logs 
            WHERE user_id = ? 
              AND log_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 DAY)
            GROUP BY log_date
            ORDER BY log_date ASC
        `, [req.user.id]);
        
        res.json(rows);
    } catch (err) {
        console.error('Error fetching reading stats:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me/podcast-time — sumar segundos escuchados
router.put('/me/podcast-time', auth, async (req, res) => {
    try {
        const { secondsToAdd } = req.body;
        if (!Number.isFinite(secondsToAdd) || secondsToAdd <= 0 || secondsToAdd > 7200) {
            // máximo 2h de un solo golpe (anti-abuso)
            return res.status(400).json({ message: 'Cantidad de segundos inválida.' });
        }

        const seconds = Math.round(secondsToAdd);

        await pool.query(
            'UPDATE usuarios SET podcast_seconds = podcast_seconds + ? WHERE id = ?',
            [seconds, req.user.id]
        );

        const [updated] = await pool.query(
            'SELECT podcast_seconds FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        res.json({ podcast_seconds: updated[0].podcast_seconds });
    } catch (err) {
        console.error('Error adding podcast time:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me/public-shelf — activar/desactivar la estantería pública
router.put('/me/public-shelf', auth, async (req, res) => {
    try {
        const enabled = req.body.enabled ? 1 : 0;
        await pool.query('UPDATE usuarios SET public_shelf = ? WHERE id = ?', [enabled, req.user.id]);
        const [updated] = await pool.query(
            'SELECT id, username, email, phone, profile_image, reading_hours, podcast_seconds, reading_goal, public_shelf FROM usuarios WHERE id = ?',
            [req.user.id]
        );
        res.json({ message: 'Estantería actualizada', user: updated[0] });
    } catch (err) {
        console.error('Error toggling public shelf:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// PUT /api/users/me/reading-goal — fijar la meta anual de libros
router.put('/me/reading-goal', auth, async (req, res) => {
    try {
        const goal = parseInt(req.body.goal, 10);
        if (!Number.isInteger(goal) || goal < 0 || goal > 9999) {
            return res.status(400).json({ message: 'Meta no válida (0–9999).' });
        }
        await pool.query('UPDATE usuarios SET reading_goal = ? WHERE id = ?', [goal, req.user.id]);
        const [updated] = await pool.query(
            'SELECT id, username, email, phone, profile_image, reading_hours, podcast_seconds, reading_goal, public_shelf FROM usuarios WHERE id = ?',
            [req.user.id]
        );
        res.json({ message: 'Meta actualizada', user: updated[0] });
    } catch (err) {
        console.error('Error setting reading goal:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
