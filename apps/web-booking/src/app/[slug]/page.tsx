import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { StorefrontResponse } from '@/types/booking';

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const res = await apiFetch<StorefrontResponse>(`/public/storefront/${slug}`).catch(() => null);
  if (!res) notFound();

  const { storefront, services } = res;

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {storefront.photoUrl && (
          <img
            src={storefront.photoUrl}
            alt={storefront.title}
            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        )}
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>{storefront.title}</h1>
          {storefront.description && (
            <p style={{ color: '#555', fontSize: '0.9375rem', marginTop: '0.25rem' }}>
              {storefront.description}
            </p>
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#888', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
        УСЛУГИ
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
        {services.map((svc) => (
          <div
            key={svc.id}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{svc.name}</div>
              {svc.description && (
                <div style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.125rem' }}>{svc.description}</div>
              )}
              <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '0.25rem' }}>{svc.durationMin} мин</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
              <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>
                {(svc.priceKopecks / 100).toLocaleString('ru-RU')} ₽
              </span>
              <Link
                href={`/${slug}/book?serviceId=${svc.id}`}
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Записаться
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Link
        href={`/${slug}/book`}
        style={{
          display: 'block',
          textAlign: 'center',
          background: '#6366f1',
          color: '#fff',
          padding: '0.875rem',
          borderRadius: '12px',
          fontWeight: 600,
          fontSize: '1rem',
        }}
      >
        Записаться
      </Link>
    </main>
  );
}
