# DataViz Studio

A full-stack web application for tabular data import, data quality control, and exploratory analysis.

Built as a bachelor thesis project, but implemented as a real Laravel + Vue application with a meaningful backend pipeline: parsing, validation, normalization, semantic column inference, descriptive statistics, and chart-driven exploration.

## Project Overview

DataViz Studio helps users move from raw CSV/TXT files to usable analysis in one flow:
- import a dataset,
- review what was fixed or flagged,
- explore statistics,
- build charts,
- save useful visualizations per project.

The repository also includes practical product functionality: authentication, profile management, project CRUD, and an admin module.

Each project is designed around a single dataset: it starts empty, allows one import, and then stays permanently tied to that dataset.

## Key Highlights

- Real full-stack scope: Laravel API + Vue SPA with role-based access control.
- Single-dataset project architecture enforced across database, API, and UI.
- Import pipeline with explicit outcomes: blocked import vs imported with warnings.
- Automatic normalization for numbers, booleans, dates, and empty markers.
- Semantic schema inference per column with manual overrides.
- Statistics engine aware of semantic type (numeric/categorical/temporal/ordinal).
- Chart builder with compatibility rules and 6 implemented chart types.
- Saved chart library (save/rename/delete/PNG export).
- Backend + frontend automated tests for critical flows.

## Product Workflow

1. Sign in and create a project.
2. Import one CSV/TXT file once for that project (or build a table manually and import once).
3. Backend validates and normalizes data before persistence.
4. Review import summary and problematic columns.
5. Explore table data, statistics, and chart suggestions.
6. Adjust semantic type / ordinal order if needed.
7. Build and save charts in project library.

## Feature Breakdown

### Authentication and account
- Session-based SPA auth (`Laravel Sanctum` + CSRF cookies).
- Register/login/logout and user session restore (`/auth/me`).
- Profile updates, password change, avatar upload, account deletion.

### Projects and datasets
- Create/list/update/delete projects.
- Strict user ownership checks on project resources.
- Each project is designed around exactly one dataset.
- A project starts empty and allows one import.
- Dataset replacement and re-import in the same project are not supported by design.
- To analyze another dataset, create a new project.

### Validation and normalization
- Structural checks for malformed/empty tabular input.
- Value-level normalization includes:
  - whitespace and empty marker handling,
  - normalization for numeric, boolean, date, and datetime values.
- Import review contract includes summary, problematic columns, and blocking error details.

### Analysis and visualization
- Semantic schema inference (`metric`, `nominal`, `ordinal`, `temporal`, `identifier`, `binary`, `ignored`).
- Manual semantic overrides and custom ordinal order.
- Descriptive statistics endpoint with semantic-aware metrics.
- Chart builder with implemented chart types:
  - line,
  - bar,
  - scatter,
  - histogram,
  - boxplot,
  - pie.
- Chart suggestions, series color controls, table CSV export, chart PNG export.

### Workspace and management
- Multi-view workspace: `workspace`, `table`, `visualization`, `statistics`, `library`.
- Draggable/resizable panels with local layout persistence.
- Saved charts per project: list, rename, delete, download.
- Admin panel: system stats, user management, user project management.

## Engineering Notes

This project is intentionally not only “CRUD + chart UI”. The core complexity is in connecting backend data quality logic with frontend analysis UX:
- import is processed through staged backend services, not directly stored,
- semantic schema becomes a shared contract for stats and charting,
- frontend coordinates multiple interactive modules with persistent local state,
- API enforces ownership and role boundaries across all key actions.

## Tech Stack

| Layer | Technologies used |
| --- | --- |
| Backend | PHP 8.2+, Laravel 11, Laravel Sanctum, League CSV |
| Frontend | Vue 3, Vue Router 4, Pinia, Axios, Vite |
| Data visualization | ECharts 6 |
| Data table | Tabulator |
| Testing | PHPUnit, Vitest, Vue Test Utils |
| Database | MySQL (default local dev), SQLite in-memory (backend tests) |

## Architecture and Structure

```text
Web_application_for_data_visualisation/
|- backend/      # Laravel API, services, migrations, tests
|- frontend/     # Vue SPA, chart/statistics modules, tests
|- test-data/    # CSV samples for validation/statistics scenarios
`- README.md
```

High-level request flow:

```text
Vue SPA -> /api/v1/* -> Laravel controllers -> domain services -> persistence
```

## Setup

### Prerequisites
- PHP 8.2+
- Composer
- Node.js 18+ and npm
- MySQL 8+ (default setup)

### 1) Backend

```bash
cd backend
composer install
```

Create env file:

PowerShell:
```powershell
Copy-Item .env.example .env
```

Bash:
```bash
cp .env.example .env
```

Run:

```bash
php artisan key:generate
php artisan migrate
php artisan serve
```

Windows fallback:

```bash
php artisan serve --host=localhost --port=8088 --no-reload
```

### 2) Frontend

```bash
cd frontend
npm install
Copy-Item .env.example .env.development
# optional for production builds:
# Copy-Item .env.example .env.production

npm run dev
```

Default URL: `http://localhost:5173`

Required frontend env values:
- `VITE_API_BASE_URL` (for example `/api/v1` in local dev with proxy, or `https://your-domain.com/api/v1` in production).
- `VITE_BACKEND_URL` (Vite dev proxy target).

There is no localhost runtime fallback in the frontend API client. API base URL must come from env files.

### Environment (backend)

Example local backend configuration.  
Adjust values to your environment.

```env
APP_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
CORS_ALLOWED_ORIGIN_PATTERNS=
CORS_SUPPORTS_CREDENTIALS=true
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dataviz
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173,localhost:8000,127.0.0.1:8000
```

Production example (replace domains):

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://app.your-domain.com
CORS_ALLOWED_ORIGINS=https://app.your-domain.com
SANCTUM_STATEFUL_DOMAINS=app.your-domain.com,api.your-domain.com
SESSION_DOMAIN=.your-domain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

Notes:
- Frontend API base URL is env-driven (`VITE_API_BASE_URL`) and has no localhost runtime fallback.
- Backend CORS and Sanctum are env-driven; production should always provide explicit real domains.

## Testing

Backend:

```bash
cd backend
php artisan test
```

Frontend:

```bash
cd frontend
npm run test
```

Watch mode:

```bash
cd frontend
npm run test:watch
```

## Screenshots

### Home
![Home page](docs/screenshots/home-page.png)

### Login
![Login page](docs/screenshots/login-page.png)

### Project Workspace
![Project page](docs/screenshots/project-page.png)

### Admin
![Admin page](docs/screenshots/admin-page.png)

## Future Improvements

- Background jobs and chunked processing for larger files.
- More advanced chart presets and export options.
- Optional Dockerized dev environment.
- Expanded admin audit logging.

## Author

Built and maintained by the repository author as a bachelor thesis project focused on practical full-stack data analysis workflows.

## License

MIT. See [LICENSE](LICENSE).

## Related Documentation

- `docs/DEPLOYMENT.md` - production deployment checklist (env, build, migrate, cache, smoke test)
- `test-data/` - CSV fixtures for validation/statistics scenarios
