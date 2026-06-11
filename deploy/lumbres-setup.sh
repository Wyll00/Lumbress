#!/usr/bin/env bash
# Aprovisiona un VPS Ubuntu (22.04/24.04) para Lumbres. Ejecutar como root UNA vez.
# Uso:  DB_PASS='una-contraseña-fuerte' bash lumbres-setup.sh
set -euo pipefail

DB_PASS="${DB_PASS:?Define DB_PASS, p. ej.: DB_PASS='...' bash lumbres-setup.sh}"
APP_DIR=/var/www/lumbres

echo "== 1/6 Paquetes base =="
apt-get update -y
apt-get install -y nginx mariadb-server ufw rsync git curl certbot python3-certbot-nginx

echo "== 2/6 Node.js LTS (22.x) =="
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2

echo "== 3/6 Firewall (solo SSH/HTTP/HTTPS) =="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "== 4/6 MariaDB: BD lumbres + usuario propio =="
systemctl enable --now mariadb
mysql <<SQL
CREATE DATABASE IF NOT EXISTS biblioteca_personal CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'lumbres'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON biblioteca_personal.* TO 'lumbres'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "== 5/6 Estructura de la app =="
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/server/uploads/audio" "$APP_DIR/server/uploads/covers" "$APP_DIR/server/uploads/books"

echo "== 6/6 nginx =="
# La config se copia aparte (deploy/nginx-lumbres.conf con el dominio ya puesto):
#   cp nginx-lumbres.conf /etc/nginx/sites-available/lumbres
#   ln -sf /etc/nginx/sites-available/lumbres /etc/nginx/sites-enabled/lumbres
#   rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl reload nginx
# Y después el certificado:
#   certbot --nginx -d DOMINIO -d www.DOMINIO

echo "Listo. Siguiente: subir código (rsync), server/.env, importar BD, pm2 start."
