#!/usr/bin/env bash
# ============================================================================
# Restaura un backup de la base de datos de Lumbres.
# ⚠️  PELIGRO: SOBRESCRIBE los datos actuales de la BD. Úsalo solo para
# recuperar tras un desastre, y con calma.
#
# Uso:  ./restaurar-db.sh /var/backups/lumbres/lumbres_2026-07-08_0300.sql.gz
#
# Variables opcionales (para probar en local):
#   LUMBRES_ENV -> ruta al .env    ·    MYSQL_BIN -> ruta al ejecutable mysql
# ============================================================================
set -euo pipefail

DUMP="${1:-}"
ENV_FILE="${LUMBRES_ENV:-/var/www/lumbres/server/.env}"
MYSQL="${MYSQL_BIN:-mysql}"

if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
    echo "Uso: $0 <ruta-al-backup.sql.gz>" >&2
    echo "Backups disponibles:" >&2
    ls -1t /var/backups/lumbres/lumbres_*.sql.gz 2>/dev/null | head -10 >&2 || true
    exit 1
fi

readenv() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\''[:space:]]*$//' | tr -d '\r'; }
DB_HOST="$(readenv DB_HOST)"; DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="$(readenv DB_PORT)"; DB_PORT="${DB_PORT:-3306}"
DB_USER="$(readenv DB_USER)"
DB_PASS="$(readenv DB_PASSWORD)"
DB_NAME="$(readenv DB_NAME)"

CNF="$(mktemp)"; chmod 600 "$CNF"; trap 'rm -f "$CNF"' EXIT
printf '[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n' "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASS" > "$CNF"

echo "⚠️  Vas a RESTAURAR:"
echo "      backup: $DUMP"
echo "      sobre la BD: '$DB_NAME'  (host $DB_HOST)"
echo "    Esto SOBRESCRIBE todos los datos actuales de esa base de datos."
read -r -p "Escribe exactamente RESTAURAR para continuar: " ans
if [ "$ans" != "RESTAURAR" ]; then
    echo "Cancelado. No se ha tocado nada."
    exit 1
fi

echo "Restaurando…"
gunzip -c "$DUMP" | "$MYSQL" --defaults-extra-file="$CNF" "$DB_NAME"
echo "✅ Restauración completada sobre '$DB_NAME'."
