# PocketBiz — Бизнес в кармане

Операционная система для самозанятых: нативное приложение для мастера + веб-витрина самозаписи для клиентов.

## Стек

| Слой | Технология |
|------|-----------|
| Mobile | Expo (React Native), expo-router, TanStack Query, Zustand |
| Web | Next.js 15 (App Router) |
| API | NestJS, Prisma, PostgreSQL |
| Queue | BullMQ + Redis |
| Shared | ts-rest, zod |

## Быстрый старт

```bash
# 1. Установка зависимостей
pnpm i

# 2. Поднять БД и Redis
docker compose up -d

# 3. Применить миграции и наполнить тестовыми данными
pnpm db:migrate && pnpm db:seed

# 4. Запустить API + Web
pnpm dev

# 5. Запустить Expo (в отдельном терминале)
pnpm dev:mobile
```

## Структура

```
apps/
  api/          — NestJS API (порт 3001)
  web-booking/  — Next.js витрина (порт 3000)
  mobile/       — Expo приложение мастера
packages/
  shared/       — типы, zod-схемы, движок слотов
```

## Скрипты

```bash
pnpm lint        # проверка ESLint
pnpm typecheck   # проверка TypeScript
pnpm test        # unit-тесты
pnpm build       # production сборки всех apps
```

## Окружение

Скопируй `.env.example` в `.env` и заполни нужные значения:

```bash
cp .env.example .env
```
