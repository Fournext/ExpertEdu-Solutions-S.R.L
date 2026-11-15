# Sitio Web Corporativo — ExpertEdu Solutions S.R.L.

Plataforma web corporativa oficial de **ExpertEdu Solutions S.R.L.** (**ExpertEdu**), empresa tecnológica educativa (EdTech) ubicada en Santa Cruz de la Sierra, Bolivia, orientada a presentar sus soluciones tecnológicas y su producto principal **ExpertEdu Studio**.

## Arquitectura general

- **Frontend (`frontend/`)**: Astro 5 + React 19 + TypeScript + Tailwind CSS v4. Generación estática (`dist/`) con islas interactivas para demostración conceptual Forward Chaining, explorador de recursos, preguntas frecuentes y formularios reales.
- **Backend (`backend/`)**: Django 5 + Django REST Framework + PostgreSQL 16. API REST independiente (`/api/v1/contact/`, `/api/v1/support/tickets/`, `/api/v1/health/`) con validación estricta, protección anti-spam (honeypot + detección de duplicados + rate limiting) y notificaciones seguras.
- **Infraestructura (`nginx/`, `docker-compose*.yml`)**: Proxy inverso Nginx sirviendo frontend estático, API `/api/` y administración `/admin/`, preparado para despliegue en AWS EC2 con Docker Compose.

## Rutas principales

- `/` — Inicio corporativo
- `/nosotros` — Historia, misión, visión, valores y equipo fundador
- `/soluciones` — Líneas de especialización tecnológica y portafolio
- `/producto` — Presentación comercial de **ExpertEdu Studio** y recorrido ilustrativo Forward Chaining
- `/universidades` — Propuesta de valor para educación superior
- `/precios` — Planes referenciales (Capítulo 10)
- `/recursos` y `/recursos/[slug]` — Artículos, guías, tutoriales y FAQ
- `/contacto` — Formulario real de contacto y solicitud de demostración
- `/soporte` — Niveles de soporte, registro y consulta de tickets
- `/privacidad` — Política de privacidad
- `/404` — Página de error personalizada

## Desarrollo local

### Backend (Django + DRF)

```powershell
cd backend
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Pruebas y linter:

```powershell
cd backend
.\venv\Scripts\pytest.exe
.\venv\Scripts\flake8.exe --max-line-length=100 --exclude=venv,migrations
```

### Frontend (Astro + React + Tailwind)

```powershell
cd frontend
npm install
npm run dev
```

Verificación completa:

```powershell
cd frontend
npm run check
npm run lint
npm test
npm run build
npm run test:e2e
```

## Ejecución con Docker Compose (local)

```powershell
copy .env.example .env
docker compose up --build
```

La aplicación quedará disponible en `http://localhost:8080`.
