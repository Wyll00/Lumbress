# Lumbres en el VPS de Contabo

Sustituye al VPS de Hostinger (`72.60.187.17`), que se cayo del todo en
octubre de 2026 y se dio por perdido junto con su base de datos.

## En que se diferencia del montaje anterior

| | Hostinger (antiguo) | Contabo (actual) |
|---|---|---|
| Servidor web | nginx instalado en el host | **Traefik** (de Coolify), por etiquetas |
| App | pm2 sobre el host | **contenedor Docker** |
| Frontend | lo servia nginx | lo sirve el propio Express (`SERVE_STATIC=true`) |
| Base de datos | MariaDB en el host | contenedor `lumbres-db` |
| Subidas | carpeta del host | volumen `lumbres-uploads` |
| Despliegue | `deploy/subir.sh` | `docker compose up -d --build` |

Ese servidor tiene **mas aplicaciones tuyas**, y Traefik es dueno de los
puertos 80 y 443. Por eso este compose **no publica ningun puerto en el host**:
el enrutado va por etiquetas, igual que el resto de tus apps.

## Puesta en marcha

```bash
ssh astro-vps
cd /opt/lumbres
cp deploy/.env.contabo.example .env   # y rellenar
docker compose -f deploy/docker-compose.contabo.yml --env-file .env up -d --build
```

La primera vez, MariaDB crea la base y ejecuta `deploy/esquema/01-esquema.sql`
(22 tablas, sin datos). Ese script **solo corre con la base vacia**: si luego
cambia el esquema, hay que aplicar la migracion a mano.

## Actualizar

```bash
cd /opt/lumbres && git pull       # o volver a copiar el codigo
docker compose -f deploy/docker-compose.contabo.yml --env-file .env up -d --build
```

## Cambiar el dominio a lumbress.com

1. En el DNS del dominio, apuntar el registro A a **5.189.177.240**.
2. Poner `DOMINIO=lumbress.com` en el `.env`.
3. Levantar de nuevo: Traefik pide el certificado solo.

## Copias de seguridad

Lumbres **no tiene un sistema de copias propio**: entra en el del servidor, que
respalda todas las apps de Contabo cada noche.

- **Que**: `/usr/local/sbin/backup-servidor.sh`, lanzado por `backup-servidor.timer`
  (systemd, no cron) hacia las 03:30.
- **Que copia de Lumbres**: el volumen de subidas (`deploy_lumbres-uploads`),
  `/opt/lumbres` entero (incluido el `.env`) y la base de datos.
- **Donde**: primero en `/var/backups/servidor/<fecha>` (en el propio VPS, 7 dias)
  y despues **fuera, en Cloudflare R2**, cifrado con restic (bucket
  `wyll-copias-servidor`, 7 dias).

### La base de datos

El script copiaba los volumenes de MySQL/MariaDB **en caliente**, como archivos:
un tar del directorio de datos mientras la base escribe, que puede salir a medias.
El 2026-10-16 se anadio el paso **3b**: un volcado logico consistente
(`--single-transaction`) de **todas** las bases MySQL/MariaDB del servidor
(Lumbres, asistente y cobama), comprobando que el volcado termina en
`Dump completed`. Se probo restaurandolo en una base desechable: correcto.

En la copia aparece como `mysql-lumbres-db.sql.gz`.

### ⚠️ La contrasena de restic

Las copias de R2 estan cifradas con `RESTIC_PASSWORD`, que vive en
`/root/.restic-copias.env` **del propio servidor**. Si se pierde el servidor y no
hay copia de esa contrasena en otro sitio, **las copias de R2 no se pueden
descifrar**: seria repetir lo de Hostinger. Tiene que estar tambien en un gestor
de contrasenas.

### Restaurar la base de datos de Lumbres desde R2

```bash
ssh astro-vps
set -a; . /root/.restic-copias.env; set +a
export AWS_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY
export RESTIC_REPOSITORY="s3:https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}"
restic snapshots                       # elegir una
restic restore latest --target /tmp/rest --include '*mysql-lumbres-db.sql.gz'
zcat /tmp/rest/var/backups/servidor/*/mysql-lumbres-db.sql.gz   | docker exec -i lumbres-db sh -c 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" mariadb -uroot'
```
