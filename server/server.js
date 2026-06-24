require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pool = require('./db');
const { logTraffic } = require('./middleware/traffic');
const { logError } = require('./services/errorLog');

const app = express();
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET is not defined. Set it in your environment before starting the server.');
    process.exit(1);
}

app.set('trust proxy', 1);

// Security headers — permitimos que /uploads se sirva cross-origin (imágenes/audio)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Archivos subidos (audio de podcasts, portadas, libros EPUB/PDF) servidos estáticamente.
// ACAO necesario: el lector (epub.js/PDF.js) los descarga con fetch desde el frontend (:5173).
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Access-Control-Allow-Origin', '*'),
}));

// CORS — restrict to known origins.
// En desarrollo, acepta cualquier localhost (Vite puede cambiar de puerto).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

const isLocalhost = (origin) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
// Origen de la app nativa (Capacitor/Ionic): capacitor://localhost, https://localhost, etc.
const isNativeApp = (origin) => /^(capacitor|ionic|https?):\/\/localhost$/.test(origin);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (isNativeApp(origin)) return callback(null, true);
        if (!isProduction && isLocalhost(origin)) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true
}));

// Webhook de Stripe: necesita el body CRUDO, por eso se monta ANTES de express.json()
const subscriptionsModule = require('./routes/subscriptions');
app.post('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), subscriptionsModule.webhook);

app.use(express.json({ limit: '100mb' }));
app.use(cookieParser());

// Analítica de tráfico: registra cada petición a la API (país + IP) para el panel de admin
app.use(logTraffic);

// Request logging — disabled in production by default
if (!isProduction) {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Rate limiting — strict on auth endpoints, looser on the rest
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
});

// Routes
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const categoriesRoutes = require('./routes/categories');
const usersRoutes = require('./routes/users');
const postsRoutes = require('./routes/posts');
const eventsRoutes = require('./routes/events');
const podcastsRoutes = require('./routes/podcasts');
const newsRoutes = require('./routes/news');
const uploadsRoutes = require('./routes/uploads');
const anunciosRoutes = require('./routes/anuncios');
const mensajesRoutes = require('./routes/mensajes');
const tallerRoutes = require('./routes/taller');
const authorsRoutes = require('./routes/authors');
const bookSearchRoutes = require('./routes/booksearch');
const geoSearchRoutes = require('./routes/geosearch');
const recommendationsRoutes = require('./routes/recommendations');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const shelvesRoutes = require('./routes/shelves');
const dictionaryRoutes = require('./routes/dictionary');
const catalogRoutes = require('./routes/catalog');
const trackRoutes = require('./routes/track');
const novedadesRoutes = require('./routes/novedades');
const { startNewsScheduler } = require('./services/newsFetcher');
const { startCleanupScheduler } = require('./services/cleanup');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/books', apiLimiter, booksRoutes);
app.use('/api/categories', apiLimiter, categoriesRoutes);
app.use('/api/users', apiLimiter, usersRoutes);
app.use('/api/posts', apiLimiter, postsRoutes);
app.use('/api/events', apiLimiter, eventsRoutes);
app.use('/api/podcasts', apiLimiter, podcastsRoutes);
app.use('/api/news', apiLimiter, newsRoutes);
app.use('/api/uploads', apiLimiter, uploadsRoutes);
app.use('/api/anuncios', apiLimiter, anunciosRoutes);
app.use('/api/mensajes', apiLimiter, mensajesRoutes);
app.use('/api/taller', apiLimiter, tallerRoutes);
app.use('/api/authors', apiLimiter, authorsRoutes);
app.use('/api/book-search', apiLimiter, bookSearchRoutes);
app.use('/api/geo-search', apiLimiter, geoSearchRoutes);
app.use('/api/recommendations', apiLimiter, recommendationsRoutes);
app.use('/api/public', apiLimiter, publicRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/shelves', apiLimiter, shelvesRoutes);
app.use('/api/dictionary', apiLimiter, dictionaryRoutes);
app.use('/api/catalog', apiLimiter, catalogRoutes);
app.use('/api/track', apiLimiter, trackRoutes);
app.use('/api/novedades', apiLimiter, novedadesRoutes);
app.use('/api/subscriptions', apiLimiter, subscriptionsModule.router);

// Arranca el scheduler de noticias (fetch inicial + cada 60 min)
startNewsScheduler();

// Limpieza periódica de cuentas sin verificar (registros abandonados/falsos)
startCleanupScheduler();

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Generic error handler — never leak stack traces to the client
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    // Registramos el error para el panel de admin (fire-and-forget)
    logError(err, { ruta: (req.originalUrl || req.url || '').split('?')[0], metodo: req.method, status: 500, usuarioId: req.user?.id });
    if (res.headersSent) return next(err);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// Database Connection
pool.getConnection()
    .then(conn => {
        console.log('Conectado a la base de datos MySQL');
        conn.release();
    })
    .catch(err => {
        console.error('Error conectando a MySQL:', err.message);
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});

// Errores no capturados: los registramos para el panel antes de que pm2 reinicie.
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    logError(reason instanceof Error ? reason : new Error(String(reason)), { ruta: 'unhandledRejection', metodo: '-', status: 0 });
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logError(err, { ruta: 'uncaughtException', metodo: '-', status: 0 });
    // Dar un margen para registrar y salir; pm2 reinicia el proceso.
    setTimeout(() => process.exit(1), 1500);
});
