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

Lo que se perdio con Hostinger fue precisamente que las copias vivian dentro
del mismo servidor. Conviene sacarlas fuera:

```bash
docker exec lumbres-db mariadb-dump -ulumbres -p"$DB_PASSWORD" biblioteca_personal | gzip > copia.sql.gz
```
