#!/bin/bash

# Скрипт для настройки базы данных PostgreSQL

set -e

echo "🚀 Настройка базы данных для Авитолог..."

# Проверка наличия PostgreSQL
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL найден"
    PSQL_CMD="psql"
elif command -v docker &> /dev/null; then
    echo "✅ Docker найден, используем контейнер PostgreSQL"
    PSQL_CMD="docker exec -i avitolog-postgres psql -U postgres"
    
    # Проверка, запущен ли контейнер
    if ! docker ps | grep -q avitolog-postgres; then
        echo "📦 Запускаем контейнер PostgreSQL..."
        docker-compose up -d postgres
        echo "⏳ Ждем запуска PostgreSQL..."
        sleep 5
    fi
else
    echo "❌ PostgreSQL не найден. Установите PostgreSQL или Docker."
    echo ""
    echo "Установка через Homebrew:"
    echo "  brew install postgresql@15"
    echo "  brew services start postgresql@15"
    echo ""
    echo "Или используйте Docker:"
    echo "  docker-compose up -d"
    exit 1
fi

# Создание базы данных (если не через Docker)
if [ "$PSQL_CMD" = "psql" ]; then
    echo "📝 Создаем базу данных..."
    createdb avitolog 2>/dev/null || echo "База данных уже существует или ошибка создания"
fi

# Применение схемы
echo "📋 Применяем схему базы данных..."
if [ "$PSQL_CMD" = "psql" ]; then
    psql -U postgres -d avitolog -f database_schema.sql
else
    docker exec -i avitolog-postgres psql -U postgres -d avitolog < database_schema.sql
fi

# Применение seed данных
echo "🌱 Применяем seed данные..."
if [ "$PSQL_CMD" = "psql" ]; then
    psql -U postgres -d avitolog -f database_seed.sql
else
    docker exec -i avitolog-postgres psql -U postgres -d avitolog < database_seed.sql
fi

echo ""
echo "✅ База данных успешно настроена!"
echo ""
echo "📊 Данные для входа:"
echo "   Email: admin@avitolog.ru"
echo "   Пароль: password123"
echo ""
echo "🔗 Подключение к БД:"
if [ "$PSQL_CMD" = "psql" ]; then
    echo "   psql -U postgres -d avitolog"
else
    echo "   docker exec -it avitolog-postgres psql -U postgres -d avitolog"
fi

