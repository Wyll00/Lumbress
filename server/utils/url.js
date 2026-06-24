// Validación de URLs que vienen del usuario. Defensa contra XSS por esquemas
// peligrosos (javascript:, data:text/html, vbscript:...) cuando una URL se
// renderiza luego en un <a href>. Centralizado aquí para auditarlo en un solo sitio.

// Solo admite http(s); añade https:// si falta el protocolo. Devuelve null si no es válida.
function safeHttpUrl(raw, max = 500) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    try {
        const u = new URL(withProto);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return withProto.slice(0, max);
    } catch {
        return null;
    }
}

// Para imágenes/medios: admite rutas internas /uploads/... o URLs http(s). Null si no.
function safeMediaUrl(raw, max = 500) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (s.startsWith('/uploads/')) return s.slice(0, max);
    if (/^https?:\/\//i.test(s)) {
        try { new URL(s); return s.slice(0, max); } catch { return null; }
    }
    return null;
}

module.exports = { safeHttpUrl, safeMediaUrl };
