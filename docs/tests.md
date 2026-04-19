# Тесты и покрытие (unit)

Этот документ описывает, **что покрыто unit-тестами** в проекте и **как запускать тесты**.

## Инструменты

- **Тест-раннер**: Vitest
- **Coverage**: V8 coverage (провайдер `v8`), выводится в консоль командой `test:coverage`

## Что покрыто тестами

### Backend (`backend`)

- **Unit/API tests** для Express роутов и middleware (через `supertest`)
- Покрыты файлы в `backend/src/` 
- В проекте есть набор тестов для:
  - `routes/`* (роуты API)
  - `middleware/*` (auth/error/upload)
  - `patterns/*` (singleton/strategy)

### Frontend (`frontend`)

- **Unit tests** для ключевых компонентов и контекста авторизации (React Testing Library + Vitest)
- Coverage в unit-тестах считается по файлам, которые не исключены в `frontend/vitest.config.ts`
  - В текущей конфигурации исключены страницы и часть UI/служебных модулей, которые не покрываются unit-тестами (см. `coverage.exclude`)

## Как запустить тесты

### Backend

Из папки `backend/`:

```bash
npm test
```

Coverage в консоль:

```bash
npm run test:coverage
```

### Frontend

Из папки `frontend/`:

```bash
npm test
```

Coverage в консоль:

```bash
npm run test:coverage
```



