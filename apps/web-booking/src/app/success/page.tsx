export default function SuccessPage() {
  return (
    <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>✅</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Оплата прошла!</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Запись подтверждена. Мастер свяжется с вами при необходимости.
      </p>
      <a href="/" style={{ color: '#6366f1', fontWeight: 500 }}>На главную</a>
    </main>
  );
}
