// IP real de quien visita, detras de Cloudflare y/o Traefik.
//
// Cadena posible:  visitante -> [Cloudflare] -> Traefik -> app
//
// Con `trust proxy: 1`, Express confia en un salto (Traefik), asi que req.ip es
// la IP que llego a Traefik. Si la nube de Cloudflare esta en NARANJA, esa IP
// es de Cloudflare, no del visitante: todo el trafico parecia venir de Estados
// Unidos y todos los usuarios compartian el limite de intentos de login.
//
// Solucion (la que recomienda Cloudflare): si la peticion llega DESDE una IP de
// Cloudflare, la IP real esta en la cabecera CF-Connecting-IP.
//
// Solo se hace caso a esa cabecera si de verdad viene de Cloudflare. Si alguien
// ataca el servidor directamente y se inventa un CF-Connecting-IP, su IP no es
// de Cloudflare, se ignora la cabecera y se usa la suya. No se puede falsear.
//
// Funciona igual con la nube en gris (va directo y no hay nada que corregir) o
// en naranja.

const proxyaddr = require('proxy-addr');

// Rangos oficiales: https://www.cloudflare.com/ips-v4/ y /ips-v6/
// Descargados el 2026-10-16. Cambian muy rara vez; si Cloudflare anade rangos,
// actualizar esta lista.
const CLOUDFLARE = [
    '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
    '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
    '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
    '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
    '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
    '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

const esDeCloudflare = proxyaddr.compile(CLOUDFLARE);

function quitarMapeoIPv4(ip) {
    return ip && ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function esCloudflare(ip) {
    const limpia = quitarMapeoIPv4(ip);
    if (!limpia) return false;
    try { return esDeCloudflare(limpia, 0); } catch { return false; }
}

// Middleware: corrige req.ip para TODO lo que viene detras (registro de
// trafico, limitador de intentos, etc.), que ya leen req.ip.
function realClientIp(req, res, next) {
    const cf = req.headers['cf-connecting-ip'];
    if (cf && esCloudflare(req.ip)) {
        Object.defineProperty(req, 'ip', { value: String(cf).trim(), configurable: true });
    }
    next();
}

module.exports = { realClientIp, esCloudflare, CLOUDFLARE };
