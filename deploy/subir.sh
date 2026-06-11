#!/usr/bin/env bash
# Sube la versión local de Lumbres a producción (https://lumbress.com).
# Uso (desde la raíz del repo, en Git Bash):
#   bash deploy/subir.sh          -> código + frontend + reinicio
#   bash deploy/subir.sh --deps   -> además reinstala dependencias del backend
#                                    (necesario solo si cambió server/package.json)
set -euo pipefail

KEY="C:/Users/willi/.ssh/id_ed25519"
HOST=root@72.60.187.17
DIR=/var/www/lumbres

echo "== 1/4 Compilando frontend =="
npm run build

echo "== 2/4 Subiendo código =="
tar czf - --exclude=node_modules --exclude=.git --exclude=dist --exclude=.env \
    --exclude='server/uploads' --exclude='server/node_modules' . \
    | ssh -i "$KEY" -o BatchMode=yes "$HOST" "tar xzf - -C $DIR"

echo "== 3/4 Subiendo frontend compilado =="
tar czf - dist | ssh -i "$KEY" -o BatchMode=yes "$HOST" "tar xzf - -C $DIR"

if [[ "${1:-}" == "--deps" ]]; then
    echo "== Reinstalando dependencias del backend =="
    ssh -i "$KEY" -o BatchMode=yes "$HOST" "cd $DIR/server && npm ci --omit=dev"
fi

echo "== 4/4 Reiniciando backend =="
ssh -i "$KEY" -o BatchMode=yes "$HOST" "pm2 restart lumbres-api --update-env >/dev/null && pm2 ls | grep -o 'lumbres-api.*online' | head -1"

echo "✅ Producción actualizada: https://lumbress.com"
