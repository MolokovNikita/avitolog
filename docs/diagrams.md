# Диаграммы системы Авитолог

## 1. Архитектура системы

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[Пользовательский интерфейс]
        Pages[Страницы: Dashboard, Clients, Products, Listings, Content, Services, Settings]
        Auth[AuthContext - Управление авторизацией]
        API_Client[Axios Client]
    end

    subgraph "Backend (Node.js + Express)"
        Server[Express Server]
        Auth_MW[Auth Middleware]
        Routes[API Routes]
        Controllers[Controllers]
        DB_Pool[PostgreSQL Pool]
    end

    subgraph "Database (PostgreSQL)"
        Users_T[(users)]
        Clients_T[(clients)]
        Products_T[(products)]
        Listings_T[(listings)]
        Content_T[(content_posts)]
        Services_T[(services)]
        Invoices_T[(invoices)]
        Analytics_T[(listing_analytics)]
        Connections_T[(marketplace_connections)]
    end

    subgraph "External Services"
        Avito[Avito API]
        Ozon[Ozon API]
        WB[Wildberries API]
        YM[Яндекс Маркет API]
    end

    UI --> Pages
    Pages --> Auth
    Pages --> API_Client
    API_Client -->|HTTP/REST| Server
    Server --> Auth_MW
    Auth_MW --> Routes
    Routes --> Controllers
    Controllers --> DB_Pool
    DB_Pool --> Users_T
    DB_Pool --> Clients_T
    DB_Pool --> Products_T
    DB_Pool --> Listings_T
    DB_Pool --> Content_T
    DB_Pool --> Services_T
    DB_Pool --> Invoices_T
    DB_Pool --> Analytics_T
    DB_Pool --> Connections_T
    
    Controllers -.->|Синхронизация| Avito
    Controllers -.->|Синхронизация| Ozon
    Controllers -.->|Синхронизация| WB
    Controllers -.->|Синхронизация| YM
```

## 2. ER-диаграмма базы данных

```mermaid
erDiagram
    users ||--o{ clients : "имеет"
    users ||--o{ products : "создает"
    users ||--o{ content_posts : "создает"
    users ||--o{ services : "предоставляет"
    users ||--o{ invoices : "выставляет"
    users ||--o{ marketplace_connections : "настраивает"
    
    clients ||--o{ products : "имеет"
    clients ||--o{ invoices : "получает"
    
    products ||--o{ product_media : "содержит"
    products ||--o{ listings : "публикуется"
    
    listings ||--o{ listing_analytics : "имеет статистику"
    
    invoices ||--o{ invoice_items : "содержит"
    
    users {
        int id PK
        string email UK
        string password_hash
        string full_name
        timestamp created_at
    }
    
    clients {
        int id PK
        int user_id FK
        string name
        string email
        string phone
        string company
        string status
    }
    
    products {
        int id PK
        int client_id FK
        int user_id FK
        string name
        text description
        decimal price
        int stock
        string category
    }
    
    listings {
        int id PK
        int product_id FK
        string marketplace
        string external_id
        string title
        text description
        decimal price
        string status
        int views
        timestamp published_at
    }
    
    content_posts {
        int id PK
        int user_id FK
        string platform
        text content
        string status
        timestamp scheduled_at
        timestamp published_at
        int views
        int likes
    }
    
    services {
        int id PK
        int user_id FK
        string name
        text description
        decimal price
        string unit
        string status
    }
    
    invoices {
        int id PK
        int client_id FK
        int user_id FK
        string invoice_number UK
        decimal amount
        string status
        date due_date
    }
    
    marketplace_connections {
        int id PK
        int user_id FK
        string marketplace UK
        string api_key
        string api_secret
        boolean is_active
        timestamp last_sync_at
    }
    
    listing_analytics {
        int id PK
        int listing_id FK
        date date
        int views
        int favorites
        int contacts
    }
```

## 3. BPMN - Процесс авторизации и работы с системой

```mermaid
flowchart TD
    Start([Пользователь открывает систему]) --> CheckAuth{Авторизован?}
    CheckAuth -->|Нет| Login[Страница входа]
    CheckAuth -->|Да| Dashboard[Дашборд]
    
    Login --> EnterCred[Ввод email и пароля]
    EnterCred --> Validate{Валидация формы}
    Validate -->|Ошибка| ShowError[Показать ошибку]
    ShowError --> EnterCred
    Validate -->|OK| SendRequest[Отправка запроса на /api/auth/login]
    SendRequest --> CheckResponse{Ответ сервера}
    CheckResponse -->|401| ShowError
    CheckResponse -->|200| SaveToken[Сохранение JWT токена]
    SaveToken --> Dashboard
    
    Dashboard --> NavMenu[Навигационное меню]
    NavMenu --> Clients[Клиенты]
    NavMenu --> Products[Товары]
    NavMenu --> Listings[Объявления]
    NavMenu --> Content[Контент]
    NavMenu --> Services[Услуги]
    NavMenu --> Settings[Настройки]
    
    Clients --> CRUD_Client[CRUD операции с клиентами]
    Products --> CRUD_Product[CRUD операции с товарами]
    Listings --> CRUD_Listing[CRUD операции с объявлениями]
    Content --> CRUD_Content[CRUD операции с контентом]
    Services --> CRUD_Service[CRUD операции с услугами]
    
    Settings --> SetupConnection[Настройка подключений к маркетплейсам]
    SetupConnection --> EnterAPI[Ввод API ключей]
    EnterAPI --> SaveConnection[Сохранение подключения]
    SaveConnection --> Sync[Синхронизация с маркетплейсом]
    
    CRUD_Client --> End([Завершение])
    CRUD_Product --> End
    CRUD_Listing --> End
    CRUD_Content --> End
    CRUD_Service --> End
    Sync --> End
```

## 4. BPMN - Процесс создания и публикации объявления

```mermaid
flowchart TD
    Start([Создание объявления]) --> SelectClient[Выбор клиента]
    SelectClient --> SelectProduct[Выбор товара]
    SelectProduct --> FillForm[Заполнение формы объявления]
    
    FillForm --> EnterTitle[Ввод заголовка]
    EnterTitle --> EnterDesc[Ввод описания]
    EnterDesc --> EnterPrice[Установка цены]
    EnterPrice --> SelectMarketplace[Выбор маркетплейса]
    SelectMarketplace --> UploadImages[Загрузка изображений]
    
    UploadImages --> ValidateForm{Валидация формы}
    ValidateForm -->|Ошибка| ShowError[Показать ошибки]
    ShowError --> FillForm
    ValidateForm -->|OK| SaveDraft[Сохранение как черновик]
    
    SaveDraft --> CheckConnection{Подключение к маркетплейсу настроено?}
    CheckConnection -->|Нет| RedirectSettings[Перенаправление в настройки]
    RedirectSettings --> SetupAPI[Настройка API]
    SetupAPI --> CheckConnection
    
    CheckConnection -->|Да| Publish[Публикация на маркетплейс]
    Publish --> CallAPI[Вызов API маркетплейса]
    CallAPI --> CheckResponse{Ответ API}
    
    CheckResponse -->|Ошибка| LogError[Логирование ошибки]
    LogError --> UpdateStatus[Обновление статуса: ошибка]
    UpdateStatus --> NotifyUser[Уведомление пользователя]
    
    CheckResponse -->|Успех| SaveExternalID[Сохранение external_id]
    SaveExternalID --> UpdateStatus2[Обновление статуса: опубликовано]
    UpdateStatus2 --> SetPublishedAt[Установка published_at]
    SetPublishedAt --> StartAnalytics[Начало сбора аналитики]
    
    StartAnalytics --> ScheduleSync[Планирование синхронизации]
    ScheduleSync --> End([Объявление опубликовано])
    NotifyUser --> End
```

## 5. BPMN - Процесс синхронизации с маркетплейсами

```mermaid
flowchart TD
    Start([Запуск синхронизации]) --> GetConnections[Получение активных подключений]
    GetConnections --> LoopStart{Есть подключения?}
    
    LoopStart -->|Нет| End([Завершение])
    LoopStart -->|Да| SelectConnection[Выбор подключения]
    
    SelectConnection --> CheckToken{Токен валиден?}
    CheckToken -->|Нет| RefreshToken[Обновление токена]
    RefreshToken --> CheckToken2{Токен обновлен?}
    CheckToken2 -->|Нет| LogError[Логирование ошибки]
    CheckToken2 -->|Да| FetchData[Получение данных с API]
    
    CheckToken -->|Да| FetchData
    
    FetchData --> GetListings[Получение списка объявлений]
    GetListings --> GetAnalytics[Получение аналитики]
    GetAnalytics --> GetOrders[Получение заказов]
    
    GetOrders --> ProcessData[Обработка данных]
    ProcessData --> UpdateListings[Обновление объявлений в БД]
    UpdateListings --> UpdateAnalytics[Обновление аналитики в БД]
    UpdateAnalytics --> UpdateOrders[Обновление заказов в БД]
    
    UpdateOrders --> UpdateLastSync[Обновление last_sync_at]
    UpdateLastSync --> NextConnection{Есть еще подключения?}
    NextConnection -->|Да| SelectConnection
    NextConnection -->|Нет| End
    
    LogError --> NextConnection
```

## 6. Диаграмма компонентов Frontend

```mermaid
graph TB
    subgraph "App.tsx"
        Router[React Router]
        AuthProvider[AuthProvider Context]
    end
    
    subgraph "Layout Components"
        Layout[Layout]
        Sidebar[Sidebar - Навигация]
        Header[Header - Шапка]
    end
    
    subgraph "Pages"
        Dashboard[Dashboard - Статистика]
        ClientsList[ClientsList - Список клиентов]
        ProductsList[ProductsList - Список товаров]
        ListingsList[ListingsList - Список объявлений]
        PostsList[PostsList - Список постов]
        ServicesList[ServicesList - Список услуг]
        MarketplaceSettings[MarketplaceSettings - Настройки]
    end
    
    subgraph "Forms"
        ClientForm[ClientForm]
        ProductForm[ProductForm]
        ListingForm[ListingForm]
        PostForm[PostForm]
        ServiceForm[ServiceForm]
    end
    
    subgraph "Common Components"
        Modal[Modal - Модальное окно]
        Table[Table - Таблица]
        MarketplaceLogo[MarketplaceLogo - Логотип маркетплейса]
    end
    
    subgraph "API Layer"
        AxiosConfig[Axios Config - HTTP клиент]
        AuthContext[AuthContext - Управление авторизацией]
    end
    
    Router --> AuthProvider
    AuthProvider --> Layout
    Layout --> Sidebar
    Layout --> Header
    
    Router --> Dashboard
    Router --> ClientsList
    Router --> ProductsList
    Router --> ListingsList
    Router --> PostsList
    Router --> ServicesList
    Router --> MarketplaceSettings
    
    ClientsList --> Modal
    Modal --> ClientForm
    ProductsList --> Modal
    Modal --> ProductForm
    ListingsList --> Modal
    Modal --> ListingForm
    PostsList --> Modal
    Modal --> PostForm
    ServicesList --> Modal
    Modal --> ServiceForm
    
    ClientsList --> Table
    ProductsList --> Table
    ListingsList --> Table
    PostsList --> Table
    ServicesList --> Table
    
    ListingsList --> MarketplaceLogo
    MarketplaceSettings --> MarketplaceLogo
    
    ClientForm --> AxiosConfig
    ProductForm --> AxiosConfig
    ListingForm --> AxiosConfig
    PostForm --> AxiosConfig
    ServiceForm --> AxiosConfig
    Dashboard --> AxiosConfig
    ClientsList --> AxiosConfig
    ProductsList --> AxiosConfig
    ListingsList --> AxiosConfig
    PostsList --> AxiosConfig
    ServicesList --> AxiosConfig
    MarketplaceSettings --> AxiosConfig
    
    AuthContext --> AxiosConfig
```

## 7. Последовательность действий при создании объявления

```mermaid
sequenceDiagram
    participant User as Пользователь
    participant Frontend as React Frontend
    participant Backend as Express Backend
    participant DB as PostgreSQL
    participant MP as Маркетплейс API
    
    User->>Frontend: Открывает страницу "Объявления"
    Frontend->>Backend: GET /api/listings
    Backend->>DB: SELECT listings
    DB-->>Backend: Список объявлений
    Backend-->>Frontend: JSON ответ
    Frontend-->>User: Отображение списка
    
    User->>Frontend: Нажимает "Создать"
    Frontend->>Frontend: Открывает модальное окно с формой
    
    User->>Frontend: Заполняет форму (товар, маркетплейс, цена)
    User->>Frontend: Нажимает "Сохранить"
    
    Frontend->>Backend: POST /api/listings
    Note over Backend: Валидация данных
    Backend->>DB: INSERT INTO listings
    DB-->>Backend: ID нового объявления
    Backend-->>Frontend: Успешный ответ
    
    Frontend->>Frontend: Закрывает модальное окно
    Frontend->>Frontend: Обновляет список объявлений
    
    User->>Frontend: Нажимает "Опубликовать"
    Frontend->>Backend: POST /api/listings/:id/publish
    
    Backend->>DB: SELECT marketplace_connections
    DB-->>Backend: API ключи маркетплейса
    
    Backend->>MP: POST /api/v1/listings (с API ключом)
    MP-->>Backend: external_id объявления
    
    Backend->>DB: UPDATE listings SET status='published', external_id=...
    DB-->>Backend: OK
    
    Backend-->>Frontend: Успешная публикация
    Frontend-->>User: Уведомление об успехе
```

## 8. Диаграмма развертывания

```mermaid
graph TB
    subgraph "Development Environment"
        Dev_Frontend[Frontend Dev Server<br/>localhost:3000]
        Dev_Backend[Backend Server<br/>localhost:5001]
        Dev_DB[(PostgreSQL<br/>localhost:5432)]
    end
    
    subgraph "Production Environment"
        subgraph "Client Browser"
            Browser[Web Browser]
        end
        
        subgraph "Web Server"
            Nginx[Nginx<br/>Reverse Proxy]
            Frontend_Build[React Build<br/>Static Files]
        end
        
        subgraph "Application Server"
            Node_App[Node.js App<br/>PM2/Systemd]
            Backend_API[Express API]
        end
        
        subgraph "Database Server"
            Prod_DB[(PostgreSQL<br/>Primary)]
            Backup_DB[(PostgreSQL<br/>Backup)]
        end
        
        subgraph "External Services"
            Avito_API[Avito API]
            Ozon_API[Ozon API]
            WB_API[Wildberries API]
        end
    end
    
    Browser -->|HTTPS| Nginx
    Nginx --> Frontend_Build
    Nginx -->|Proxy /api| Node_App
    Node_App --> Backend_API
    Backend_API --> Prod_DB
    Prod_DB -.->|Replication| Backup_DB
    Backend_API -.->|API Calls| Avito_API
    Backend_API -.->|API Calls| Ozon_API
    Backend_API -.->|API Calls| WB_API
```

## Как использовать

1. Скопируйте любую диаграмму из этого файла
2. Перейдите на https://mermaid.live
3. Вставьте код диаграммы в редактор
4. Диаграмма автоматически отобразится

Все диаграммы готовы к использованию в Mermaid Live Editor!

