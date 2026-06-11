# 🚀 Despliegue de Lumbres en el VPS (Hostinger)

> Runbook para la puesta en producción. Preparado el 2026-06-11; el build de
> producción (`npm run build`) está verificado y compila limpio.

---

## Lo que hace falta ANTES de empezar (lo da William)

- [ ] **IP del VPS** (panel Hostinger → VPS)
- [ ] **Usuario SSH** (normalmente `root`)
- [ ] **Ruta de la clave SSH privada en el PC** (ej. `C:\Users\willi\.ssh\id_rsa`) — la clave pública debe estar añadida al VPS desde el panel de Hostinger. *Nunca pegar la clave en el chat.*
- [ ] **Dominio** y **registro DNS A** apuntando a la IP del VPS (Hostinger → Dominios → DNS). Sin DNS propagado no se puede emitir el certificado HTTPS.
- [ ] Decisión: **¿copiar la BD local (datos de prueba) o empezar limpia?**

## Orden de ejecución (lo hace Claude por SSH)

1. **Aprovisionar el VPS** — subir y ejecutar `lumbres-setup.sh`:
   ```bash
   DB_PASS='<contraseña-fuerte-generada>' bash lumbres-setup.sh
   ```
   Instala nginx, MariaDB, Node 22, pm2, certbot; configura firewall (22/80/443) y crea la BD `biblioteca_personal` con usuario `lumbres`.

2. **Subir el código** desde el PC (excluyendo node_modules, .env, uploads):
   ```bash
   rsync -az --delete \
     --exclude node_modules --exclude .env --exclude dist \
     --exclude 'server/uploads/*' --exclude .git \
     ./ root@IP:/var/www/lumbres/
   ```

3. **Backend**: en el VPS `cd /var/www/lumbres/server && npm ci --omit=dev`.
   Crear `server/.env` desde `deploy/env.production.example` (JWT_SECRET nuevo, DB_PASS, dominio).

4. **Base de datos**:
   - Con datos: en el PC `mysqldump -u root biblioteca_personal > lumbres.sql` (XAMPP), subir e importar: `mysql -u lumbres -p biblioteca_personal < lumbres.sql`.
   - Limpia: exportar **solo esquema** (`mysqldump --no-data`) e importar igual.

5. **Frontend**: en el PC `npm run build` y `rsync -az dist/ root@IP:/var/www/lumbres/dist/`
   (o compilar en el VPS si tiene RAM de sobra: `npm ci && npm run build`).

6. **nginx**: copiar `nginx-lumbres.conf` (con el dominio real) a `/etc/nginx/sites-available/lumbres`, enlazar, `nginx -t`, reload. Luego **HTTPS**: `certbot --nginx -d DOMINIO -d www.DOMINIO` (renovación automática incluida).

7. **Arrancar**: `cd /var/www/lumbres/server && pm2 start ecosystem.config.js && pm2 save && pm2 startup`.

8. **Stripe webhook de prod**: crear endpoint `https://DOMINIO/api/subscriptions/webhook` (eventos: `checkout.session.completed`, `customer.subscription.*`) y poner su `whsec_` en `.env` → `pm2 restart lumbres-api`.

9. **Smoke test**: registro de usuario, login, crear libro, subir EPUB, leerlo, subrayar, checkout test de Stripe (tarjeta `4242…`).

## Pendientes del lanzamiento "de verdad" (no bloquean el deploy)

- Claves **live** de Stripe + producto/precios en modo live (re-ejecutar `setup_stripe.js` con la clave live) + webhook live.
- SMTP real (contraseña de aplicación de Gmail) para los avisos por email.
- Backups: cron diario de `mysqldump` + copia de `server/uploads/` fuera del VPS.
- Términos de uso + aviso de retirada (notice-and-takedown) — pendiente de la fase 2.

## Mantenimiento rápido

| Qué | Comando (en el VPS) |
|---|---|
| Logs del backend | `pm2 logs lumbres-api` |
| Reiniciar backend | `pm2 restart lumbres-api` |
| Actualizar la app | rsync del código + `npm ci` si cambió package.json + rebuild del frontend + `pm2 restart` |
| Estado de nginx/certificado | `systemctl status nginx` · `certbot renew --dry-run` |
