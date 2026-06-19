const geoip = require('geoip-lite');

// Nombres de país en español a partir del código ISO (Intl, sin dependencias extra)
let regionNames = null;
try { regionNames = new Intl.DisplayNames(['es'], { type: 'region' }); } catch { /* runtime sin Intl */ }

// IP real del cliente. `trust proxy` está activado, así que req.ip ya resuelve X-Forwarded-For.
function clientIp(req) {
    let ip = req.ip || req.socket?.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7); // IPv4 mapeada en IPv6
    return ip;
}

// Devuelve { code, name } a partir de una IP. Local/privada o no encontrada → sin código.
function lookupCountry(ip) {
    if (!ip) return { code: null, name: 'Desconocido' };
    if (ip === '::1' || ip === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) {
        return { code: null, name: 'Local' };
    }
    const geo = geoip.lookup(ip);
    if (!geo || !geo.country) return { code: null, name: 'Desconocido' };
    const name = regionNames ? (regionNames.of(geo.country) || geo.country) : geo.country;
    return { code: geo.country, name };
}

module.exports = { clientIp, lookupCountry };
