# Manual de Despliegue en AWS EC2 (Docker + Nginx)

Este documento describe el despliegue de la web corporativa de **ExpertEdu Solutions S.R.L.** en una instancia **AWS EC2** (Ubuntu Server 24.04 LTS recomendada).

## 1. Requisitos previos en EC2

- Instancia EC2 con puertos **80** y **443** abiertos en el Security Group (y **22** restringido a su IP administrativa).
- Docker Engine y Docker Compose plugin instalados.
- Dominio `expertedu.bo` apuntando a la IP elástica de la instancia cuando se habilite HTTPS.

## 2. Preparación del entorno

```bash
git clone <URL_DEL_REPOSITORIO> /opt/expertedu-corporate
cd /opt/expertedu-corporate
cp .env.example .env
```

Editar `.env` con valores reales y seguros:
- `DJANGO_SECRET_KEY`: clave aleatoria larga.
- `POSTGRES_PASSWORD`: contraseña robusta para la base `expertedu_corp`.
- `DJANGO_ALLOWED_HOSTS`: `expertedu.bo,www.expertedu.bo,<IP_PUBLICA_EC2>`
- `DJANGO_CORS_ALLOWED_ORIGINS`: `https://expertedu.bo,https://www.expertedu.bo`
- Configuración SMTP real (`EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`).

## 3. Arranque en producción

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verificar estado y logs:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend nginx
```

Comprobar el endpoint de salud:

```bash
curl -fsS http://127.0.0.1/api/v1/health/
```

## 4. Habilitación de HTTPS con Certbot (cuando el DNS esté activo)

1. Emitir certificado Let's Encrypt usando el webroot `/var/www/certbot` o `certbot certonly --webroot`.
2. Descomentar el bloque `server { listen 443 ssl http2; ... }` en `nginx/expertedu.conf`.
3. Recargar Nginx:

```bash
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 5. Respaldo y restauración de base de datos

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
./scripts/backup-db.sh
```

Para restaurar un respaldo:

```bash
./scripts/restore-db.sh ./backups/expertedu_corp_YYYYMMDD_HHMMSS.sql.gz
```
