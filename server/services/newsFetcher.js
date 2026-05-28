const Parser = require('rss-parser');
const pool = require('../db');

// Feeds RSS de fuentes literarias / cultura en español
const FEEDS = [
    { url: 'https://www.zendalibros.com/feed/', source: 'Zenda' },
    { url: 'https://www.lecturalia.com/blog/feed/', source: 'Lecturalia' },
    { url: 'https://www.elperiodico.com/es/rss/cultura/rss.xml', source: 'El Periódico Cultura' },
    { url: 'https://www.abc.es/rss/feeds/abc_Libros.xml', source: 'ABC Libros' },
    { url: 'https://e00-elmundo.uecdn.es/elmundo/rss/cultura.xml', source: 'El Mundo Cultura' },
];

const parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliotecaPersonal/1.0)' },
    customFields: {
        item: [
            ['media:content', 'mediaContent', { keepArray: false }],
            ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
            ['description', 'description'],
        ],
    },
});

// Palabras clave que indican que la noticia es sobre libros / literatura.
const LITERARY_KEYWORDS = [
    // Objetos
    'libro', 'libros', 'novela', 'novelas', 'cuento', 'cuentos', 'relato', 'relatos',
    'ensayo', 'ensayos', 'poesía', 'poesia', 'poema', 'poemas', 'biografía', 'biografia',
    'memorias', 'antología', 'antologia', 'saga', 'trilogía', 'trilogia',
    // Personas
    'autor', 'autora', 'autores', 'autoras', 'escritor', 'escritora', 'escritores', 'escritoras',
    'novelista', 'poeta', 'poetisa', 'ensayista', 'cuentista', 'narrador', 'narradora',
    'lector', 'lectora', 'lectores', 'lectoras',
    'traductor', 'traductora', 'traducción', 'traduccion',
    'librero', 'librera', 'editor', 'editora', 'editorial',
    // Acciones / actividades
    'lectura', 'literatura', 'literario', 'literaria',
    'publica un libro', 'publica una novela', 'publicación literaria',
    'lanza su novela', 'lanza su libro', 'estrena novela',
    'firma de libros', 'feria del libro', 'librería', 'libreria',
    'best seller', 'bestseller', 'más vendidos', 'mas vendidos',
    // Premios literarios
    'premio nobel de literatura', 'nobel literatura',
    'premio cervantes', 'premio planeta', 'premio nadal', 'premio princesa de asturias de las letras',
    'premio princesa de asturias letras', 'premio nacional de narrativa',
    'premio nacional de poesía', 'premio nacional de poesia',
    'premio biblioteca breve', 'premio alfaguara',
    'booker prize', 'pulitzer', 'reina sofía de poesía', 'reina sofia de poesia',
    // Adaptaciones (libro → cine/TV)
    'basado en la novela', 'basada en la novela', 'basado en el libro', 'basada en el libro',
    'adaptación de la novela', 'adaptacion de la novela', 'adaptación del libro', 'adaptacion del libro',
    'adapta la novela', 'adapta el libro',
];

// Si el título contiene una palabra de esta lista, descartamos
// (incluso si tiene una keyword literaria por casualidad).
const NEGATIVE_KEYWORDS = [
    // Música
    'disco', 'discos', 'álbum', 'album', 'cantante', 'cantantes', 'cantautor', 'cantautora',
    'concierto', 'conciertos', 'sinfónica', 'sinfonica', 'orquesta', 'banda', 'rock', 'pop',
    'rapero', 'rapera', 'reggaetón', 'reggaeton', 'flamenco', 'jazz', 'músico', 'musico',
    'guitarrista', 'pianista', 'cantar', 'canta', 'gira', 'tour',
    // Cómic / manga (el usuario los excluye)
    'cómic', 'comic', 'cómics', 'comics', 'manga', 'mangas', 'cómic-con', 'comic-con',
    // Toros / tauromaquia
    'torero', 'toreros', 'toros', 'corrida', 'tauromaquia', 'jerez', 'ventas',
    // Pintura / arte plástico
    'pintor', 'pintora', 'pintura', 'cuadro', 'óleo', 'oleo', 'acuarela', 'escultor', 'escultora',
    'escultura', 'museo', 'galería', 'galeria',
    // Cine puro (sin libro como fuente)
    'cineasta', 'cineastas', 'director de cine', 'estreno de la película', 'rodaje',
    'festival de cannes', 'festival de venecia', 'oscar', 'goya',
    'actor', 'actriz', 'actores', 'actrices',
    // Deportes
    'fútbol', 'futbol', 'baloncesto', 'tenis', 'maradona', 'mundial',
    // Otros
    'moda', 'fashion week',
];

const containsNegative = (titulo) => {
    const t = (titulo || '').toLowerCase();
    const tokens = new Set((t).split(/[^\p{L}-]+/u).filter(Boolean));
    return NEGATIVE_KEYWORDS.some(kw => kw.includes(' ') ? t.includes(kw) : tokens.has(kw));
};

// Frases que GARANTIZAN que la noticia es literaria, incluso si menciona cine/serie/director.
// Si el título contiene una de estas, entra SIN aplicar la lista negativa.
const STRONG_LITERARY_PHRASES = [
    'basado en la novela', 'basada en la novela',
    'basado en el libro', 'basada en el libro',
    'basado en una novela', 'basada en una novela',
    'basado en un libro', 'basada en un libro',
    'adaptación de la novela', 'adaptacion de la novela',
    'adaptación del libro', 'adaptacion del libro',
    'adaptación literaria', 'adaptacion literaria',
    'adapta la novela', 'adapta el libro',
    'adaptar la novela', 'adaptar el libro',
    'lleva al cine la novela', 'lleva al cine el libro',
    'llevará al cine la novela', 'llevara al cine la novela',
    'llevará al cine el libro', 'llevara al cine el libro',
    'llevada al cine', 'llevado al cine',
    'serie basada en', 'película basada en', 'pelicula basada en',
    'serie basada en la novela', 'película basada en la novela',
    'serie basada en el libro', 'película basada en el libro',
    'novela llevada a la pantalla', 'libro llevado a la pantalla',
];

const hasStrongLiteraryPhrase = (titulo) => {
    const t = (titulo || '').toLowerCase();
    return STRONG_LITERARY_PHRASES.some(p => t.includes(p));
};

// Tokeniza una cadena Unicode en palabras (separa por cualquier no-letra)
const tokenize = (text) => (text || '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);

// Evalúa contra título (estricto) y descripción limpia de patrones del RSS ("Leer", "Leer más", etc.)
const cleanDescription = (desc) => (desc || '')
    .replace(/\bleer\s+m[aá]s\b/gi, '')
    .replace(/\bleer\b\s*$/i, '')
    .trim();

const isLiteraryNews = (item) => {
    const titulo = (item.title || '').toLowerCase();

    // 0) Frase fuerte de adaptación literaria → entra SIEMPRE (override del filtro negativo).
    if (hasStrongLiteraryPhrase(titulo)) return true;

    // 1) Si el título tiene palabras de la lista NEGATIVA, descartamos.
    if (containsNegative(titulo)) return false;

    // 2) Si tiene una keyword literaria, entra.
    const titleTokens = new Set(tokenize(titulo));
    return LITERARY_KEYWORDS.some(kw => {
        if (kw.includes(' ')) return titulo.includes(kw);
        return titleTokens.has(kw);
    });
};

const stripHtml = (html) => {
    if (!html) return '';
    return String(html)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);
};

// Busca imagen en cualquier campo del item del RSS
const extractImageFromRss = (item) => {
    if (item.enclosure?.url && /\.(jpe?g|png|webp|gif)/i.test(item.enclosure.url)) return item.enclosure.url;
    if (item.mediaContent?.$?.url) return item.mediaContent.$.url;
    if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;

    const candidates = [
        item['content:encoded'],
        item.content,
        item.description,
        item.summary,
    ];

    for (const html of candidates) {
        if (!html) continue;
        const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
        if (m && m[1]) return m[1];
    }
    return null;
};

// Fallback: descarga el HTML del artículo y busca og:image
const fetchOgImage = async (url) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BibliotecaPersonal/1.0)' },
        });
        clearTimeout(timeout);
        if (!res.ok) return null;

        // Solo leemos los primeros 50 KB del HTML — basta para encontrar og:image en el <head>
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let html = '';
        let received = 0;
        const MAX_BYTES = 50 * 1024;
        while (received < MAX_BYTES) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.length;
            html += decoder.decode(value, { stream: true });
            if (html.length > MAX_BYTES) break;
        }
        try { reader.cancel(); } catch (e) { /* ignore */ }

        // Busca og:image, twitter:image (en cualquier orden de atributos)
        const patterns = [
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
            /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
        ];
        for (const re of patterns) {
            const m = html.match(re);
            if (m && m[1]) return m[1];
        }
        return null;
    } catch (err) {
        return null;
    }
};

const fetchAndStore = async () => {
    console.log('[news] Fetching feeds...');
    let inserted = 0;
    let imageFromOg = 0;

    for (const feed of FEEDS) {
        try {
            const result = await parser.parseURL(feed.url);
            const items = result.items || [];

            for (const item of items.slice(0, 50)) {
                if (!item.link || !item.title) continue;

                // Filtro: solo noticias relacionadas con libros / literatura
                if (!isLiteraryNews(item)) continue;

                const titulo = String(item.title).trim().slice(0, 500);
                const descripcion = stripHtml(item.contentSnippet || item.summary || item.description || item.content);
                const link = String(item.link).trim().slice(0, 1000);
                let image_url = extractImageFromRss(item);
                const fecha_publicacion = item.isoDate
                    ? new Date(item.isoDate)
                    : (item.pubDate ? new Date(item.pubDate) : new Date());

                if (isNaN(fecha_publicacion.getTime())) continue;

                // Fallback og:image si el RSS no trae imagen
                if (!image_url) {
                    image_url = await fetchOgImage(link);
                    if (image_url) imageFromOg++;
                }

                try {
                    await pool.query(
                        `INSERT IGNORE INTO noticias (titulo, descripcion, link, source, image_url, fecha_publicacion)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [titulo, descripcion, link, feed.source, image_url, fecha_publicacion]
                    );
                    inserted++;
                } catch (e) { /* ignore */ }
            }
        } catch (err) {
            console.error(`[news] Error en ${feed.source}:`, err.message);
        }
    }

    // Backfill: rellena imágenes de noticias antiguas que no la tenían
    try {
        const [missing] = await pool.query(
            `SELECT id, link FROM noticias WHERE image_url IS NULL OR image_url = '' LIMIT 30`
        );
        for (const n of missing) {
            const og = await fetchOgImage(n.link);
            if (og) {
                await pool.query('UPDATE noticias SET image_url = ? WHERE id = ?', [og, n.id]);
                imageFromOg++;
            }
        }
    } catch (e) { /* ignore */ }

    // Limpieza: borrar noticias de hace más de 1 año para no inflar la BD
    try {
        await pool.query('DELETE FROM noticias WHERE fecha_publicacion < DATE_SUB(NOW(), INTERVAL 1 YEAR)');
    } catch (e) { /* ignore */ }

    console.log(`[news] Done. Procesadas: ${inserted}, imágenes vía og: ${imageFromOg}`);
};

let intervalHandle = null;

const startNewsScheduler = () => {
    if (intervalHandle) return;
    fetchAndStore().catch(err => console.error('[news] initial fetch failed', err));
    intervalHandle = setInterval(() => {
        fetchAndStore().catch(err => console.error('[news] scheduled fetch failed', err));
    }, 60 * 60 * 1000);
};

module.exports = { fetchAndStore, startNewsScheduler, isLiteraryNews, LITERARY_KEYWORDS };
