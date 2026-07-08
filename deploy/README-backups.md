# Copias de seguridad de la base de datos de Lumbres

Protege contra el peor caso: corrupción de MariaDB, un borrado por error o una
migración que sale mal. Sin esto, un fallo de la BD es **irreversible**.

## Qué hace
- `backup-db.sh` — hace un `mysqldump` comprimido cada noche, comprueba que no
  esté corrupto y **borra los backups de más de 7 días** (rotación).
- `restaurar-db.sh` — restaura un backup (con confirmación; sobrescribe la BD).
- Los backups se guardan en `/var/backups/lumbres/` (fuera de `/var/www`, no se
  sirven por web).

Ya probado en local: dump → comprimir → restaurar en una BD temporal → 22 tablas
y los datos intactos.

## Instalación en el VPS (una sola vez)
```bash
# 1) Copiar los scripts (o ya están tras un deploy, en /var/www/lumbres/deploy)
chmod +x /var/www/lumbres/deploy/backup-db.sh /var/www/lumbres/deploy/restaurar-db.sh
mkdir -p /var/backups/lumbres

# 2) Prueba manual: debe crear un .sql.gz
/var/www/lumbres/deploy/backup-db.sh

# 3) Programar cada noche a las 3:00 (cron de root)
( crontab -l 2>/dev/null; echo "0 3 * * * /var/www/lumbres/deploy/backup-db.sh >> /var/log/lumbres-backup.log 2>&1" ) | crontab -
```

## Restaurar tras un desastre
```bash
# Ver backups disponibles
ls -1t /var/backups/lumbres/

# Restaurar uno (pide confirmación escribiendo RESTAURAR)
/var/www/lumbres/deploy/restaurar-db.sh /var/backups/lumbres/lumbres_AAAA-MM-DD_HHMM.sql.gz
```

## Copia FUERA del VPS (recomendado, pendiente)
Los backups locales protegen del 90% de los casos (corrupción, borrados). Pero si
el VPS entero se pierde, se pierden con él. Opciones para una copia externa:
- **Snapshots de Hostinger** (panel del VPS) — lo más fácil, actívalos.
- Un `scp`/`rsync` semanal que baje los backups al PC de William.
- Subida a un bucket (Backblaze B2 / S3) con `rclone`.
