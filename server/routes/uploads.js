const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');

router.use(auth);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Asegura que las carpetas existen
['audio', 'covers'].forEach(sub => {
    const dir = path.join(UPLOADS_DIR, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Tipos permitidos por categoría
const ALLOWED = {
    audio: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac'],
    covers: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const kind = req.params.kind === 'audio' ? 'audio' : 'covers';
        cb(null, path.join(UPLOADS_DIR, kind));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
        const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        cb(null, unique);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB máximo (podcasts largos)
    fileFilter: (req, file, cb) => {
        const kind = req.params.kind === 'audio' ? 'audio' : 'covers';
        if (ALLOWED[kind].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido para ${kind}`));
        }
    },
});

// POST /api/uploads/audio  |  POST /api/uploads/covers
router.post('/:kind', (req, res) => {
    const kind = req.params.kind;
    if (kind !== 'audio' && kind !== 'covers') {
        return res.status(400).json({ message: 'Categoría de subida no válida' });
    }

    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'El archivo supera el límite de 500 MB.' });
            }
            return res.status(400).json({ message: err.message || 'Error al subir el archivo' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo' });
        }
        // Ruta pública relativa (servida por Express en /uploads)
        const url = `/uploads/${kind}/${req.file.filename}`;
        res.status(201).json({
            url,
            filename: req.file.filename,
            size: req.file.size,
        });
    });
});

// DELETE /api/uploads?path=/uploads/audio/xxx — borra un archivo subido
router.delete('/', (req, res) => {
    try {
        const relPath = String(req.query.path || '');
        // Seguridad: solo permitir borrar dentro de /uploads/audio o /uploads/covers
        if (!/^\/uploads\/(audio|covers)\/[\w.-]+$/.test(relPath)) {
            return res.status(400).json({ message: 'Ruta no válida' });
        }
        const filePath = path.join(__dirname, '..', relPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.json({ message: 'Archivo eliminado' });
    } catch (err) {
        console.error('Error deleting upload:', err);
        res.status(500).json({ message: 'Error eliminando archivo' });
    }
});

module.exports = router;
