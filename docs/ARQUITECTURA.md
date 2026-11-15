# Arquitectura Técnica — Web Corporativa ExpertEdu

## 1. Principio de separación empresa / producto

El sitio corporativo (`https://expertedu.bo`) pertenece a **ExpertEdu Solutions S.R.L.** y opera de manera desacoplada respecto a la aplicación educativa **ExpertEdu Studio**:

- Base de datos independiente (`expertedu_corp`) sin acceso directo a usuarios académicos, cursos ni bases de conocimiento del producto.
- Enlace configurable mediante la variable `PUBLIC_EXPERTEDU_STUDIO_URL` (centralizada en `frontend/src/config/site.ts`). Cuando no se configura una URL externa, los botones de acceso redirigen de forma segura a `/contacto?tipo=DEMO`.

## 2. Capas del sistema

1. **Capa de presentación (`frontend/`)**:
   - Astro 5 en modo estático (`output: 'static'`) para rendimiento, SEO técnico (`@astrojs/sitemap`, `robots.txt`, Open Graph, JSON-LD) y mínima superficie de ataque.
   - Islas React 19 (`client:load`) únicamente para componentes interactivos (`SiteHeader`, `ContactForm`, `SupportTicketForm`, `ForwardChainingDemo`, `ResourcesExplorer`, `FaqAccordion`).
   - Sistema de diseño unificado en `src/styles/global.css` (`#1E40AF`, `#0F172A`, `#10B981`, fuentes `Inter` y `Outfit`).

2. **Capa de servicios y API (`backend/`)**:
   - Django 5 + DRF configurado en modo JSON-only en producción (`JSONRenderer`).
   - Modelos en `corporate/models.py`:
     - `ContactInquiry`: solicitudes comerciales, demostraciones, servicios tecnológicos y licenciamiento institucional.
     - `SupportTicket`: tickets técnicos con código de referencia (`EXP-XXXXXX`), asignación automática de nivel (`L2` / `L3`) y consulta segura por referencia + correo.
   - Seguridad: validación de campos, rechazo de etiquetas HTML (`<` / `>`), campo honeypot (`website`), prevención de envíos duplicados en ventana de 10 minutos (`HTTP 409`), rate limiting (`10/hour`) y hash SHA-256 de IP.

3. **Capa de proxy e infraestructura (`nginx/`, `docker-compose*.yml`)**:
   - Contenedor `frontend` (Nginx sirviendo `dist/`).
   - Contenedor `backend` (Gunicorn ejecutando `config.wsgi:application`).
   - Contenedor `postgres` (PostgreSQL 16 Alpine con volumen persistente).
   - Contenedor `nginx` perimetral enrutando `/api/` y `/admin/` al backend y `/` al frontend.
