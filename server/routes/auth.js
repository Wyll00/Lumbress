const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { COOKIE_NAME, cookieOptions } = require('../utils/cookies');
const { sendVerificationCode } = require('../services/mailer');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const issueToken = (user) => jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

// Código de verificación de 6 dígitos + caducidad (15 min)
const genCode = () => String(Math.floor(100000 + Math.random() * 900000));
const codeExpiry = () => new Date(Date.now() + 15 * 60 * 1000);

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

        // NB: las categorías por defecto NO se siembran aquí, sino al verificar / primer uso
        // (las auto-crea GET /api/categories). Así una cuenta sin verificar no deja datos basura.

        // Cuenta sin verificar: generamos código, lo guardamos y lo enviamos por email.
        const code = genCode();
        await pool.query(
            'UPDATE usuarios SET verification_code = ?, verification_expires = ? WHERE id = ?',
            [code, codeExpiry(), newUserId]
        );
        await sendVerificationCode({ toEmail: email, toName: username, code });

        res.status(201).json({
            message: 'Cuenta creada. Revisa tu correo e introduce el código de verificación.',
            needsVerification: true,
            email,
        });

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

        // Cuenta sin verificar: reenviamos un código y pedimos al cliente que vaya a verificar.
        if (!user.email_verified) {
            const code = genCode();
            await pool.query(
                'UPDATE usuarios SET verification_code = ?, verification_expires = ? WHERE id = ?',
                [code, codeExpiry(), user.id]
            );
            await sendVerificationCode({ toEmail: user.email, toName: user.username, code });
            return res.status(403).json({
                code: 'NEEDS_VERIFICATION',
                message: 'Tu cuenta no está verificada. Te enviamos un código al correo.',
                email: user.email,
            });
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

// POST /api/auth/verify-email { email, code } — valida el código y deja al usuario dentro
router.post('/verify-email', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim();
        const code = String(req.body.code || '').trim();
        if (!email || !code) return res.status(400).json({ message: 'Faltan datos.' });

        const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'Cuenta no encontrada.' });
        const user = users[0];

        if (user.email_verified) {
            return res.status(400).json({ message: 'Esta cuenta ya está verificada. Inicia sesión.' });
        }
        if (!user.verification_code || !user.verification_expires) {
            return res.status(400).json({ message: 'No hay ningún código pendiente. Pide uno nuevo.' });
        }
        if (new Date(user.verification_expires) < new Date()) {
            return res.status(400).json({ code: 'EXPIRED', message: 'El código ha caducado. Pide uno nuevo.' });
        }
        if (String(user.verification_code) !== code) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        await pool.query(
            'UPDATE usuarios SET email_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
            [user.id]
        );

        const token = issueToken(user);
        res.cookie(COOKIE_NAME, token, cookieOptions());
        res.json({
            message: '¡Cuenta verificada!',
            user: { id: user.id, username: user.username, email: user.email },
            token,
        });
    } catch (err) {
        console.error('Error in verify-email:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/auth/resend-code { email } — reenvía un código nuevo (no revela si la cuenta existe)
router.post('/resend-code', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim();
        if (!email) return res.status(400).json({ message: 'Falta el correo.' });

        const [users] = await pool.query('SELECT id, username, email_verified FROM usuarios WHERE email = ?', [email]);
        // Respuesta uniforme aunque no exista / ya esté verificada (evita enumerar cuentas)
        if (users.length > 0 && !users[0].email_verified) {
            const code = genCode();
            await pool.query(
                'UPDATE usuarios SET verification_code = ?, verification_expires = ? WHERE id = ?',
                [code, codeExpiry(), users[0].id]
            );
            await sendVerificationCode({ toEmail: email, toName: users[0].username, code });
        }
        res.json({ message: 'Si la cuenta existe y no está verificada, te hemos enviado un código.' });
    } catch (err) {
        console.error('Error in resend-code:', err);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/auth/logout — limpia la cookie de sesión
router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
