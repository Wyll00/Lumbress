# 🔥 LUMBRES — Resumen del proyecto (snapshot)

> Documento de referencia para retomar el desarrollo sin perder hilo.

---

## 1. Identidad

- **Nombre:** Lumbres — *"Lecturas Sociales"*
- **Versión actual:** v0.15.0 *(2026-06: **en producción** https://lumbress.com — app **Android (APK)** + **PWA** (iPhone/escritorio); estanterías, lector EPUB/PDF con subrayados por colores, **diccionario integrado** (definición inline + palabras aprendidas), **ajustes de lectura** (tamaño/interlineado/tipografía/tema, zoom PDF), **selección táctil en móvil** y **lectura a pantalla completa**, suscripciones Stripe, **verificación de email por código** (Resend), panel de **admin**, limpieza de cuentas sin verificar)*
- **Idiomas UI:** ES (principal) / EN
- **Logo:** llama dorada en círculo sobre negro — `public/logo.png` (512px, login/sidebar) + `public/favicon.png` (48px, pestaña). *(Rebrand 2026-06-10: antes "Códice")*
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
| **Email** | nodemailer (`services/mailer.js`) — aviso de mensaje nuevo; SMTP por `.env`, **OFF si no hay clave** |
| **Pagos** | **Stripe** (suscripciones, Checkout alojado + webhook) — modo TEST |
| **APIs externas** | Open Library (autores/libros), Photon/OSM (direcciones) — gratis, sin API key, vía proxy del backend |
| **Dev** | XAMPP (MySQL en `C:\xampp\mysql\bin\mysqld.exe`), Vite proxy `/api` + `/uploads` → :5001 |

---

## 3. Estructura de carpetas

```
biblioteca-personal/
├── public/logo.png              ← logo de Lumbres (favicon + sidebar/login)
├── index.html                   ← <title>Lumbres</title>
├── vite.config.js               ← proxy /api + /uploads, manualChunks
├── .env                         ← VITE_API_URL (vacío en dev)
├── server/
│   ├── server.js                ← Express + helmet + CORS + scheduler noticias
│   │                              (webhook Stripe montado con body CRUDO antes de express.json)
│   ├── db.js                    ← pool MySQL (host 127.0.0.1, keepAlive)
│   ├── .env                     ← JWT_SECRET, DB_*, ALLOWED_ORIGINS, NODE_ENV, SMTP_*, STRIPE_*
│   ├── middleware/auth.js       ← lee cookie 'token' o header Authorization
│   ├── utils/cookies.js         ← COOKIE_NAME + cookieOptions (httpOnly, sameSite)
│   ├── services/newsFetcher.js  ← RSS + filtros literarios + og:image fallback
│   ├── services/mailer.js       ← nodemailer: aviso "urgente" de mensaje nuevo (a prueba de fallos)
│   ├── scripts/setup_stripe.js  ← crea "Lumbres Premium" (precio mes+año) y configura el Customer Portal
│   ├── middleware/plan.js       ← getPlan/requirePremium + límites por plan (free: 5 libros)
│   ├── routes/                  ← auth, books, categories, users, posts, events, podcasts,
│   │                              news, uploads, anuncios, mensajes, taller, authors,
│   │                              booksearch, geosearch, subscriptions, recommendations,
│   │                              public (estantería pública SIN auth)
│   └── uploads/{audio,covers}/  ← archivos de usuarios (en .gitignore)
└── src/
    ├── main.jsx                 ← Providers: Auth → Notification → Library → Player
    ├── App.jsx                  ← rutas lazy + MiniPlayer global
    ├── config.js                ← API_URL, withAuth, mediaUrl, uploadFile
    ├── context/                 ← AuthContext, LibraryContext, LanguageContext, PlayerContext,
    │                              NotificationContext (badge + título + Web Notifications)
    ├── components/              ← Sidebar, BookCard, BookModal, Calendar, MiniPlayer, NewsFeed,
    │                              OffersFeed, ReadBooksModal, NotesPanel, EventModal,
    │                              AnimatedNumber, ProtectedRoute, Typeahead (genérico),
    │                              AuthorAutocomplete + BookSearchAutocomplete + AddressAutocomplete (wrappers de Typeahead),
    │                              ReadingGoal, Recommendations, Achievements
    ├── pages/                   ← Dashboard, MyLibrary, Statistics, Settings, Community,
    │                              Subscriptions, Podcasts, Login, Register,
    │                              VenderLibro, Chat, TallerNovela, PublicShelf (/u/:username, pública)
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
APP_URL=http://localhost:5173                 # success/cancel de Stripe + enlaces de email

# Email (avisos de mensajes) — opcional; si falta, se omite sin romper
SMTP_HOST=  SMTP_PORT=465  SMTP_SECURE=true
SMTP_USER=  SMTP_PASS=  MAIL_FROM=

# Stripe (suscripciones, claves TEST) — las pone el usuario; precios con scripts/setup_stripe.js
STRIPE_SECRET_KEY=          # sk_test_...
STRIPE_WEBHOOK_SECRET=      # whsec_... (Stripe CLi) — pendiente, no hace falta para el alta vía /sync
STRIPE_PRICE_PREMIUM_MES=   # price_... (4,99 €/mes) — modelo actual Free+Premium
STRIPE_PRICE_PREMIUM_ANO=   # price_... (44,99 €/año)
STRIPE_PRICE_LECTOR=        # price_... (LEGACY: planes antiguos, se tratan como premium)
STRIPE_PRICE_BIBLIOFILO=    # price_... (legacy)
STRIPE_PRICE_COLECCIONISTA= # price_... (legacy)
# Límites de plan (opcionales; defaults en server/middleware/plan.js)
# FREE_MAX_BOOKS=5  FREE_MAX_STORAGE_MB=500  PREMIUM_MAX_STORAGE_GB=20
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

## 5. Base de datos (18 tablas)

| Tabla | Para qué |
|---|---|
| `usuarios` | id, username, email, password (bcrypt), phone, profile_image (base64), reading_hours, podcast_seconds, **reading_goal** (meta anual), **public_shelf** (estantería pública on/off), **plan** (`free`\|`premium`, lo mantienen webhook/sync de Stripe), **plan_status**, **storage_used_bytes**, **is_verified** (insignia), **highlight_labels** (JSON: significado de cada color de subrayado) |
| `libros` | titulo, autor, genero, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, paginas_leidas, numero_paginas, **fecha_inicio**, **fecha_fin**, portada_url, notas (JSON), **created_at** |
| `etiquetas_literarias` | (usuario_id, nombre) categorías personalizadas, máx **4 por libro** |
| `libros_etiquetas` | tabla pivote libro ↔ etiqueta |
| `reading_logs` | (user_id, hours, log_date) histórico para gráfica semanal |
| `calendar_events` | (usuario_id, titulo, fecha, hora) |
| `posts` | (usuario_id, tipo, titulo, contenido, imagen) tipos: general, reseña, recomendacion, reflexion |
| `post_likes` | (post_id, usuario_id) |
| `podcasts` | nombre, autor, descripcion, url_fuente, **audio_url** (ruta `/uploads/audio/`), portada_url, categoria, estado, rating, notas, episodios_total/escuchados |
| `noticias` | titulo, descripcion, link UNIQUE, source, image_url, fecha_publicacion (filtrado literario por keywords) |
| `anuncios` | marketplace de libros: titulo_libro, autor, precio, moneda, estado_libro, descripcion, imagen_url, contacto, telefono, **direccion + codigo_postal + ciudad + provincia + pais**, vendido |
| `mensajes` | (emisor_id, receptor_id, contenido, leido, **anuncio_id**) chat 1-a-1; `anuncio_id` enlaza la conversación a la oferta concreta |
| `taller_novela` | (usuario_id PK, **data JSON**) un único documento por usuario para el Taller |
| `suscripciones` | (usuario_id UNIQUE, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end) — estado de la suscripción Stripe |
| `subrayados` | (usuario_id, libro_id, cfi_range, texto, color, created_at) — subrayados del lector EPUB |
| `estanterias` | (usuario_id, nombre UNIQUE, emoji) — estanterías para organizar libros |
| `estanterias_libros` | tabla pivote estantería ↔ libro (FK CASCADE) |
| `palabras_aprendidas` | (usuario_id, libro_id NULL, palabra, definicion, idioma, created_at) — diccionario: palabras guardadas. UNIQUE (usuario_id, palabra); FK libro `ON DELETE SET NULL` |

---

## 6. Endpoints backend (`/api/*`)

| Path | Métodos | Función |
|---|---|---|
| `/auth` | POST register, POST login, POST logout | Setea cookie httpOnly |
| `/users/me` | GET / PUT / PUT password / PUT reading-hours / PUT podcast-time / **PUT reading-goal** / **PUT public-shelf** | Perfil + horas + meta + estantería |
| `/users/me/reading-stats` | GET | Últimos 7 días |
| `/books` | CRUD | Con JOIN a etiquetas (categorias). Recorta espacios en titulo/autor/genero al guardar |
| `/categories` | CRUD + POST /assign + POST /remove | **Límite 4 categorías/libro** |
| `/posts` | CRUD + POST /:id/like | Feed de Comunidad |
| `/events` | CRUD | Calendario en Estadísticas |
| `/podcasts` | CRUD + PATCH (estado/rating parcial) | Marca "escuchado" al terminar audio |
| `/news` | GET ?period=day\|week\|month\|year, GET /sources, POST /refresh | Solo filtro literario en título |
| `/uploads/:kind` | POST (multer, máx 500MB audio / 10MB cover) + DELETE | kind = audio \| covers |
| `/anuncios` | CRUD + PATCH (vendido) + GET /mios + **GET /:id/contacto** | El GET público OCULTA calle/CP, solo se revelan en /contacto |
| `/mensajes` | GET /conversaciones, GET /no-leidos, GET /:userId (marca leídos + devuelve `anuncio`), POST (acepta `anuncio_id`) | Chat con polling |
| `/taller` | GET / PUT | Upsert del JSON del usuario |
| `/authors` | GET /search?q= | Autocompletar autores (proxy Open Library) |
| `/book-search` | GET /?q= , GET /pages?key= | Buscar libro (Open Library) → título/autor/portada/páginas (+fallback de páginas por ediciones) |
| `/geo-search` | GET /?q= | Autocompletar direcciones (proxy Photon/OSM). **OJO: Photon NO admite `lang=es` (devuelve 400)** |
| `/subscriptions` | POST /checkout `{interval: month\|year}`, POST /sync, POST /portal, GET /me → `{plan, plan_status, storage_used_bytes, subscription}`, **POST /webhook (body crudo)** | Stripe modelo **Free+Premium**: webhook/sync actualizan también `usuarios.plan` |
| `/recommendations` | GET / | "Más libros de tus autores favoritos" (Open Library, descarta los que ya tienes) |
| `/public/shelf/:username` | GET (**SIN auth**) | Estantería pública — solo si `public_shelf=1`; expone solo nombre/avatar/stats/libros (nunca email/teléfono) |
| `/dictionary` | GET /define?word=&lang= , GET /saved , POST /saved , DELETE /saved/:id | Diccionario del lector: **español vía Wikcionario** (`es.wiktionary.org/w/api.php`, parser del extract), **inglés vía dictionaryapi.dev** (con fonética/sinónimos). CRUD de "palabras aprendidas" |
| `/shelves` | GET/POST/PUT/DELETE + add/remove libro | Estanterías |
| `/admin` | GET /stats , GET /users | Solo `is_admin`; métricas + lista de usuarios |
| Estáticos | `/uploads/...` | servidos con `express.static` + CORP cross-origin |

---

## 7. Rutas frontend

| Ruta | Página | Notas |
|---|---|---|
| `/login`, `/register` | Login, Register | Públicas, animación GSAP de caída |
| `/` | Dashboard | Stats animadas, recientes (primeros 4 del array, API ya `created_at DESC`), **🎯 Reto de lectura (ReadingGoal)** + **✨ Recomendado para ti (Recommendations)** |
| `/library` | MyLibrary | Filtros estado + formato + búsqueda + sort. Añadir libro: **título y autor con autocompletado** |
| `/statistics` | Statistics | Recharts, calendar, modal de tabla, agrupación normalizada (trim+minúsculas), **🏅 Logros/insignias (Achievements, calculadas en vivo)** |
| `/podcasts` | Podcasts | Cards compactas (78px banner), bolita minimizada, modal rating al terminar |
| `/community` | Community | Pills: Todo / Reseñas / Recomendaciones / Reflexión / **Noticias** / **Ofertas** + botón dorado "Vende tu libro" |
| `/mensajes` | Chat | Conversaciones + ventana, polling 5s, badge en sidebar, **banner "Sobre el anuncio"** al contactar desde una oferta |
| `/vender` | VenderLibro | Form de venta + "Mis anuncios" con editar. **Autor y dirección con autocompletado** |
| `/taller` | TallerNovela | Sub-nav: Resumen, Personajes, Ubicaciones, Especies, Idiomas, Objetos, Capítulos, Relaciones |
| `/settings` | Settings | Perfil, password (min 8), horas, Notificaciones, **Estantería pública (toggle + enlace para compartir)** |
| `/subscriptions` | Subscriptions | **Modelo Free+Premium** (doc estrategia): Lector 0 € vs Lector+ 4,99 €/mes o 44,99 €/año (toggle mensual/anual), comparativa, plan Autor "próximamente". Checkout → `/sync`. "Gestionar" abre el Customer Portal (configurado por API en setup_stripe.js) |
| `/u/:username` | PublicShelf | **Ruta PÚBLICA (sin login)** — estantería compartible; muestra avatar, nombre, stats y libros. 404 si privada |

---

## 8. Convenciones / reglas seguidas

- **Seguridad**: JWT en cookie httpOnly, **nunca** localStorage. CORS restringido en prod, abierto a localhost en dev. Rate limit 10/15min en `/auth/*`, 300/15min resto. Errores 500 NO devuelven `err.message` al cliente.
- **Categorías por libro**: máximo 4 (validado en frontend + backend).
- **Subidas**: NUNCA base64 a BD. Multer → disco. Solo la ruta `/uploads/...` en BD.
- **`mediaUrl()`** helper en `config.js`: detecta `data:`, `http://`, `/uploads/` y resuelve correctamente (las portadas de Open Library son URLs `https://covers.openlibrary.org/...`).
- **`withAuth()`**: todos los fetch usan `credentials: 'include'`.
- **Vite proxy**: `/api` y `/uploads` → backend (same-site cookies en dev).
- **Estilo**: tema oscuro, glass-panel (`backdrop-filter: blur`), border-radius generoso, animaciones GSAP en entradas. Taller de Novela mantiene su paleta ámbar propia con estilos inline.
- **Privacidad marketplace**: dirección exacta (calle + CP) NO viaja en lista pública, solo vía `GET /anuncios/:id/contacto`.
- **Filtro noticias**: solo título, lista positiva (libro/novela/autor/escritor/premios) + lista negativa (cine puro/música/toros/cómic) + override de frases fuertes para adaptaciones libro→cine.
- **APIs externas a prueba de fallos**: autores/libros/direcciones/email/Stripe — si la fuente falla o no hay clave, devuelven vacío/omiten **sin romper** el flujo principal.
- **Pagos seguros**: Stripe Checkout alojado → la **tarjeta nunca toca la app** (PCI lo gestiona Stripe). Las claves Stripe/SMTP las pone el usuario en `.env`.

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
>
> ⚠️ **Apaga MySQL siempre desde XAMPP (Stop)** antes de cerrar/apagar el PC — los cierres en seco corrompen las tablas Aria del sistema (incidente 2026-05-28; se reparó con `aria_chk --safe-recover --force` desde el datadir + cuarentena de los relay-logs).
>
> ⚠️ **Probar pagos (Stripe):** el antivirus **Kaspersky** rompe la página de Checkout (inyecta scripts `kaspersky-labs.com`; los JS de Stripe fallan con status 499 / "MIME image/png"). **Pausa Kaspersky** o añade `*.stripe.com` a sus direcciones de confianza. No es bug del código.

---

## 10. Funcionalidades implementadas (checklist)

- ✅ Auth completa (register, login, logout, JWT cookies)
- ✅ CRUD libros con categorías, notas, progreso, fechas inicio/fin
- ✅ Estadísticas con gráficos, calendario interactivo, modal detalle
- ✅ Podcasts con reproductor sticky (minimizable a bolita, efecto cierre), uploads a disco, rating al terminar, contador horas
- ✅ Comunidad con posts + likes + imágenes
- ✅ Noticias literarias (5 fuentes RSS, filtro estricto, og:image fallback, "añadir al calendario" con modal)
- ✅ Marketplace de libros con dirección privada + teléfono click-to-call + edición + marcar vendido
- ✅ Chat 1-a-1 entre usuarios con polling + badge no-leídos, **enlazado al anuncio**
- ✅ Taller de Novela (8 secciones, autosave JSON en BD)
- ✅ i18n ES/EN, sidebar con scroll, logo Lumbres
- ✅ **Vista móvil (2026-06-12)**: barra inferior con 4 ítems esenciales + panel "Más" (resto del menú + avatar/idioma/Salir), Taller con pestañas horizontales y secciones apiladas (`useIsMobile` en TallerNovela.jsx), lector adaptado (PDF a ancho de pantalla, panel de subrayados fullscreen). Ojo: estilos inline pisan los `@media` — el footer del sidebar se movió a CSS por eso.
- ✅ **Notificaciones de mensajes**: badge sidebar + contador en título de pestaña + Web Notifications del navegador (`NotificationContext`) + aviso por email (nodemailer, OFF sin clave SMTP)
- ✅ **Autocompletados** (gratis, sin key): autor; título → autorrellena autor/portada/páginas (Open Library); dirección → CP/ciudad/provincia/país (Photon)
- ✅ **Suscripciones con Stripe** (modo TEST): Checkout alojado, `/sync` tras pagar, tabla `suscripciones`, plan activo mostrado en la UI
- ✅ **Modelo Free+Premium con gating** (doc "Estrategia de suscripción"): página de precios Lector/Lector+ (toggle mes/año, comparativa), `usuarios.plan` mantenido por webhook+sync, **límite 5 libros en free** (402 al exceder, alert en UI), **PremiumGate** en Estadísticas y Reto de lectura, Customer Portal configurado por API. La comunidad/marketplace/chat siempre gratis. Cuenta demo free: `freetester@test.local` / `pruebas1234`
- ✅ **Lector EPUB/PDF integrado y VERIFICADO** (2026-06-11): subir archivo en BookModal → botón "Leer" en la tarjeta → `/reader/:bookId` (react-reader para EPUB con TOC y paginación; react-pdf con paginador y flechas del teclado). Cuota por plan al subir (free 500 MB / premium 20 GB) con contador `storage_used_bytes` exacto en subida/reemplazo/borrado. *(El "bug" de la vista en blanco era el navegador del preview sin pintar frames — rAF congelado — no era del código.)* Libros demo en cuenta freetester: id 15 EPUB real, id 16 PDF.
- ✅ **Reto de lectura** (Dashboard): meta anual + progreso (leídos este año = `Read` con `fecha_fin` del año) + ritmo + celebración
- ✅ **Recomendaciones** (Dashboard): "más de tus autores favoritos" vía Open Library, descarta los que ya tienes, botón "Añadir"
- ✅ **Logros/insignias** (Estadísticas): 10 badges calculados en vivo desde libros/perfil (sin BD)
- ✅ **Estantería pública** (opt-in): toggle en Ajustes + ruta pública `/u/:username`; expone solo datos seguros
- ✅ **Refactor**: los 3 autocompletados ahora envuelven un `<Typeahead>` genérico (sin duplicación)
- ✅ **Diccionario integrado en el lector (2026-06-17)**: al seleccionar texto en el EPUB → botón "¿Qué significa?" en la barra de selección; la **definición se muestra inline en esa misma barra** (no modal), con tipo de palabra, fonética (inglés), 🔊 pronunciación (SpeechSynthesis) y "Guardar". Botón "Palabras (N)" en la cabecera con la lista de palabras guardadas (borrables). Backend `routes/dictionary.js`: español vía **Wikcionario** (el parser saca la definición de la línea que sigue a la cabecera numerada `1`/`1 Etiqueta`), inglés vía **dictionaryapi.dev**, fallback "Buscar en inglés →" cuando no hay resultado en español. Tabla `palabras_aprendidas`.
- ✅ **Lectura a pantalla completa (2026-06-17)**: botón en la cabecera del lector (Fullscreen API sobre el contenedor del lector, así barra de selección/diccionario/subrayados siguen funcionando). Se oculta si el navegador no soporta fullscreen (iOS/Safari).
- ✅ **Selección de texto en móvil/táctil (2026-06-18)**: epub.js solo dispara su evento `selected` en `mouseup`, así que en móvil no aparecía la barra de selección (ni diccionario ni subrayados). Añadido detector propio (`selectionchange` con rebote + `touchend`/`mouseup`) sobre el documento del EPUB vía `rendition.hooks.content` + `contents.cfiFromRange`.
- ✅ **Ajustes de lectura (2026-06-18)**: panel "Aa" en la cabecera del lector — **tamaño de letra, interlineado, tipografía** (original/serif/sans) y **tema** (claro/sepia/oscuro) para EPUB (epub.js `themes.register/select/fontSize` + `readerStyles` de react-reader para el fondo del área); **zoom** para PDF. Persistido en `localStorage` (`lumbres-reader-settings`). Componentes `ReaderSettings.jsx` + `readerThemes.js`.

---

## 11. Pendientes / decisiones a futuro

### 🎯 TAREAS PARA LA PRÓXIMA SESIÓN (pedidas por William el 2026-06-12)

1. ✅ **Estanterías — HECHO (2026-06-13)**: tablas `estanterias` (usuario_id, nombre UNIQUE, emoji) + `estanterias_libros` (pivote, FK CASCADE). Ruta `server/routes/shelves.js` (GET/POST/PUT/DELETE + add/remove libro). El listado de libros trae `shelfIds`. UI en Mi Biblioteca: pestañas de filtro (Todas + cada estantería con contador), crear/renombrar/eliminar inline, y botón 📚 por libro que abre `ShelfPicker` (modal con checkboxes + crear al vuelo, 12 emojis). Funciones en LibraryContext: createShelf/renameShelf/deleteShelf/toggleBookInShelf. Verificado en local y prod. **SIN gate Premium aún** (el doc de estrategia las marca Premium — William decide; gatear = `requirePremium` en los endpoints de shelves + ocultar UI si plan!=premium).
2. ✅ **Diccionario integrado en el lector — HECHO (2026-06-17)**: ver checklist §10. Español vía Wikcionario, inglés vía dictionaryapi.dev, definición **inline** en la barra de selección, "Mis palabras" guardadas (tabla `palabras_aprendidas`). *(Nota: `dictionaryapi.dev` NO tiene español — devuelve 404 incluso para "libro"; por eso español va por Wikcionario.)* Además, **lectura a pantalla completa** (botón en la cabecera del lector, Fullscreen API).

- ✅ ~~Notificaciones en navegador~~ · ✅ ~~Chat enlazado al anuncio~~ · ✅ ~~Suscripciones~~ *(hechos esta sesión)*
- 🟡 **Stripe para prod**: webhook con la **Stripe CLI** (`stripe listen` → da `whsec_`) para renovaciones/cancelaciones automáticas. Hoy el alta funciona vía `/sync`; el Customer Portal ya está configurado (setup_stripe.js).
- 🟡 **Fase 2 del doc de estrategia (lo que queda)**: sync de posición contra el backend (hoy localStorage), subrayados en PDF (hoy solo EPUB), catálogo legal (Standard Ebooks/Gutenberg), plan Autor, términos de uso + notice-and-takedown. *(Subrayados EPUB: ✅ hechos 2026-06-11 — tabla `subrayados`, endpoints en books.js `/:id/highlights`, selección → paleta de 5 colores (amber/red/green/blue/purple) → SVG del color elegido, persistente + panel lateral con tarjetas por color. Significado de cada color personalizable por usuario: `usuarios.highlight_labels` JSON + PUT `/users/me/highlight-labels`, editor en el panel (lápiz). Por el doc de estrategia serían Premium: para activar el gate basta `requirePremium` en los endpoints.)*
- 🟡 **Email de mensajes**: reactivar (app-password válida en `SMTP_PASS`) y, en prod, enviar solo si el destinatario lleva rato sin leer/desconectado (anti-spam) en vez de en cada mensaje.
- ✅ ~~Refactor de autocompletados a `<Typeahead>`~~ *(hecho)* — quedan **3 CSS huérfanos** sin importar (`AuthorAutocomplete.css`, `BookSearchAutocomplete.css`, `AddressAutocomplete.css`), borrables.
- 🟡 Rotar password de MySQL (sigue siendo `root` vacío en local)
- ✅ **EN PRODUCCIÓN (2026-06-12): https://lumbress.com** — VPS Hostinger (Ubuntu 24.04, IP 72.60.187.17, KVM1 4GB). Stack: nginx (SPA + proxy /api y /uploads) + pm2 `lumbres-api` (autoarranque) + MariaDB (BD `biblioteca_personal`, user `lumbres`) + Let's Encrypt (auto-renueva, caduca 2026-09-09). Acceso: `ssh -i C:\Users\willi\.ssh\id_ed25519 root@72.60.187.17`; código en `/var/www/lumbres`; password BD en `C:\Users\willi\.lumbres_db_pass` (local) y en el `.env` del VPS. BD limpia con solo el usuario William (premium, email test@gmail.com pendiente de cambiar). **Webhook Stripe de prod creado** (`we_...`, secreto en .env del VPS) — Stripe sigue en modo TEST. Smoke test completo OK (registro/login/libro/checkout por HTTPS). Para actualizar la app: ver `deploy/DESPLIEGUE.md` §Mantenimiento.
- ✅ **App Android (Capacitor 8, 2026-06-13)**: `com.lumbres.app`, proyecto en `android/`, empaqueta el frontend y habla con prod por **token** (`Authorization: Bearer`; `src/config.js` detecta `window.Capacitor` → API=https://lumbress.com + guarda token en localStorage). Backend: login/register devuelven `token`, CORS permite origen `*://localhost`. **APK de prueba (debug) en https://lumbress.com/lumbres.apk** (con icono de la llama). Recompilar/instalar: ver **`deploy/ANDROID.md`**. Pendiente para Play Store: release firmado (keystore), cuenta dev. iOS: requiere Mac (no hecho). **GOTCHA app:** la sesión va por token (no cookie) — NUNCA pisar las cabeceras de `withAuth` (usar `withAuth({...})`, no `{ ...withAuth(), headers }`), o da 401 solo en la app.
- ✅ **Email (Resend) + verificación por código — ACTIVO en prod (2026-06-15)**: envío vía SMTP de Resend desde **no-reply@lumbress.com** (dominio verificado en Resend, DNS en Hostinger). Verificación de email al registrarse (código 6 díg): tablas `usuarios.email_verified/verification_code/verification_expires`, endpoints register/verify-email/resend-code, login bloquea no verificados, pantalla `/verify`. Config SMTP en `server/.env` (no en git). Detalles en memoria del proyecto.
- 🟡 Migrar uploads de disco local a S3/Cloudflare R2 cuando despliegues
- 🟡 Limpiar datos de prueba (mensajes/suscripción de test) y el espacio en `usuarios.username` "Alberto "

---

## 12. "Si retomas esto tras vaciarse el contexto"

1. Lee este resumen primero.
2. Verifica MySQL (`netstat -ano | grep ":3306 "`).
3. Arranca backend (`cd server && npm start`) y frontend (`npm run dev`).
4. Los archivos modificados con más historia:
   - `server/routes/{anuncios,mensajes,podcasts,news,subscriptions,booksearch,geosearch,authors,recommendations,public,users}.js`
   - `server/services/{newsFetcher,mailer}.js` · `server/scripts/setup_stripe.js`
   - `src/pages/{Dashboard,Statistics,Settings,Subscriptions,VenderLibro,Chat,Community,Podcasts,TallerNovela,PublicShelf}.jsx`
   - `src/components/{Typeahead,AuthorAutocomplete,BookSearchAutocomplete,AddressAutocomplete,ReadingGoal,Recommendations,Achievements,Sidebar,BookModal,OffersFeed,MiniPlayer}.jsx`
   - `src/context/{PlayerContext,AuthContext,NotificationContext}.jsx` · `src/App.jsx` · `src/config.js`
5. Las piezas más sutiles: **privacidad de la dirección** (anuncios) y de la **estantería pública** (solo datos seguros), **filtro de noticias**, el **webhook de Stripe** (body crudo, montado antes de `express.json`), y la **normalización al agrupar** (géneros/autores).
```