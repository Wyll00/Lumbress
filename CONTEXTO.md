# 📒 CÓDICE — Resumen del proyecto (snapshot)

> Documento de referencia para retomar el desarrollo sin perder hilo.

---

## 1. Identidad

- **Nombre:** Códice — *"Lecturas Sociales"*
- **Versión actual:** v0.9.1
- **Idiomas UI:** ES (principal) / EN
- **Logo:** `public/logo.png` (círculo dorado sobre negro, *EST · MMXXVI*)
- **Tipografías:** Inter + Fraunces (global), Plus Jakarta Sans + Spectral (Taller de Novela)
- **Paleta tema oscuro:** negro/marrón cálido + acento dorado `#f1c40f` / ámbar `#e0a93b`

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + Vite 7, React Router 7, GSAP, Recharts, lucide-react |
| **Backend** | Node.js + Express, MySQL (mysql2 pool con keepAlive 60s) |
| **Auth** | JWT en **cookies httpOnly** (sin localStorage) |
| **Seguridad** | helmet, CORS restringido (dev acepta localhost), rate-limit, bcrypt 10 rounds |
| **Subidas** | multer → carpeta `server/uploads/{audio,covers}/` (no base64 en BD) |
| **RSS** | rss-parser (servicio `newsFetcher` con cron 60min) |
| **Dev** | XAMPP (MySQL en `C:\xampp\mysql\bin\mysqld.exe`), Vite proxy `/api` + `/uploads` → :5001 |

---

## 3. Estructura de carpetas

```
biblioteca-personal/
├── public/logo.png              ← logo de Códice (favicon + sidebar/login)
├── index.html                   ← <title>Códice</title>
├── vite.config.js               ← proxy /api + /uploads, manualChunks
├── .env                         ← VITE_API_URL (vacío en dev)
├── server/
│   ├── server.js                ← Express + helmet + CORS + scheduler noticias
│   ├── db.js                    ← pool MySQL (host 127.0.0.1, keepAlive)
│   ├── .env                     ← JWT_SECRET, DB_*, ALLOWED_ORIGINS, NODE_ENV
│   ├── middleware/auth.js       ← lee cookie 'token' o header Authorization
│   ├── utils/cookies.js         ← COOKIE_NAME + cookieOptions (httpOnly, sameSite)
│   ├── services/newsFetcher.js  ← RSS + filtros literarios + og:image fallback
│   ├── routes/                  ← auth, books, categories, users, posts, events,
│   │                              podcasts, news, uploads, anuncios, mensajes, taller
│   └── uploads/{audio,covers}/  ← archivos de usuarios (en .gitignore)
└── src/
    ├── main.jsx                 ← Providers: Auth → Library → Player
    ├── App.jsx                  ← rutas lazy + MiniPlayer global
    ├── config.js                ← API_URL, withAuth, mediaUrl, uploadFile
    ├── context/                 ← AuthContext, LibraryContext, LanguageContext, PlayerContext
    ├── components/              ← Sidebar, BookCard, BookModal, Calendar, MiniPlayer, NewsFeed,
    │                              OffersFeed, ReadBooksModal, NotesPanel, EventModal,
    │                              AnimatedNumber, ProtectedRoute
    ├── pages/                   ← Dashboard, MyLibrary, Statistics, Settings, Community,
    │                              Subscriptions, Podcasts, Login, Register,
    │                              VenderLibro, Chat, TallerNovela
    └── i18n/translations.js     ← ES/EN
```

---

## 4. Variables de entorno

### `server/.env`

```env
PORT=5001
NODE_ENV=development
DB_HOST=127.0.0.1     # ojo: NO "localhost" (IPv6 falla con XAMPP)
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # vacío en dev
DB_NAME=biblioteca_personal
JWT_SECRET=<64 bytes hex>     # obligatorio, el server muere si falta
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

### `.env` (frontend)

```env
VITE_API_URL=     # vacío en dev — Vite proxy lo maneja
```

### MySQL `my.ini`

```ini
max_allowed_packet=256M   # antes 1M, no aguantaba imágenes
```

---

## 5. Base de datos (13 tablas)

| Tabla | Para qué |
|---|---|
| `usuarios` | id, username, email, password (bcrypt), phone, profile_image (base64), reading_hours, **podcast_seconds** |
| `libros` | titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, paginas_leidas, numero_paginas, **fecha_inicio**, **fecha_fin**, portada_url, notas (JSON) |
| `etiquetas_literarias` | (usuario_id, nombre) categorías personalizadas, máx **4 por libro** |
| `libros_etiquetas` | tabla pivote libro ↔ etiqueta |
| `reading_logs` | (user_id, hours, log_date) histórico para gráfica semanal |
| `calendar_events` | (usuario_id, titulo, fecha, hora) |
| `posts` | (usuario_id, tipo, titulo, contenido, imagen) tipos: general, reseña, recomendacion, reflexion |
| `post_likes` | (post_id, usuario_id) |
| `podcasts` | nombre, autor, descripcion, url_fuente, **audio_url** (ruta `/uploads/audio/`), portada_url, categoria, estado, rating, notas, episodios_total/escuchados |
| `noticias` | titulo, descripcion, link UNIQUE, source, image_url, fecha_publicacion (filtrado literario por keywords) |
| `anuncios` | marketplace de libros: titulo_libro, autor, precio, moneda, estado_libro, descripcion, imagen_url, contacto, telefono, **direccion + codigo_postal + ciudad + provincia + pais**, vendido |
| `mensajes` | (emisor_id, receptor_id, contenido, leido) chat 1-a-1 |
| `taller_novela` | (usuario_id PK, **data JSON**) un único documento por usuario para el Taller |

---

## 6. Endpoints backend (`/api/*`)

| Path | Métodos | Función |
|---|---|---|
| `/auth` | POST register, POST login, POST logout | Setea cookie httpOnly |
| `/users/me` | GET / PUT / PUT password / PUT reading-hours / PUT podcast-time | Perfil + horas |
| `/users/me/reading-stats` | GET | Últimos 7 días |
| `/books` | CRUD | Con JOIN a etiquetas (categorias) |
| `/categories` | CRUD + POST /assign + POST /remove | **Límite 4 categorías/libro** |
| `/posts` | CRUD + POST /:id/like | Feed de Comunidad |
| `/events` | CRUD | Calendario en Estadísticas |
| `/podcasts` | CRUD + PATCH (estado/rating parcial) | Marca "escuchado" al terminar audio |
| `/news` | GET ?period=day\|week\|month\|year, GET /sources, POST /refresh | Solo filtro literario en título |
| `/uploads/:kind` | POST (multer, máx 500MB audio / 10MB cover) + DELETE | kind = audio \| covers |
| `/anuncios` | CRUD + PATCH (vendido) + GET /mios + **GET /:id/contacto** | El GET público OCULTA calle/CP, solo se revelan en /contacto |
| `/mensajes` | GET /conversaciones, GET /no-leidos, GET /:userId (marca leídos), POST | Chat con polling |
| `/taller` | GET / PUT | Upsert del JSON del usuario |
| Estáticos | `/uploads/...` | servidos con `express.static` + CORP cross-origin |

---

## 7. Rutas frontend

| Ruta | Página | Notas |
|---|---|---|
| `/login`, `/register` | Login, Register | Públicas, animación GSAP de caída |
| `/` | Dashboard | Stats animadas (AnimatedNumber), recent books con hover-preview, click "Total de Libros" → ReadBooksModal |
| `/library` | MyLibrary | Filtros estado + formato + búsqueda + sort |
| `/statistics` | Statistics | Recharts, calendar con highlight de día, modal de tabla |
| `/podcasts` | Podcasts | Cards compactas (78px banner), bolita minimizada, modal rating al terminar |
| `/community` | Community | Pills: Todo / Reseñas / Recomendaciones / Reflexión / **Noticias** / **Ofertas** + botón dorado "Vende tu libro" |
| `/mensajes` | Chat | Conversaciones + ventana, polling 5s, badge en sidebar |
| `/vender` | VenderLibro | Form de venta + "Mis anuncios" con editar |
| `/taller` | TallerNovela | Sub-nav: Resumen, Personajes, Ubicaciones, Especies, Idiomas, Objetos, Capítulos, Relaciones |
| `/settings` | Settings | Perfil, password (min 8), horas |
| `/subscriptions` | Subscriptions | (existente, sin lógica real aún) |

---

## 8. Convenciones / reglas seguidas

- **Seguridad**: JWT en cookie httpOnly, **nunca** localStorage. CORS restringido en prod, abierto a localhost en dev. Rate limit 10/15min en `/auth/*`, 300/15min resto. Errores 500 NO devuelven `err.message` al cliente.
- **Categorías por libro**: máximo 4 (validado en frontend + backend).
- **Subidas**: NUNCA base64 a BD. Multer → disco. Solo la ruta `/uploads/...` en BD.
- **`mediaUrl()`** helper en `config.js`: detecta `data:`, `http://`, `/uploads/` y resuelve correctamente.
- **`withAuth()`**: todos los fetch usan `credentials: 'include'`.
- **Vite proxy**: `/api` y `/uploads` → backend (same-site cookies en dev).
- **Estilo**: tema oscuro, glass-panel (`backdrop-filter: blur`), border-radius generoso, animaciones GSAP en entradas. Taller de Novela mantiene su paleta ámbar propia con estilos inline.
- **Privacidad marketplace**: dirección exacta (calle + CP) NO viaja en lista pública, solo vía `GET /anuncios/:id/contacto`.
- **Filtro noticias**: solo título, lista positiva (libro/novela/autor/escritor/premios) + lista negativa (cine puro/música/toros/cómic) + override de frases fuertes para adaptaciones libro→cine.

---

## 9. Cómo arrancar

```bash
# 1. MySQL (si no está): abrir XAMPP → Start MySQL
# 2. Backend
cd server && npm start          # :5001
# 3. Frontend
npm run dev                     # :5173 (o 5174 si 5173 ocupado)
```

> Si MySQL da `ETIMEDOUT` después de horas idle → conexiones zombie. Reiniciar MySQL desde XAMPP. El pool tiene `keepAlive` + `idleTimeout: 60s` para mitigarlo.

---

## 10. Funcionalidades implementadas (checklist)

- ✅ Auth completa (register, login, logout, JWT cookies)
- ✅ CRUD libros con categorías, notas, progreso, fechas inicio/fin
- ✅ Estadísticas con gráficos, calendario interactivo, modal detalle
- ✅ Podcasts con reproductor sticky (minimizable a bolita, efecto cierre), uploads a disco, rating al terminar, contador horas
- ✅ Comunidad con posts + likes + imágenes
- ✅ Noticias literarias (5 fuentes RSS, filtro estricto, og:image fallback, "añadir al calendario" con modal)
- ✅ Marketplace de libros con dirección privada + teléfono click-to-call + edición + marcar vendido
- ✅ Chat 1-a-1 entre usuarios con polling + badge no-leídos
- ✅ Taller de Novela (8 secciones, autosave JSON en BD)
- ✅ i18n ES/EN, sidebar con scroll, logo Códice

---

## 11. Pendientes / decisiones a futuro

- 🟡 Rotar password de MySQL (sigue siendo `root` vacío en local)
- 🟡 Antes de deploy prod: `NODE_ENV=production`, regenerar `JWT_SECRET`, `ALLOWED_ORIGINS` con dominio real
- 🟡 Migrar uploads de disco local a S3/Cloudflare R2 cuando despliegues
- 🟡 Notificaciones en navegador para nuevos mensajes
- 🟡 Chat enlazado al anuncio concreto del que se habla
- 🟡 Suscripciones (página existe pero sin lógica real)

---

## 12. "Si retomas esto tras vaciarse el contexto"

1. Lee este resumen primero.
2. Verifica MySQL (`netstat -ano | grep ":3306 "`).
3. Arranca backend (`cd server && npm start`) y frontend (`npm run dev`).
4. Los archivos modificados con más historia:
   - `server/routes/{anuncios,mensajes,podcasts,news}.js`
   - `src/pages/{Podcasts,Community,VenderLibro,Chat,TallerNovela}.jsx`
   - `src/components/{MiniPlayer,OffersFeed,Sidebar}.jsx`
   - `src/context/{PlayerContext,AuthContext}.jsx`
   - `src/config.js`
5. La lógica de **privacidad de la dirección** (anuncios) y el **filtro de noticias** son las dos piezas más sutiles — revisar antes de modificarlas.
