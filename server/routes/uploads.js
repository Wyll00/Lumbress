const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const pool = require('../db');
const { getPlan } = require('../middleware/plan');

router.use(auth);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Asegura que las carpetas existen
['audio', 'covers', 'books'].forEach(sub => {
    const dir = path.join(UPLOADS_DIR, sub);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Tipos permitidos por categoría
const ALLOWED = {
    audio: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac'],
    covers: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};
// Los EPUB llegan a veces como octet-stream según el navegador: para books validamos por extensión.
const BOOK_EXTS = ['.epub', '.pdf'];
const KINDS = ['audio', 'covers', 'books'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const kind = KINDS.includes(req.params.kind) ? req.params.kind : 'covers';
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
        const kind = KINDS.includes(req.params.kind) ? req.params.kind : 'covers';
        if (kind === 'books') {
            const ext = path.extname(file.originalname).toLowerCase();
            return BOOK_EXTS.includes(ext)
                ? cb(null, true)
                : cb(new Error('Solo se admiten archivos EPUB o PDF'));
        }
        if (ALLOWED[kind].includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido para ${kind}`));
        }
    },
});

// POST /api/uploads/audio | /covers | /books (books descuenta del almacenamiento del plan)
router.post('/:kind', (req, res) => {
    const kind = req.params.kind;
    if (!KINDS.includes(kind)) {
        return res.status(400).json({ message: 'Categoría de subida no válida' });
    }

    upload.single('file')(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ message: 'El archivo supera el límite de 500 MB.' });
            }
            return res.status(400).json({ message: err.message || 'Error al subir el archivo' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'No se recibió ningún archivo' });
        }

        // Cuota de almacenamiento por plan (free: 500 MB, premium: 20 GB)
        if (kind === 'books') {
            try {
                const { storageUsed, limits } = await getPlan(req.user.id);
                if (storageUsed + req.file.size > limits.maxStorageBytes) {
                    fs.unlinkSync(req.file.path);
                    const mb = Math.round(limits.maxStorageBytes / 1024 / 1024);
                    return res.status(402).json({
                        code: 'STORAGE_LIMIT',
                        message: `Has alcanzado el límite de almacenamiento de tu plan (${mb} MB). Pásate a Premium para más espacio.`,
                    });
                }
                await pool.query('UPDATE usuarios SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?', [req.file.size, req.user.id]);
            } catch (e) {
                console.error('Error comprobando almacenamiento:', e);
                fs.unlinkSync(req.file.path);
                return res.status(500).json({ message: 'Error comprobando tu almacenamiento' });
            }
        }

        // Ruta pública relativa (servida por Express en /uploads)
        const url = `/uploads/${kind}/${req.file.filename}`;
        res.status(201).json({
            url,
            filename: req.file.filename,
            size: req.file.size,
            fileType: path.extname(req.file.filename).slice(1).toLowerCase() || null,
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
