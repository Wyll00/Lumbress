const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        let [categories] = await pool.query('SELECT * FROM etiquetas_literarias WHERE usuario_id = ? ORDER BY nombre ASC', [req.user.id]);

        // Auto-seed para usuarios antiguos que no tienen etiquetas
        if (categories.length === 0) {
            const massiveTags = [
                'Drama 🎭', 'Ciencia Ficción 🚀', 'Novela Negra 🕶️', 'Poesía ✒️',
                'Fantasía Épica 🐉', 'Romance ✨', 'Misterio & Thriller 🕵️‍♂️',
                'Novela Histórica 🏛️', 'Crecimiento Personal 📈', 'Terror / Horror 👻',
                'Biografía & Memorias 📖', 'Aventura 🗺️', 'Realismo Mágico 🦋',
                'Ensayo / Filosofía 🧠', 'Comedia / Humor 😂', 'Clásicos Inmortales 📜',
                'Distopía 🌆', 'Favoritos ⭐', 'Para Llorar a Mares 😭', 'Mejores del Año 🏆', 'Lecturas Ligeras ☕'
            ];
            for (const tag of massiveTags) {
                await pool.query('INSERT IGNORE INTO etiquetas_literarias (usuario_id, nombre) VALUES (?, ?)', [req.user.id, tag]);
            }
            // Refetch
            const [newCat] = await pool.query('SELECT * FROM etiquetas_literarias WHERE usuario_id = ? ORDER BY nombre ASC', [req.user.id]);
            categories = newCat;
        }

        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error obteniendo categorías' });
    }
});

// POST /api/categories (Crear nueva etiqueta personalizada)
router.post('/', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ message: 'El nombre es obligatorio' });

        const [result] = await pool.query('INSERT INTO etiquetas_literarias (usuario_id, nombre) VALUES (?, ?)', [req.user.id, nombre]);
        res.status(201).json({ id: result.insertId, usuario_id: req.user.id, nombre });
    } catch (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya tienes una etiqueta con este nombre' });
        }
        res.status(500).json({ message: 'Error creando categoría' });
    }
});

// DELETE /api/categories/:id (Eliminar etiqueta personalizada)
router.delete('/:id', async (req, res) => {
    try {
        const catId = req.params.id;
        const [result] = await pool.query('DELETE FROM etiquetas_literarias WHERE id = ? AND usuario_id = ?', [catId, req.user.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada o sin permisos' });
        }

        res.json({ message: 'Categoría eliminada con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error eliminando categoría' });
    }
});

const MAX_CATEGORIES_PER_BOOK = 4;

// POST /api/categories/assign
router.post('/assign', async (req, res) => {
    try {
        const { libro_id, etiqueta_id } = req.body;

        // Verificamos que el usuario logueado es el dueño del libro
        const [owns] = await pool.query('SELECT id FROM libros WHERE id = ? AND usuario_id = ?', [libro_id, req.user.id]);
        if (owns.length === 0) {
            return res.status(403).json({ message: 'No tienes permisos sobre este libro' });
        }

        // Comprobar si ya está asignada (no contar como una nueva)
        const [existing] = await pool.query(
            'SELECT 1 FROM libros_etiquetas WHERE libro_id = ? AND etiqueta_id = ? LIMIT 1',
            [libro_id, etiqueta_id]
        );

        if (existing.length === 0) {
            // No estaba: comprobar límite
            const [count] = await pool.query(
                'SELECT COUNT(*) AS n FROM libros_etiquetas WHERE libro_id = ?',
                [libro_id]
            );
            if (count[0].n >= MAX_CATEGORIES_PER_BOOK) {
                return res.status(400).json({
                    message: `Máximo ${MAX_CATEGORIES_PER_BOOK} categorías por libro.`,
                });
            }
        }

        // INSERT IGNORE para que si ya está en esta categoría no falle
        await pool.query('INSERT IGNORE INTO libros_etiquetas (libro_id, etiqueta_id) VALUES (?, ?)', [libro_id, etiqueta_id]);

        res.json({ message: 'Categoría asignada correctamente al libro' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error vinculando libro a etiqueta' });
    }
});

// POST /api/categories/remove (Desvincular etiqueta de libro)
router.post('/remove', async (req, res) => {
    try {
        const { libro_id, etiqueta_id } = req.body;

        // Verificamos que el usuario logueado es el dueño del libro
        const [owns] = await pool.query('SELECT id FROM libros WHERE id = ? AND usuario_id = ?', [libro_id, req.user.id]);
        if (owns.length === 0) {
            return res.status(403).json({ message: 'No tienes permisos sobre este libro' });
        }

        await pool.query('DELETE FROM libros_etiquetas WHERE libro_id = ? AND etiqueta_id = ?', [libro_id, etiqueta_id]);

        res.json({ message: 'Categoría removida correctamente del libro' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error removiendo libro de etiqueta' });
    }
});

module.exports = router;
