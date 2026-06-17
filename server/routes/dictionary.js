const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

// Idiomas soportados y nombre de su sección en Wikcionario (autoglotónimo).
const WIKTIONARY_SECTION = { es: 'Español', fr: 'Français', it: 'Italiano', pt: 'Português', de: 'Deutsch', ru: 'Русский' };
const SUPPORTED_LANGS = ['es', 'en', ...Object.keys(WIKTIONARY_SECTION).filter((l) => l !== 'es')];

const UA = 'Lumbres/1.0 (lectura social; https://lumbress.com)';

// Limpia una palabra para la búsqueda: minúsculas y sin signos al inicio/fin.
const cleanWord = (raw) => String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// --- Fuente 1: dictionaryapi.dev (solo inglés, pero trae fonética y sinónimos) ---
async function fetchDictionaryApi(word, signal) {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal, headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry) return null;

    const phonetic = entry.phonetic
        || (Array.isArray(entry.phonetics) ? entry.phonetics.find((p) => p.text)?.text : '')
        || '';
    const meanings = (entry.meanings || [])
        .slice(0, 4)
        .map((m) => ({
            partOfSpeech: m.partOfSpeech || '',
            definitions: (m.definitions || []).slice(0, 3).map((d) => d.definition).filter(Boolean),
            synonyms: (m.synonyms || []).slice(0, 6),
        }))
        .filter((m) => m.definitions.length);
    return meanings.length ? { phonetic, meanings } : null;
}

// Secciones del Wikcionario que NO son acepciones (las saltamos).
const NON_DEF_SECTION = /^(Etimolog|Pronunciaci|Véase|Traducci|Referencias|Informaci|Conjugaci|Locucion|Expresion|Derivad|Relacionad|Forma flexiva|Anagram)/i;

// Convierte el texto plano (explaintext) del Wikcionario en acepciones agrupadas por tipo de palabra.
function parseWiktionary(extract, sectionName) {
    const lines = String(extract || '').split('\n');
    const isL2 = (l) => /^==(?!=).*==$/.test(l);          // == Idioma ==
    const isL3plus = (l) => /^={3,}.*={3,}$/.test(l);      // === Sección ===
    const headingText = (l) => l.replace(/^=+/, '').replace(/=+$/, '').trim();

    let inLang = false;
    let current = null;
    let afterNumber = false; // ¿la línea anterior era una cabecera de acepción ("1" o "1 Etiqueta")?
    const meanings = [];
    const push = (text) => {
        if (current && current.definitions.length < 6) current.definitions.push(text.trim().slice(0, 400));
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue; // ignoramos líneas en blanco (no rompen la secuencia número→definición)

        if (isL2(line)) {
            inLang = headingText(line).toLowerCase() === sectionName.toLowerCase();
            current = null; afterNumber = false; continue;
        }
        if (isL3plus(line)) {
            current = null; afterNumber = false;
            if (inLang && !NON_DEF_SECTION.test(headingText(line))) {
                current = { partOfSpeech: headingText(line), definitions: [], synonyms: [] };
                meanings.push(current);
            }
            continue;
        }
        if (!inLang || !current) { afterNumber = false; continue; }

        // En Wikcionario la acepción es: una cabecera numerada ("1" o "1 Etiqueta de contexto")
        // seguida, en la línea siguiente, del texto de la definición.
        if (/^\d+(\s+\S.*)?$/.test(line)) { afterNumber = true; continue; }
        if (afterNumber) { push(line); afterNumber = false; }
    }

    return meanings.filter((m) => m.definitions.length).slice(0, 5);
}

// --- Fuente 2: Wikcionario (español y otros idiomas) ---
async function fetchWiktionary(lang, word, signal) {
    const sectionName = WIKTIONARY_SECTION[lang] || 'Español';
    const url = `https://${lang}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(word)}`;
    const r = await fetch(url, { signal, headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    const pages = data?.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined || !page.extract) return null;
    const meanings = parseWiktionary(page.extract, sectionName);
    return meanings.length ? { phonetic: '', meanings } : null;
}

// GET /api/dictionary/define?word=xxx&lang=es — definición de una palabra.
router.get('/define', async (req, res) => {
    const lang = SUPPORTED_LANGS.includes(req.query.lang) ? req.query.lang : 'es';
    const word = cleanWord(req.query.word).slice(0, 80);
    if (!word) return res.status(400).json({ found: false, message: 'Falta la palabra.' });

    const fail = (status, message) => res.status(status).json({ word, found: false, message });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const result = lang === 'en'
            ? await fetchDictionaryApi(word, controller.signal)
            : await fetchWiktionary(lang, word, controller.signal);
        clearTimeout(timer);

        if (!result || !result.meanings.length) return fail(404, 'No encontramos una definición de esa palabra.');
        res.json({ word, phonetic: result.phonetic || '', meanings: result.meanings, lang, found: true });
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') return fail(504, 'La búsqueda tardó demasiado. Inténtalo de nuevo.');
        console.error('[dictionary] define error:', err.message);
        fail(502, 'No se pudo consultar el diccionario.');
    }
});

// === Palabras aprendidas (guardadas por el usuario) ===

// GET /api/dictionary/saved — lista de palabras guardadas por el usuario
router.get('/saved', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, palabra, definicion, idioma, libro_id, created_at
             FROM palabras_aprendidas
             WHERE usuario_id = ?
             ORDER BY created_at DESC
             LIMIT 500`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('[dictionary] saved list error:', err);
        res.status(500).json({ message: 'Error obteniendo tus palabras' });
    }
});

// POST /api/dictionary/saved { word, definition, lang, bookId } — guardar una palabra
router.post('/saved', async (req, res) => {
    try {
        const palabra = String(req.body.word || '').trim().slice(0, 190);
        if (!palabra) return res.status(400).json({ message: 'Falta la palabra.' });

        const definicion = String(req.body.definition || '').slice(0, 2000);
        const idioma = SUPPORTED_LANGS.includes(req.body.lang) ? req.body.lang : 'es';
        const libroId = Number.parseInt(req.body.bookId, 10);

        await pool.query(
            `INSERT INTO palabras_aprendidas (usuario_id, libro_id, palabra, definicion, idioma)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE definicion = VALUES(definicion), idioma = VALUES(idioma), libro_id = VALUES(libro_id)`,
            [req.user.id, Number.isInteger(libroId) ? libroId : null, palabra, definicion, idioma]
        );

        const [rows] = await pool.query(
            'SELECT id, palabra, definicion, idioma, libro_id, created_at FROM palabras_aprendidas WHERE usuario_id = ? AND palabra = ?',
            [req.user.id, palabra]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[dictionary] save error:', err);
        res.status(500).json({ message: 'Error guardando la palabra' });
    }
});

// DELETE /api/dictionary/saved/:id — borrar una palabra guardada
router.delete('/saved/:id', async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM palabras_aprendidas WHERE id = ? AND usuario_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Palabra no encontrada' });
        res.json({ message: 'Palabra eliminada', id: Number(req.params.id) });
    } catch (err) {
        console.error('[dictionary] delete error:', err);
        res.status(500).json({ message: 'Error eliminando la palabra' });
    }
});

module.exports = router;
