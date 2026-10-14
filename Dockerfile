# Lumbres — imagen única: compila el frontend y lo sirve el propio Express
# junto a la API. Pensada para el VPS de Contabo, donde Coolify/Traefik se
# encarga del dominio y del HTTPS, así que aquí no hace falta nginx.

# ── 1. Compilar el frontend ──────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── 2. Imagen final: solo la API + el dist compilado ─────────────────────────
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    SERVE_STATIC=true \
    PORT=5001

# Dependencias del backend (sin las de desarrollo)
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund

COPY server ./server
COPY --from=build /app/dist ./dist

# Carpetas de subidas: el volumen se monta encima en docker-compose
RUN mkdir -p server/uploads/audio server/uploads/covers \
             server/uploads/books server/uploads/catalogo

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/server.js"]
