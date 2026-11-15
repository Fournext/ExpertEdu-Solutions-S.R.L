# Despliegue en EC2 con HTTPS

Dominio oficial: `https://expertedu.fournext.website`.

## Requisitos

- Ubuntu, Docker Compose y Certbot (`sudo apt install certbot`).
- DNS del subdominio apuntando a la IP pública de EC2; Solo DNS durante la emisión inicial.
- Puertos TCP 80 y 443 accesibles en el Security Group y firewall.
- Certificado en `/etc/letsencrypt/live/expertedu.fournext.website/` antes de arrancar Nginx de producción.

## Variables del servidor

Copiar `.env.example` a `.env` solo en la primera instalación. En un servidor
existente, editar su `.env` conservando los secretos y la contraseña de PostgreSQL.
El archivo real no debe subirse al repositorio.

```dotenv
DJANGO_ALLOWED_HOSTS=expertedu.fournext.website,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://expertedu.fournext.website
CSRF_TRUSTED_ORIGINS=https://expertedu.fournext.website
PUBLIC_SITE_URL=https://expertedu.fournext.website
PUBLIC_API_BASE_URL=/api/v1
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=re_REEMPLAZAR_CON_CLAVE_REAL
DEFAULT_FROM_EMAIL="ExpertEdu <contacto@expertedu.fournext.website>"
CONTACT_NOTIFICATION_EMAIL=contacto@expertedu.fournext.website
SUPPORT_NOTIFICATION_EMAIL=contacto@expertedu.fournext.website
```

Configurar también `DJANGO_SECRET_KEY` y `POSTGRES_PASSWORD` reales.
Las variables correctas son `CORS_ALLOWED_ORIGINS`, `CONTACT_NOTIFICATION_EMAIL`
y `SUPPORT_NOTIFICATION_EMAIL`. Los destinatarios pueden ser correos personales.

## Certificado inicial

Si ya se emitió, omitir la emisión y consultar `sudo certbot certificates`.
Para una instalación nueva sin Nginx ejecutándose:

```bash
sudo certbot certonly --standalone -d expertedu.fournext.website
```

Si el contenedor ya ocupa el puerto 80:

```bash
sudo certbot certonly --standalone \
  -d expertedu.fournext.website \
  --pre-hook "docker stop expertedu-corp-nginx-prod" \
  --post-hook "docker start expertedu-corp-nginx-prod"
```

## Actualizar y desplegar

Desde la carpeta del proyecto en EC2:

```bash
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml up -d --force-recreate --no-deps nginx
```

Continuar solo si cada comando termina correctamente. Recrear Nginx aplica
el archivo versionado incluso si Git reemplazó el archivo montado. Los datos
de PostgreSQL y los certificados del servidor se conservan.

```bash
curl -I http://expertedu.fournext.website/
curl -I https://expertedu.fournext.website/
curl -fsS https://expertedu.fournext.website/api/v1/health/
docker compose -f docker-compose.prod.yml logs --tail=100 nginx backend
```

HTTP debe redirigir a HTTPS. El workflow manual `.github/workflows/deploy.yml`
aplica estos pasos; configurar los secrets `EC2_HOST`, `EC2_USER`,
`EC2_SSH_KEY` y `EC2_APP_DIR` en el entorno de GitHub seleccionado.

## Renovación automática

La emisión con hooks guarda la parada y el arranque para futuras renovaciones.
Si el certificado se creó sin hooks, configurarlos antes de probar:

```bash
sudo certbot reconfigure --cert-name expertedu.fournext.website \
  --pre-hook "docker stop expertedu-corp-nginx-prod" \
  --post-hook "docker start expertedu-corp-nginx-prod"
sudo systemctl enable --now certbot.timer
sudo certbot renew --dry-run
```

Standalone necesita el puerto 80 libre y provoca una breve interrupción
mientras Nginx está detenido. Mantener el puerto 80 accesible. Los certificados
residen en `/etc/letsencrypt` del servidor y se montan en modo lectura en Nginx.

## Cloudflare

Tras comprobar HTTPS, se puede activar la nube naranja del registro web y usar
SSL/TLS **Full (strict)**. No usar Flexible: la redirección del servidor puede
provocar un bucle. Conservar los registros de correo según el proveedor.

## Desarrollo local

`docker compose up --build` usa `nginx/local.conf`, HTTP y ningún certificado.
Producción usa `docker-compose.prod.yml` y `nginx/expertedu.conf` con HTTPS.

## Respaldos

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
./scripts/backup-db.sh
```

Para restaurar, solo cuando corresponda reemplazar los datos existentes:

```bash
./scripts/restore-db.sh ./backups/ARCHIVO_DE_RESPALDO.sql.gz
```
