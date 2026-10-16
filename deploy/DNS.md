# DNS de lumbress.com

Dominio registrado en **Hostinger** hasta el **11 de junio de 2029**.
Nameservers actuales: `aster.dns-parking.com` / `helios.dns-parking.com`.

## Registros (copia de seguridad, tomada el 2026-10-15)

Estos son los que habia en Hostinger. Si se mueve el DNS a otro proveedor,
hay que recrearlos TODOS: los tres de correo son los que hacen que Resend
pueda enviar, y sin ellos el registro de usuarios deja de funcionar.

| Tipo | Nombre | Valor | Notas |
|---|---|---|---|
| A | `@` | `5.189.177.240` | **Contabo** (antes 72.60.187.17, VPS muerto) |
| CNAME | `www` | `lumbress.com` | |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF de Resend |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | prioridad 10 |
| TXT | `resend._domainkey` | la clave `p=MIGf...` de abajo | DKIM de Resend |

DKIM completo (una sola linea, sin espacios):

```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCrxP1ntPyLq0jKsNOzG0bPB+7ESpTqQXv4RmJ2YGDANFWTFSxVM61OK71SPYVPAQvdeqajWSzwvyz+nfA/lTFOA/LRaY6g9yPbyzOUW9t1iHdlVzBVCMO0xjf7CaRoUUrgZWVSj3QFgydYSzoQQs13mR/7RAP61BQ8nBvUd55+twIDAQAB
```

## Pendiente: DMARC

La auditoria de septiembre lo marco como ausente y sigue sin estar. Al tocar
el DNS conviene anadirlo:

| Tipo | Nombre | Valor |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:williamluisgonzalez@gmail.com` |

`p=none` solo observa y manda informes; no bloquea nada. Se endurece despues,
cuando los informes confirmen que todo lo legitimo pasa.

## Si se mueve a Cloudflare

El dominio **sigue registrado en Hostinger**: solo cambian los nameservers.
Ojo con una cosa: las entradas A deben quedar en **"DNS only"** (nube gris).
Con el proxy activado (nube naranja) Cloudflare termina el TLS por su cuenta
y Traefik no puede completar el reto de Let's Encrypt.
