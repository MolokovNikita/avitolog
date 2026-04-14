# Паттерны проектирования в Avitolog: Singleton и Strategy

Этот документ описывает 2 явно внедрённых паттерна проектирования, которые сочетаются друг с другом и закрывают требование по логированию действий.

## Singleton — `AppLogger`

### Цель

- **Одна глобальная точка доступа** к логированию и аудиту действий.
- **Гарантия единственного экземпляра** логгера на процесс Node.js.

### Реализация

- **Класс**: `backend/src/patterns/singleton/AppLogger.js`
- **Механизм**: приватное статическое поле `#instance` и фабричный доступ через `AppLogger.getInstance()`.
- **API**:
  - `audit(userId, action, meta)` — аудит бизнес-действий пользователя (кто/что/когда).
  - `info(message, meta)` — информационные события.
  - `error(message, err)` — ошибки приложения.

### Где используется (примеры точек подключения)

- **Старт сервера**: `backend/src/server.js`
  - **логирование запуска и окружения через** `AppLogger.getInstance().info(...)`**.**
- **Подключение к PostgreSQL**: `backend/src/config/database.js`
  - логирование подключения и ошибок пула через `AppLogger`.
- **Глобальная обработка ошибок**: `backend/src/middleware/errorHandler.js`
  - централизованный `AppLogger.getInstance().error(...)` при любых необработанных ошибках.
- **Аудит API-действий**:
  - `backend/src/routes/products.routes.js`: `products.list`
  - `backend/src/routes/listings.routes.js`: `listings.list`, `listings.view`, `listings.create`

### Почему это Singleton (а не «почти»)

- Экземпляр создаётся и хранится **внутри класса**, напрямую создать второй экземпляр нельзя (конструктор бросает ошибку).
- Доступ к экземпляру стандартизирован и централизован через `**getInstance()`**.

---

## Strategy — расчёт комиссии маркетплейса

### Цель

- Инкапсулировать **семейство алгоритмов** расчёта комиссии/сборов для разных маркетплейсов.
- Дать возможность **заменять алгоритм** в зависимости от `marketplace` без разрастания `if/else` по всему проекту.

### Реализация

- **Модуль стратегий**: `backend/src/patterns/strategy/marketplaceFeeStrategies.js`
- **Стратегии (классы)**:
  - `AvitoFeeStrategy` (ключ: `avito`)
  - `OzonFeeStrategy` (ключ: `ozon`)
  - `WildberriesFeeStrategy` (ключ: `wildberries`)
  - `YandexMarketFeeStrategy` (ключ: `yandex_market`)
  - `DefaultFeeStrategy` (fallback)
- **Выбор стратегии**:
  - `resolveMarketplaceFeeStrategy(marketplace)`
  - `estimateFeeForListing(marketplace, salePrice)` → `{ strategyKey, estimatedCommission }`

### Где используется

- **Объявления**: `backend/src/routes/listings.routes.js`
  - при выдаче списка объявлений добавляются вычисленные поля:
    - `estimated_marketplace_fee`
    - `fee_strategy`
  - при выдаче одного объявления по id — аналогично
  - при создании объявления — аналогично

### Почему это Strategy (а не «почти»)

- Алгоритм расчёта вынесен в **отдельные классы-стратегии** с общим интерфейсом (`estimateCommission`).
- Выбор конкретного алгоритма сделан через **резолвер** по `marketplace`, а бизнес-код не знает деталей формулы.

---

## Как паттерны сочетаются друг с другом

- **Strategy** отвечает за *вариативную бизнес-логику* (разные правила комиссий для разных маркетплейсов).
- **Singleton (логгер)** отвечает за *сквозные нефункциональные требования* (логирование и аудит действий).

В итоге: при работе с объявлениями приложение **выбирает стратегию** по `marketplace`, а затем **фиксирует действия** пользователя через единый логгер.