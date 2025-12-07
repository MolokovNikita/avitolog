# Быстрый старт

## Шаг 1: Настройка базы данных

```bash
# Создайте базу данных
createdb avitolog

# Примените схему
psql -U postgres -d avitolog -f database_schema.sql

# Заполните тестовыми данными
psql -U postgres -d avitolog -f database_seed.sql
```

## Шаг 2: Настройка Backend

```bash
cd backend
npm install

# Скопируйте env.example в .env и настройте
cp env.example .env
# Отредактируйте .env с вашими данными БД

# Запустите сервер
npm run dev
```

## Шаг 3: Настройка Frontend

```bash
cd frontend
npm install
npm run dev
```

## Шаг 4: Вход в систему

Откройте браузер и перейдите на `http://localhost:3000`

**Тестовые пользователи (после применения seed данных):**
- Email: `admin@avitolog.ru` или `avitolog@example.com`
- Пароль: `password123`

## Что включено в seed данные

- 3 тестовых пользователя
- 5 клиентов с разными статусами
- 13 товаров различных категорий
- 16 объявлений на разных маркетплейсах (Avito, Ozon, Wildberries, Яндекс Маркет)
- 5 постов для соцсетей
- 9 услуг
- 5 счетов
- Аналитика за последние 30 дней

## Проверка работы

1. Backend должен быть доступен на `http://localhost:5000`
2. Проверьте health endpoint: `http://localhost:5000/api/health`
3. Frontend должен автоматически проксировать запросы к backend
4. После входа вы увидите дашборд с реальными данными из БД

## Возможные проблемы

### Ошибка подключения к БД
- Проверьте, что PostgreSQL запущен
- Убедитесь, что данные в `.env` правильные
- Проверьте, что база данных `avitolog` создана

### Порт уже занят
- Измените PORT в `.env` для backend
- Измените порт в `vite.config.ts` для frontend

### Пароль не работает
- Убедитесь, что вы применили `database_seed.sql`
- Попробуйте пересоздать хеш: `node backend/scripts/generate-seed-hash.js`
