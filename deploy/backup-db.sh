#!/usr/bin/env bash
# ============================================================================
# Copia de seguridad de la base de datos de Lumbres.
# Hace un mysqldump comprimido, verifica que no esté corrupto y rota los
# backups antiguos. Pensado para correr por cron en el VPS cada noche.
#
# Uso en el VPS (tras instalar, ver deploy/README-backups.md):
#   /var/www/lumbres/deploy/backup-db.sh
#
# Se puede probar en local sobreescribiendo estas variables de entorno:
#   LUMBRES_ENV        -> ruta al .env del backend (de donde saca las credenciales)
#   LUMBRES_BACKUP_DIR -> carpeta donde guardar los .sql.gz
#   MYSQLDUMP          -> ruta al ejecutable mysqldump (p. ej. el de XAMPP)
#   RETENTION_DAYS     -> días de backups a conservar (por defecto 7)
# ============================================================================
set -euo pipefail

ENV_FILE="${LUMBRES_ENV:-/var/www/lumbres/server/.env}"
BACKUP_DIR="${LUMBRES_BACKUP_DIR:-/var/backups/lumbres}"
MYSQLDUMP="${MYSQLDUMP:-mysqldump}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

if [ ! -f "$ENV_FILE" ]; then
    echo "[backup] ERROR: no encuentro el .env en $ENV_FILE" >&2
    exit 1
fi

# Lee las credenciales del .env del backend (una sola fuente de la verdad).
readenv() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\''[:space:]]*$//' | tr -d '\r'; }
DB_HOST="$(readenv DB_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(readenv DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_USER="$(readenv DB_USER)"
DB_PASS="$(readenv DB_PASSWORD)"
DB_NAME="$(readenv DB_NAME)"

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "[backup] ERROR: faltan DB_USER o DB_NAME en $ENV_FILE" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y-%m-%d_%H%M)"
OUT="$BACKUP_DIR/lumbres_${STAMP}.sql.gz"

# Fichero de credenciales temporal: así la contraseña NO aparece en la lista
# de procesos (ps), a diferencia de pasarla por --password en la línea.
CNF="$(mktemp)"
chmod 600 "$CNF"
trap 'rm -f "$CNF"' EXIT
cat > "$CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USER
password=$DB_PASS
EOF

# --single-transaction: dump consistente sin bloquear (InnoDB).
# --routines --triggers: incluye procedimientos y triggers si los hubiera.
"$MYSQLDUMP" --defaults-extra-file="$CNF" --single-transaction --quick --routines --triggers "$DB_NAME" | gzip > "$OUT"

# Verifica que el backup no está vacío y que el gzip es íntegro.
if [ ! -s "$OUT" ] || ! gzip -t "$OUT" 2>/dev/null; then
    echo "[backup] ERROR: el dump salió vacío o corrupto ($OUT). Lo borro." >&2
    rm -f "$OUT"
    exit 1
fi

# Rotación: borra los backups de más de RETENTION_DAYS días.
find "$BACKUP_DIR" -maxdepth 1 -name 'lumbres_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true

SIZE="$(du -h "$OUT" | cut -f1)"
COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name 'lumbres_*.sql.gz' | wc -l | tr -d ' ')"
echo "[backup] $(date '+%Y-%m-%d %H:%M') OK -> $OUT ($SIZE). Copias guardadas: $COUNT."
