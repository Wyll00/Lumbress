# Biblioteca Personal

Aplicación de biblioteca personal: catálogo de libros, estadísticas de lectura, comunidad y calendario.

- **Frontend:** React 19 + Vite
- **Backend:** Node.js + Express + MySQL
- **Auth:** JWT

## Requisitos

- Node.js 18+
- MySQL 8+

## Configuración

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# Edita server/.env con tus credenciales reales de BD y un JWT_SECRET seguro
# Genera un secreto fuerte con:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
npm start
```

Variables requeridas en `server/.env`:

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del backend (default 5001) |
| `NODE_ENV` | `development` o `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión MySQL |
| `JWT_SECRET` | **Obligatorio.** 64 bytes hex aleatorios |
| `JWT_EXPIRES_IN` | Vida del token (ej. `7d`) |
| `ALLOWED_ORIGINS` | Lista separada por coma de orígenes CORS permitidos |

### 2. Frontend

```bash
npm install
cp .env.example .env
# Edita .env con la URL del backend (VITE_API_URL)
npm run dev
```

## Build de producción

```bash
npm run build      # genera /dist
cd server && npm start
```

## Despliegue

- **Frontend** (Vercel/Netlify/Cloudflare Pages): build con `npm run build`, sirve `dist/`. Configura `VITE_API_URL` en las variables del proveedor.
- **Backend** (Railway/Render/Fly.io): configura todas las variables de `server/.env` en el panel del proveedor. Asegúrate de que `NODE_ENV=production` y de añadir tu dominio de frontend a `ALLOWED_ORIGINS`.
- **Base de datos:** PlanetScale, Railway MySQL, AWS RDS, etc.

## Scripts auxiliares

Las utilidades de migración y verificación están en `scripts/` (raíz) y `server/scripts/`. **No se ejecutan en producción.**

## Seguridad

- Las contraseñas se hashean con bcrypt (10 rounds).
- Rate limiting en `/api/auth/*` (10 req / 15 min) y resto de la API (300 req / 15 min).
- Helmet aplica headers de seguridad.
- CORS restringido a la lista `ALLOWED_ORIGINS`.
- Nunca commitees `.env` — está en `.gitignore`.
