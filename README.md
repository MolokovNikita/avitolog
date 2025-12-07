# Авитолог - Система управления маркетплейсами

Веб-приложение для управления контентом и продвижением товаров авитолога на маркетплейсах (Avito, Ozon, Wildberries).

## Технологический стек

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT для аутентификации
- Multer для загрузки файлов
- node-cron для планировщика постов

### Frontend
- React 18+ с TypeScript
- React Router для маршрутизации
- Axios для API запросов
- Tailwind CSS для стилизации
- Recharts для графиков аналитики
- React Hook Form для форм

## Установка и запуск

### Предварительные требования

- Node.js (v18 или выше)
- PostgreSQL (v12 или выше)
- npm или yarn

### 1. Настройка базы данных

```bash
# Создайте базу данных PostgreSQL
createdb avitolog

# Или через psql
psql -U postgres
CREATE DATABASE avitolog;

# Примените схему
psql -U postgres -d avitolog -f database_schema.sql

# Заполните БД тестовыми данными (опционально)
psql -U postgres -d avitolog -f database_seed.sql
```

**Примечание:** После применения seed данных вы можете войти в систему с любым из тестовых пользователей:
- Email: `admin@avitolog.ru`, `avitolog@example.com` или `manager@example.com`
- Пароль: `password123`

### 2. Настройка Backend

```bash
cd backend

# Установите зависимости
npm install

# Создайте файл .env на основе .env.example
cp .env.example .env

# Отредактируйте .env файл с вашими настройками БД
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=avitolog
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your-secret-key-change-in-production

# Запустите сервер
npm run dev
```

Backend будет доступен на `http://localhost:5000`

### 3. Настройка Frontend

```bash
cd frontend

# Установите зависимости
npm install

# Запустите dev сервер
npm run dev
```

Frontend будет доступен на `http://localhost:3000`

## Диаграммы системы

В папке `docs/diagrams.md` находятся диаграммы системы в формате Mermaid:
- Архитектура системы
- ER-диаграмма базы данных
- BPMN процессы (авторизация, создание объявлений, синхронизация)
- Диаграмма компонентов Frontend
- Sequence диаграммы
- Диаграмма развертывания

Для просмотра скопируйте код диаграммы и вставьте на https://mermaid.live

## Структура проекта

```
avitolog-app/
├── backend/
│   ├── src/
│   │   ├── config/          # Конфигурация БД
│   │   ├── middleware/       # Middleware (auth, errorHandler)
│   │   ├── routes/           # API маршруты
│   │   ├── controllers/      # Контроллеры
│   │   ├── models/           # Модели данных
│   │   ├── services/         # Бизнес-логика
│   │   └── server.js         # Точка входа
│   ├── uploads/              # Загруженные файлы
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # React компоненты
│   │   ├── pages/            # Страницы приложения
│   │   ├── api/              # API клиент
│   │   ├── context/          # React Context
│   │   ├── types/            # TypeScript типы
│   │   └── App.tsx           # Главный компонент
│   └── package.json
└── database_schema.sql       # Схема БД
```

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация пользователя
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получить текущего пользователя (требует авторизации)

## Функциональность

### Реализовано
- ✅ Базовая структура проекта
- ✅ Аутентификация (регистрация, вход, JWT)
- ✅ Защищенные маршруты
- ✅ Layout с Sidebar и Header
- ✅ Страница Dashboard
- ✅ Страницы Login и Register

### В разработке
- ⏳ CRUD для клиентов
- ⏳ CRUD для товаров
- ⏳ CRUD для объявлений
- ⏳ CRUD для контента
- ⏳ CRUD для услуг
- ⏳ Аналитика
- ⏳ Загрузка файлов
- ⏳ Планировщик постов

## Разработка

### Backend
```bash
cd backend
npm run dev  # Запуск с nodemon
```

### Frontend
```bash
cd frontend
npm run dev  # Запуск Vite dev server
```

## Лицензия

MIT

# avitolog
