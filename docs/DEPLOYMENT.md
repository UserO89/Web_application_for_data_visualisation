# Deployment Checklist (Laravel API + Vue/Vite SPA)

Practical production runbook for VPS / typical PHP hosting.

## 0) Assumptions
- Backend is served from `backend/public` (Nginx/Apache document root).
- Frontend is built with Vite and deployed as static files (`frontend/dist`) on your SPA domain.
- HTTPS is enabled in production.

## 1) Required Production Environment Variables

### Backend (`backend/.env`)
Minimum required values:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://app.your-domain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database
DB_USERNAME=your_user
DB_PASSWORD=your_password

CORS_ALLOWED_ORIGINS=https://app.your-domain.com
CORS_ALLOWED_ORIGIN_PATTERNS=
CORS_SUPPORTS_CREDENTIALS=true

SANCTUM_STATEFUL_DOMAINS=app.your-domain.com,api.your-domain.com
SESSION_DOMAIN=.your-domain.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

Optional but recommended:
- `LOG_LEVEL=warning` (or `error`)
- `FILESYSTEM_DISK=public` if user-uploaded files must be publicly accessible via `/storage/*`

### Frontend (`frontend/.env.production`)

```env
VITE_API_BASE_URL=https://api.your-domain.com/api/v1
```

`VITE_BACKEND_URL` is optional for production builds (mainly useful for preview/proxy tooling).

## 2) Backend Deploy Steps

Run in `backend/`:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan key:generate --force   # only if APP_KEY is missing
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Notes:
- `php artisan migrate --force` is required for non-interactive production deploys.
- `storage:link` is required for public files (for example avatars) to be reachable.

## 3) Frontend Build + Publish

Run in `frontend/`:

```bash
npm ci
npm run build
```

Deploy `frontend/dist/*` to your SPA host/web root (for `app.your-domain.com`).

## 4) Web Server Routing

### Backend host (`api.your-domain.com`)
- Web root -> `backend/public`
- Forward PHP requests to PHP-FPM
- Ensure `/storage` symlink is allowed

### Frontend host (`app.your-domain.com`)
- Serve static files from built `dist`
- SPA fallback: unknown routes should return `index.html`

## 5) Smoke Test (after deployment)

1. Open frontend app URL (`https://app.your-domain.com`) and verify it loads without console API base URL errors.
2. Request CSRF cookie endpoint:
   - `GET https://api.your-domain.com/sanctum/csrf-cookie`
   - Expect successful response (204/200 depending on setup).
3. Login via UI and verify authenticated API call works (`/api/v1/auth/me` returns user in browser network tab).
4. Create a project, import a small dataset, open project workspace.
5. Upload avatar and verify image is reachable via API/public URL (`/storage/...`) if public disk is used.
6. Logout and login again to confirm session/cookie behavior.

## 6) Quick Troubleshooting

- `419 CSRF token mismatch`:
  - Check `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`, and HTTPS.
- CORS errors:
  - Check `CORS_ALLOWED_ORIGINS` includes the exact SPA origin.
- `SQLSTATE[42S22] Unknown column 'statistics_json' in 'field list'`:
  - New backend code is running against an older database schema. Run `php artisan migrate --force` on the deployed backend.
- Missing images/files:
  - Re-run `php artisan storage:link` and verify web server can follow symlink.
- Env changes not applied:
  - Re-run `php artisan config:clear && php artisan config:cache`.

## 7) Safe Re-deploy Sequence

1. Upload new code.
2. Install backend dependencies (`composer install --no-dev ...`).
3. Apply env updates.
4. Run migrations (`--force`).
5. Rebuild caches (`config/route/view`).
6. Build and publish frontend assets.
7. Run smoke test checklist.
