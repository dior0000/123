# Store Publishing Guide — PocketBiz

Checklist перед отправкой в App Store и Google Play.

---

## Общие (оба стора)

- [ ] `eas build --profile production --platform all` — зелёный
- [ ] Версия и build number актуальны (`autoIncrement` в `eas.json`)
- [ ] `EXPO_PUBLIC_API_URL` указывает на production API, не localhost
- [ ] `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_RC_API_KEY_IOS/ANDROID` заданы в EAS Secrets
- [ ] RevenueCat: продукты созданы в App Store Connect и Google Play Console, entitlement `pro` настроен
- [ ] Демо-аккаунт (`+79999999999` / `000000`) работает на production build
- [ ] Privacy Policy URL указывает на `https://book.pocketbiz.app/privacy`
- [ ] Onboarding проходится за один запуск, `pb_onboarded` ключ сохраняется

## App Store (iOS)

- [ ] Иконка 1024×1024 без прозрачности загружена в App Store Connect
- [ ] Скриншоты для iPhone 6.7″ и 6.1″ (минимум 3 экрана)
- [ ] Описание на русском языке заполнено
- [ ] Категория: «Бизнес» или «Производительность»
- [ ] Возрастной рейтинг: 4+ (нет контента для взрослых)
- [ ] Ссылка на политику конфиденциальности указана
- [ ] `NSCameraUsageDescription` и `NSPhotoLibraryUsageDescription` заполнены в `app.json`
- [ ] Universal Links: AASA файл доступен по `https://book.pocketbiz.app/.well-known/apple-app-site-association`
- [ ] `webcredentials` в AASA содержит правильный Team ID (заменить `TODO-TEAM-ID`)
- [ ] **Apple 3.1.3(e)**: оплата услуг клиентами проходит через веб-витрину (не IAP) — выполнено
- [ ] Подписка Pro мастера через IAP (RevenueCat) — только цифровой контент — выполнено
- [ ] Экран удаления аккаунта доступен в Настройках (Profile → Удалить аккаунт) — выполнено
- [ ] Review Notes: сообщить ревьюеру телефон `+79999999999`, OTP `000000`

## Google Play

- [ ] Иконка 512×512, feature graphic 1024×500
- [ ] Скриншоты (минимум 2, до 8)
- [ ] Краткое описание (до 80 символов) и полное описание
- [ ] Категория: «Бизнес»
- [ ] Контент-рейтинг: пройдена анкета (рейтинг «Все»)
- [ ] Ссылка на политику конфиденциальности
- [ ] App Links: `assetlinks.json` доступен по `https://book.pocketbiz.app/.well-known/assetlinks.json`
  - SHA-256 fingerprint из `eas credentials` (заменить `TODO-replace-with-sha256-fingerprint`)
- [ ] Data safety section заполнена (Personal info: имя, телефон; App activity: история записей)
- [ ] Экран удаления аккаунта и инструкция удаления данных задекларированы

## Universal Links — итоговые действия

1. В App Store Connect → Identifiers → выбрать `com.pocketbiz.app` → Associated Domains → добавить `applinks:book.pocketbiz.app`
2. Заменить `TODO-TEAM-ID` в `public/.well-known/apple-app-site-association` реальным Team ID
3. Получить SHA-256 fingerprint: `eas credentials -p android` → копировать fingerprint
4. Вставить fingerprint в `public/.well-known/assetlinks.json`
5. Задеплоить web-booking и проверить HTTPS-доступность `.well-known` файлов

## Sentry — итоговые действия

1. Создать проект `pocketbiz-mobile` в sentry.io
2. Заменить `TODO-sentry-org` / `pocketbiz-mobile` в `app.json` плагине реальными значениями
3. Добавить `EXPO_PUBLIC_SENTRY_DSN` в EAS Secrets
4. Добавить `SENTRY_DSN` (для API) и `NEXT_PUBLIC_SENTRY_DSN` (для web) в production env

## RevenueCat — итоговые действия

1. Создать аккаунт RevenueCat, добавить iOS и Android приложение
2. Создать продукты в App Store Connect и Google Play Console:
   - `pocketbiz_pro_monthly` — месячная подписка
   - `pocketbiz_pro_yearly` — годовая подписка
3. Создать Entitlement `pro` и прикрепить продукты
4. Добавить `EXPO_PUBLIC_RC_API_KEY_IOS` и `EXPO_PUBLIC_RC_API_KEY_ANDROID` в EAS Secrets
5. Настроить webhook: RevenueCat → Integrations → Webhooks → `https://api.pocketbiz.app/subscription/webhook/revenuecat`
6. Добавить `REVENUECAT_WEBHOOK_SECRET` в API env
