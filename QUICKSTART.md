# Быстрый старт
php artisan serve
php artisan serve --host=localhost --port=8088 --no-reload
## Шаг 1: Backend

```bash
cd backend
composer install
# Windows: Copy-Item env.example .env
# Linux/Mac: cp env.example .env
php artisan key:generate
```

Отредактируйте `.env`:
- Настройте MySQL подключение
- Установите `FRONTEND_URL=http://localhost:5173`
- Установите `SANCTUM_STATEFUL_DOMAINS=localhost:5173`

```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
php artisan serve
```

## Шаг 2: Frontend

```bash
cd frontend
npm install
npm run dev
```

## Шаг 3: Создайте базу данных

```sql
CREATE DATABASE dataviz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Готово!

Откройте http://localhost:5173 и начните работу!
