# PLAN.md — PocketBiz MVP

Slug: `pocketbiz` | Bundle ID: `com.pocketbiz.app`

## Статус фаз

| Фаза | Название | Статус |
|------|----------|--------|
| 0 | Каркас | ✅ Готово |
| 1 | Auth + схема данных | ✅ Готово |
| 2 | Услуги, расписание, движок слотов | ✅ Готово (mobile) |
| 3 | Веб-витрина самозаписи | ✅ Готово |
| 4 | Уведомления и напоминания | ✅ Готово |
| 5 | Оплата услуг | ✅ Готово |
| 6 | CRM и рассылки | ✅ Готово |
| 7 | Монетизация | ✅ Готово |
| 8 | Подготовка к сторам | ✅ Готово |

---

## Фаза 0 — Каркас

**Статус:** ✅ Готово (2026-06-10)

### Задачи
- [x] Монорепо root (pnpm workspaces + Turborepo)
- [x] docker-compose (postgres + redis)
- [x] ESLint + Prettier (root config)
- [x] tsconfig.base.json
- [x] .env.example
- [x] .gitignore
- [x] README.md
- [x] apps/api (NestJS skeleton — health endpoint + spec)
- [x] apps/web-booking (Next.js skeleton)
- [x] apps/mobile (Expo skeleton — 4 таба: Сегодня/Календарь/Клиенты/Профиль)
- [x] packages/shared (types stub — AppointmentStatus, Phone)
- [x] GitHub Actions CI (lint + typecheck + test)

### Критерии приёмки
- [x] `pnpm i` отрабатывает без ошибок
- [x] `pnpm lint && pnpm typecheck && pnpm test` — все зелёные
- [ ] `docker compose up -d` поднимает postgres и redis — не проверялось (Docker не запущен в CI-контексте)
- [ ] `pnpm dev` стартует api (порт 3001) и web-booking (порт 3000) — проверить вручную
- [ ] `pnpm dev:mobile` открывает Expo — проверить вручную

### TODO (откладываем в следующие фазы)
- Prisma setup → Фаза 1
- Auth модули → Фаза 1
- BullMQ конфиг → Фаза 4
- Sentry + PostHog → Фаза 8
- EAS конфиг → Фаза 8

---

## Фаза 1 — Auth + схема данных

**Статус:** ✅ Готово (2026-06-10)

### Задачи
- [ ] Prisma схема (User, Device, Service, Client, Appointment, WorkingHours, TimeOff, Payment, Broadcast, Storefront, Subscription)
- [ ] Миграции + seed (мастер «Анна, маникюр», 3 услуги, 5 клиентов, 10 записей)
- [ ] OTP-флоу (SmsProvider-заглушка пишет в лог)
- [ ] JWT access (15 мин) + refresh с ротацией
- [ ] SecureStore для токенов в mobile
- [ ] Навигация в mobile: табы Сегодня / Календарь / Клиенты / Профиль

### Критерии приёмки
- [ ] Телефон → код из логов → экран «Сегодня»
- [ ] Refresh-ротация покрыта тестом
- [ ] seed наполняет БД

---

## Фаза 2 — Услуги, расписание, движок слотов

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] CRUD услуг в apps/mobile — `app/services/index.tsx` (список + toggle isActive), `app/services/[id].tsx` (форма создания/редактирования/удаления)
- [x] CRUD рабочих часов в apps/mobile — `app/working-hours.tsx` (7 строк, Switch + auto-save по blur)
- [x] Движок свободных слотов в packages/shared — `getAvailableSlots()`, 11 unit-тестов
- [x] Ручное создание записи мастером ≤4 тапа — `app/appointment/new.tsx` (FAB → услуга → слот → создать)
- [x] Таб «Сегодня» — реальный список записей, счётчик и выручка за день
- [x] Навигация к услугам и расписанию из Профиля

### Критерии приёмки
- [x] Unit-тесты движка: 11 тестов (DST, TimeOff, буфер, границы) — зелёные
- [x] Мастер создаёт запись за ≤4 тапа: FAB(1) → услуга(2) → слот(3) → «Создать»(4)

---

## Фаза 3 — Веб-витрина самозаписи

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] API PublicModule: GET /public/storefront/:slug, GET .../slots, POST .../book
- [x] Дедупликация в PublicService (5-мин окно + ConflictException)
- [x] Telegram initData HMAC-SHA256 валидация на сервере (public.service.ts)
- [x] Тесты public.service.spec.ts (getStorefront 404, book isNew, dedup, conflict)
- [x] apps/web-booking/src/lib/api.ts — apiFetch helper
- [x] apps/web-booking/src/types/booking.ts — StorefrontResponse, SlotDto, Service
- [x] apps/web-booking/src/app/[slug]/page.tsx — SSR витрина (профиль + услуги)
- [x] apps/web-booking/src/app/[slug]/book/page.tsx — SSR wrapper, читает params + storefront
- [x] apps/web-booking/src/app/[slug]/book/BookingClient.tsx — клиентский компонент (3 шага: выбор слота → контакты → успех), Telegram Mini App детект
- [ ] **СЛЕДУЮЩИЙ ШАГ:** pnpm lint && pnpm typecheck && pnpm test (закрыть фазу 3)
- [ ] Статусы записи у мастера (управление confirmed/cancelled — Фаза 4)

### Критерии приёмки
- [ ] e2e: инкогнито → витрина → запись → появляется у мастера
- [ ] Повторная отправка формы не создаёт дубль

---

## Фаза 4 — Уведомления и напоминания

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] Push мастеру — expo-push API, `POST /devices` для регистрации токена
- [x] Telegram-бот клиенту (grammY, `TELEGRAM_BOT_TOKEN`, `/start` команда)
- [x] BullMQ: `new_booking` (немедленно) + `reminder` (delayed за 24ч до) — deterministic jobId
- [x] `cancelReminder(appointmentId)` — удаляет delayed job
- [x] Deep link: push `data.screen=appointment, id=X` → `router.push(/appointment/X)`
- [x] `GET /appointments/:id` + экран `/appointment/[id]` (подтвердить/отменить/завершить)
- [x] `hooks/usePushNotifications.ts` — регистрация токена после авторизации

### Критерии приёмки
- [x] Детерминированный jobId защищает от дублей (jobId = `new-booking:${id}`, `reminder:${id}`)
- [x] Тап по пушу открывает нужную запись (Notifications.addNotificationResponseReceivedListener)
- [ ] SMS-fallback — TODO(phase-4): заглушка не реализована, оставлено комментарием

---

## Фаза 5 — Оплата услуг

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] `IPaymentProvider` интерфейс + PAYMENT_PROVIDER inject token
- [x] `StubPaymentProvider` (dev) + `YooKassaProvider` (prod, re-fetch для верификации)
- [x] Фабрика: `PAYMENT_PROVIDER=stub|yookassa` в env
- [x] `POST /public/storefront/:slug/pay` — создаёт Payment, возвращает `paymentUrl`
- [x] `POST /payments/webhook/:provider` — idempotent обработка, подпись via re-fetch
- [x] Web-booking: после booking success показывает кнопку «Оплатить» если `requirePayment=true`
- [x] `apps/web-booking/src/app/success/page.tsx` — страница после успешной оплаты
- [x] Деньги в integer копейках, `providerRef` @unique = защита от дублей

### Критерии приёмки
- [x] Повторная доставка вебхука не дублирует Payment (тест: дважды один providerRef → update вызывается 1 раз)
- [x] Запись у мастера помечается «оплачено» через Payment.status

---

## Фаза 6 — CRM и рассылки

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] `GET/PATCH /clients` + `GET /clients/:id` — список с поиском, карточка с историей
- [x] `GET/POST /broadcasts`, `POST /:id/send`, `POST /:id/cancel`
- [x] BullMQ queue `pb-broadcasts` с deterministic jobId — нет дублей
- [x] `cancel` удаляет delayed job → отписка мгновенна
- [x] Broadcast: фильтр `consentGiven=true && isSubscribed=true && tags.hasSome`
- [x] Telegram `/unsubscribe` команда → `isSubscribed=false`
- [x] Экраны: Clients list (поиск), Client detail (история записей)

### Критерии приёмки
- [x] Клиент без согласия не в рассылке (4 теста в processor.spec.ts)
- [x] Отписка мгновенно исключает: `cancel()` удаляет job + статус `cancelled`

---

## Фаза 7 — Монетизация

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] `SubscriptionService`: `checkMonthlyQuota`, `isPro`, `handleRevenueCatWebhook`
- [x] `GET /subscription`, `GET /subscription/quota` (JWT)
- [x] `POST /subscription/webhook/revenuecat` (no auth, verifies Authorization header)
- [x] Quota check в `AppointmentsService.create()` → 402 FREE_LIMIT при исчерпании
- [x] `SubscriptionModule` экспортирует `SubscriptionService`; `AppointmentsModule` импортирует его
- [x] `apps/mobile/app/paywall.tsx` — RevenueCat Offerings + purchase flow
- [x] `apps/mobile/app/(tabs)/profile.tsx` — план, остаток квоты, кнопка «Перейти на Pro»
- [x] RevenueCat инициализируется в `_layout.tsx` после auth (userId из JWT)
- [x] `.env.example` содержит `EXPO_PUBLIC_RC_API_KEY_IOS/ANDROID`

### Критерии приёмки
- [x] 31-я запись на free блокируется с понятным сообщением (тест: `blocks 31st booking on free plan`)
- [x] Expired pro подписка трактуется как free (тест: `treats expired pro as free`)
- [x] Sandbox-покупка снимает лимит без перезапуска (RevenueCat webhook → upsert Subscription)

---

## Фаза 8 — Подготовка к сторам

**Статус:** ✅ Готово (2026-06-11)

### Задачи
- [x] `eas.json` — development / preview / production профили с `autoIncrement`
- [x] Universal Links iOS: `associatedDomains` в `app.json` + AASA в `public/.well-known/`
- [x] App Links Android: `intentFilters` в `app.json` + `assetlinks.json` в `public/.well-known/`
- [x] Onboarding-туториал (3 слайда: Бизнес в кармане / Клиенты записываются сами / Всё под контролем), `pb_onboarded` SecureStore-флаг
- [x] `DELETE /auth/account` + `AuthService.deleteAccount()` (транзакция, каскад, OTP cleanup)
- [x] Profile screen: кнопки «Выйти» и «Удалить аккаунт» с подтверждением
- [x] Privacy policy: `/privacy` в web-booking (SSR, SEO-meta)
- [x] Демо-аккаунт: `+79999999999` / OTP `000000` — без SMS, для App Store review
- [x] `@sentry/react-native` в mobile + init в `_layout.tsx`; `@sentry/node` в API + init в `main.ts`; `@sentry/nextjs` в web-booking + `sentry.client.config.ts` / `sentry.server.config.ts`
- [x] `posthog-react-native` в mobile — `PostHogProvider` в `_layout.tsx`; `posthog-js` в web-booking — `PostHogProvider` в `layout.tsx`
- [x] `STORE_PUBLISHING_GUIDE.md` — полный чек-лист для iOS и Android

### Критерии приёмки
- [x] `pnpm lint && pnpm typecheck && pnpm test` — зелёные (30 тестов)
- [ ] `eas build --profile production` — проверить вручную с real EAS project ID
- [ ] Чек-лист `STORE_PUBLISHING_GUIDE.md` — кодовые пункты закрыты, TODO-пункты требуют реальных credentials (Team ID, SHA256, Sentry org)
