const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/posts — Todos los posts (de todos los usuarios), con datos del autor y likes
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [posts] = await pool.query(`
            SELECT 
                p.id, p.tipo, p.titulo, p.contenido, p.imagen, p.created_at,
                u.id AS autor_id, u.username AS autor_username, u.profile_image AS autor_avatar,
                COUNT(DISTINCT pl.usuario_id) AS likes_count,
                MAX(CASE WHEN pl.usuario_id = ? THEN 1 ELSE 0 END) AS liked_by_me
            FROM posts p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            GROUP BY p.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, limit, offset]);

        res.json(posts);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/posts — Crear un post nuevo
router.post('/', auth, async (req, res) => {
    try {
        const { tipo = 'general', titulo, contenido, imagen } = req.body;

        if (!contenido || contenido.trim().length === 0) {
            return res.status(400).json({ message: 'El contenido no puede estar vacío.' });
        }
        if (contenido.length > 5000) {
            return res.status(400).json({ message: 'El contenido no puede superar los 5000 caracteres.' });
        }

        const [result] = await pool.query(
            'INSERT INTO posts (usuario_id, tipo, titulo, contenido, imagen) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, tipo, titulo || null, contenido.trim(), imagen || null]
        );

        // Fetch the full post with author info to return
        const [rows] = await pool.query(`
            SELECT 
                p.id, p.tipo, p.titulo, p.contenido, p.imagen, p.created_at,
                u.id AS autor_id, u.username AS autor_username, u.profile_image AS autor_avatar,
                0 AS likes_count,
                0 AS liked_by_me
            FROM posts p
            JOIN usuarios u ON u.id = p.usuario_id
            WHERE p.id = ?
        `, [result.insertId]);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// DELETE /api/posts/:id — Borrar propio post
router.delete('/:id', auth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT usuario_id FROM posts WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Post no encontrado' });
        if (rows[0].usuario_id !== req.user.id) {
            return res.status(403).json({ message: 'No puedes borrar el post de otro usuario.' });
        }

        await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
        res.json({ message: 'Post eliminado correctamente.' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/posts/:id/like — Toggle like
router.post('/:id/like', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        // Check if already liked
        const [existing] = await pool.query(
            'SELECT 1 FROM post_likes WHERE post_id = ? AND usuario_id = ?',
            [postId, userId]
        );

        let liked;
        if (existing.length > 0) {
            await pool.query('DELETE FROM post_likes WHERE post_id = ? AND usuario_id = ?', [postId, userId]);
            liked = false;
        } else {
            await pool.query('INSERT INTO post_likes (post_id, usuario_id) VALUES (?, ?)', [postId, userId]);
            liked = true;
        }

        const [[{ count }]] = await pool.query(
            'SELECT COUNT(*) AS count FROM post_likes WHERE post_id = ?', [postId]
        );

        res.json({ liked, likes_count: count });
    } catch (err) {
        console.error('Error toggling like:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
