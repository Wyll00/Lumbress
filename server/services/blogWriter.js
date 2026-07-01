// Generación automática de artículos del blog con Claude (API de Anthropic).
// Crea BORRADORES (estado='borrador', auto_generado=1) para que el admin los revise.
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');

const MODEL = process.env.BLOG_AI_MODEL || 'claude-opus-4-8';

// Esquema de salida estructurada: garantiza un JSON válido con estos campos.
const SCHEMA = {
    type: 'object',
    properties: {
        titulo: { type: 'string' },
        resumen: { type: 'string' },
        categoria: { type: 'string' },
        contenido: { type: 'string' },
    },
    required: ['titulo', 'resumen', 'categoria', 'contenido'],
    additionalProperties: false,
};

const SYSTEM = `Eres el redactor editorial del blog de Lumbres, una app social de lectura en español ("Lecturas Sociales"). Escribes artículos cálidos, cercanos y útiles para una comunidad de personas que aman leer.

Reglas de estilo:
- Español de España, tono cercano pero cuidado; nada de relleno ni clichés de IA.
- Artículo de entre 500 y 800 palabras, bien estructurado, fácil de leer en el móvil.
- El campo "contenido" es TEXTO PLANO: separa los párrafos con una línea en blanco. NADA de Markdown, ni #, ni **negritas**, ni guiones de lista; si necesitas una lista, escribe frases naturales.
- "resumen": una o dos frases que enganchen (se muestra en el listado).
- "categoria": una sola palabra o expresión corta (p. ej. "Consejos", "Recomendaciones", "Hábitos de lectura").
- No inventes datos concretos dudosos (cifras, fechas, citas atribuidas) que no puedas justificar; si das ejemplos de libros, usa obras conocidas o de dominio público.`;

// Ideas/pilares de contenido para variar los temas
const PILARES = [
    'consejos prácticos para leer más y mejor',
    'cómo elegir tu próximo libro',
    'crear y mantener el hábito de la lectura',
    'recomendaciones de clásicos de dominio público para empezar',
    'beneficios de leer (memoria, calma, empatía...)',
    'cómo organizar tu biblioteca y tus lecturas',
    'la lectura en comunidad: clubes, reseñas y recomendaciones',
    'lecturas por estación o por estado de ánimo',
    'cómo escribir una buena reseña',
    'apoyar a autores noveles',
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Genera un borrador y lo inserta en la tabla blog. Devuelve { id, titulo }.
async function generateDraft() {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('Falta ANTHROPIC_API_KEY en el .env del servidor.');
    }

    // Autor: un administrador (los artículos cuelgan de su cuenta)
    const [admins] = await pool.query('SELECT id FROM usuarios WHERE is_admin = 1 ORDER BY id ASC LIMIT 1');
    if (!admins.length) throw new Error('No hay ningún administrador al que asignar el artículo.');
    const adminId = admins[0].id;

    // Estilo: artículos publicados recientes como ejemplo
    const [refs] = await pool.query(
        "SELECT titulo, contenido FROM blog WHERE estado = 'publicado' ORDER BY created_at DESC LIMIT 2"
    );
    // Evitar repetir temas: títulos recientes
    const [recent] = await pool.query('SELECT titulo FROM blog ORDER BY created_at DESC LIMIT 15');

    const estilo = refs.length
        ? refs.map((r, i) => `EJEMPLO ${i + 1} (imita este estilo y tono):\nTítulo: ${r.titulo}\n${String(r.contenido).slice(0, 1500)}`).join('\n\n---\n\n')
        : 'Aún no hay artículos previos; crea el estilo de la casa: cercano, claro y con cariño por los libros.';
    const evitar = recent.length ? recent.map((r) => `- ${r.titulo}`).join('\n') : '(ninguno todavía)';

    const userPrompt = `Escribe un artículo nuevo para el blog de Lumbres sobre: ${pickRandom(PILARES)}.
Elige un ángulo fresco y concreto; NO repitas ni te solapes con estos títulos ya publicados:
${evitar}

${estilo}

Devuelve el artículo en el formato pedido (titulo, resumen, categoria, contenido).`;

    const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
    let resp;
    try {
        resp = await client.messages.create({
            model: MODEL,
            max_tokens: 12000,
            thinking: { type: 'adaptive' },
            system: SYSTEM,
            output_config: { format: { type: 'json_schema', schema: SCHEMA } },
            messages: [{ role: 'user', content: userPrompt }],
        });
    } catch (e) {
        const msg = (e && e.message) || '';
        if (/credit balance/i.test(msg)) {
            throw new Error('Tu cuenta de Anthropic no tiene saldo. Añade crédito en console.anthropic.com → Plans & Billing y vuelve a intentarlo.');
        }
        if (e?.status === 401 || /authentication|x-api-key|invalid.*api.*key/i.test(msg)) {
            throw new Error('La API key de Anthropic no es válida. Revísala en server/.env (debe empezar por sk-ant-).');
        }
        if (e?.status === 429 || /rate_limit/i.test(msg)) {
            throw new Error('Demasiadas peticiones a Anthropic ahora mismo. Espera un momento y reintenta.');
        }
        throw new Error('Error con la API de Anthropic: ' + msg.slice(0, 200));
    }

    const textBlock = (resp.content || []).find((b) => b.type === 'text');
    if (!textBlock) throw new Error('La IA no devolvió contenido.');
    const data = JSON.parse(textBlock.text);

    const titulo = String(data.titulo || '').trim().slice(0, 255);
    const resumen = String(data.resumen || '').trim().slice(0, 400) || null;
    const categoria = String(data.categoria || '').trim().slice(0, 80) || null;
    const contenido = String(data.contenido || '').trim().slice(0, 50000);
    if (!titulo || !contenido) throw new Error('La IA devolvió un artículo incompleto.');

    const [r] = await pool.query(
        `INSERT INTO blog (usuario_id, titulo, resumen, contenido, categoria, estado, auto_generado)
         VALUES (?, ?, ?, ?, ?, 'borrador', 1)`,
        [adminId, titulo, resumen, contenido, categoria]
    );
    console.log(`[blog] Borrador IA creado (#${r.insertId}): ${titulo}`);
    return { id: r.insertId, titulo };
}

// ── Programador: 2 veces por semana (martes y viernes, a partir de las 9:00) ──
const DIAS_PUBLICACION = [2, 5]; // 0=domingo … 2=martes, 5=viernes
const HORA_MINIMA = 9;

async function yaHayBorradorHoy() {
    const [[{ n }]] = await pool.query(
        'SELECT COUNT(*) n FROM blog WHERE auto_generado = 1 AND DATE(created_at) = CURDATE()'
    );
    return n > 0;
}

async function tick() {
    try {
        const now = new Date();
        if (!DIAS_PUBLICACION.includes(now.getDay())) return;
        if (now.getHours() < HORA_MINIMA) return;
        if (await yaHayBorradorHoy()) return;
        console.log('[blog] Generando borrador automático…');
        await generateDraft();
    } catch (e) {
        console.error('[blog] Error en la generación automática:', e.message);
    }
}

function startBlogScheduler() {
    if (process.env.BLOG_AUTOPOST_ENABLED !== 'true') {
        console.log('[blog] Autopublicación desactivada (pon BLOG_AUTOPOST_ENABLED=true para activarla).');
        return;
    }
    if (!process.env.ANTHROPIC_API_KEY) {
        console.log('[blog] Autopublicación activada pero falta ANTHROPIC_API_KEY: no se generará nada.');
        return;
    }
    console.log('[blog] Autopublicación activada (martes y viernes).');
    setTimeout(tick, 60 * 1000);            // primera comprobación al minuto de arrancar
    setInterval(tick, 60 * 60 * 1000);      // y cada hora
}

module.exports = { generateDraft, startBlogScheduler };
