import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — PocketBiz',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', lineHeight: '1.7', color: '#374151' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Политика конфиденциальности
      </h1>
      <p style={{ color: '#6B7280', marginBottom: '2rem' }}>Последнее обновление: 11 июня 2026 г.</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>1. Кто мы</h2>
        <p>
          PocketBiz («Бизнес в кармане») — сервис для самозанятых специалистов. Оператором персональных данных
          является владелец аккаунта-мастера (индивидуальный предприниматель или самозанятый), использующий
          платформу. Платформа выступает обработчиком данных в его интересах.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>2. Какие данные мы собираем</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Имя и номер телефона клиента — при записи на услугу.</li>
          <li>Telegram ID — если вы обращаетесь через Telegram-бота.</li>
          <li>История записей и платежей — для учёта и напоминаний.</li>
          <li>Push-токен устройства мастера — для уведомлений.</li>
          <li>Данные подписки — через RevenueCat (только для мастера).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>3. Цели обработки</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Подтверждение и напоминание о записях.</li>
          <li>Рассылки мастера — только с вашего явного согласия.</li>
          <li>Безопасность: подтверждение личности мастера через OTP.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>4. Хранение и защита</h2>
        <p>
          Данные хранятся в зашифрованных базах данных. Мы не продаём и не передаём ваши данные третьим лицам,
          кроме случаев, необходимых для оказания услуги (платёжные провайдеры, SMS-сервисы).
          Логи не содержат персональных данных.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>5. Ваши права</h2>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li>Отказ от рассылок: напишите <code>/unsubscribe</code> боту или попросите мастера.</li>
          <li>Удаление данных: обратитесь к мастеру или на <a href="mailto:privacy@pocketbiz.app">privacy@pocketbiz.app</a>.</li>
          <li>Мастер может удалить свой аккаунт и все данные в настройках приложения.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>6. Cookies и аналитика</h2>
        <p>
          Мы используем PostHog для анонимной аналитики использования. Данные агрегируются и не позволяют
          идентифицировать конкретного пользователя.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>7. Контакты</h2>
        <p>
          По вопросам обработки данных: <a href="mailto:privacy@pocketbiz.app">privacy@pocketbiz.app</a>.
        </p>
      </section>
    </main>
  );
}
