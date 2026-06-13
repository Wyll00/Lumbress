const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { COOKIE_NAME, cookieOptions } = require('../utils/cookies');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const issueToken = (user) => jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
        }

        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Correo electrónico no válido' });
        }

        if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
            return res.status(400).json({ message: 'El nombre de usuario debe tener entre 3 y 30 caracteres' });
        }

        const [existing] = await pool.query('SELECT id FROM usuarios WHERE email = ? OR username = ?', [email, username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'El usuario o el correo ya están registrados' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO usuarios (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        
        const newUserId = result.insertId;

        // Auto-seed Categories for this new user!
        const massiveTags = [
            'Drama 🎭', 'Ciencia Ficción 🚀', 'Novela Negra 🕶️', 'Poesía ✒️', 
            'Fantasía Épica 🐉', 'Romance ✨', 'Misterio & Thriller 🕵️‍♂️',
            'Novela Histórica 🏛️', 'Crecimiento Personal 📈', 'Terror / Horror 👻',
            'Biografía & Memorias 📖', 'Aventura 🗺️', 'Realismo Mágico 🦋',
            'Ensayo / Filosofía 🧠', 'Comedia / Humor 😂', 'Clásicos Inmortales 📜',
            'Distopía 🌆', 'Favoritos ⭐', 'Para Llorar a Mares 😭', 'Mejores del Año 🏆', 'Lecturas Ligeras ☕'
        ];
        
        for (const tag of massiveTags) {
            await pool.query(
                'INSERT IGNORE INTO etiquetas_literarias (usuario_id, nombre) VALUES (?, ?)',
                [newUserId, tag]
            );
        }

        const newUser = { id: newUserId, username, email };
        const token = issueToken(newUser);
        res.cookie(COOKIE_NAME, token, cookieOptions());
        res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser, token });

    } catch (err) {
        console.error('Error in register:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
        }

        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = issueToken(user);
        res.cookie(COOKIE_NAME, token, cookieOptions());

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            token // usado por la app nativa (auth por cabecera); la web ignora esto y usa la cookie
        });

    } catch (err) {
        console.error('Error in login:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/auth/logout — limpia la cookie de sesión
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
