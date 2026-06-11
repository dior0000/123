'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StorefrontInfo, Service, SlotDto } from '@/types/booking';

interface Props {
  slug: string;
  storefront: StorefrontInfo;
  services: Service[];
  initialServiceId: string | null;
}

type Step = 'pick' | 'contact' | 'success';

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { user?: { first_name?: string; last_name?: string } };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const todayStr = () => new Date().toISOString().slice(0, 10);

function formatPrice(kopecks: number): string {
  return `${(kopecks / 100).toLocaleString('ru-RU')} ₽`;
}

function formatTime(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: tz });
}

function formatDateLong(isoStr: string, tz: string): string {
  return new Date(isoStr).toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: tz,
  });
}

export default function BookingClient({ slug, storefront, services, initialServiceId }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId);
  const [date, setDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [tgInitData, setTgInitData] = useState<string | null>(null);

  // Detect Telegram Mini App and pre-fill name
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setTgInitData(tg.initData);
      const u = tg.initDataUnsafe?.user;
      if (u) {
        setName([u.first_name, u.last_name].filter(Boolean).join(' '));
      }
    }
  }, []);

  // Fetch slots whenever service or date changes
  const loadSlots = useCallback(() => {
    if (!serviceId || !date) return;
    setLoadingSlots(true);
    setSlots([]);
    void fetch(`${API_BASE}/public/storefront/${slug}/slots?serviceId=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((d: unknown) => {
        if (Array.isArray(d)) setSlots(d as SlotDto[]);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date, slug]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const handleBook = async () => {
    if (!selectedSlot || !serviceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        serviceId,
        clientPhone: phone,
        clientName: name,
        startsAt: selectedSlot.startsAt,
        consentGiven: consent,
      };
      if (tgInitData) body['telegramInitData'] = tgInitData;

      const res = await fetch(`${API_BASE}/public/storefront/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { appointmentId?: string; message?: string };
      if (!res.ok) {
        setSubmitError(data.message ?? 'Ошибка при записи. Попробуйте снова.');
        return;
      }
      const apptId = data.appointmentId ?? null;
      setAppointmentId(apptId);
      // If storefront requires upfront payment, create payment and redirect
      if (storefront.requirePayment && apptId) {
        const payRes = await fetch(`${API_BASE}/public/storefront/${slug}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: apptId }),
        });
        if (payRes.ok) {
          const payData = (await payRes.json()) as { paymentUrl?: string };
          if (payData.paymentUrl) {
            setPaymentUrl(payData.paymentUrl);
          }
        }
      }
      setStep('success');
    } catch {
      setSubmitError('Ошибка соединения. Проверьте интернет и попробуйте снова.');
    } finally {
      setSubmitting(false);
    }
  };

  const tz = storefront.user.timezone;
  const canSubmit = !submitting && name.trim().length > 0 && /^\+7\d{10}$/.test(phone) && consent;

  // ─── Success ────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <main style={{ maxWidth: '520px', margin: '3rem auto', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Запись создана!</h1>
        <p style={{ color: '#555', marginBottom: '0.5rem' }}>Мастер свяжется с вами для подтверждения.</p>
        {selectedService && selectedSlot && (
          <p style={{ fontSize: '0.875rem', color: '#888', marginBottom: '1.5rem' }}>
            {selectedService.name} · {formatDateLong(selectedSlot.startsAt, tz)} в {formatTime(selectedSlot.startsAt, tz)}
          </p>
        )}
        {appointmentId && (
          <p style={{ fontSize: '0.75rem', color: '#bbb', marginBottom: '1.5rem' }}>ID: {appointmentId}</p>
        )}
        {paymentUrl ? (
          <a
            href={paymentUrl}
            style={{
              display: 'block',
              background: '#6366f1',
              color: '#fff',
              padding: '0.875rem',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '1rem',
              marginBottom: '1rem',
            }}
          >
            Оплатить{selectedService ? ` ${formatPrice(selectedService.priceKopecks)}` : ''}
          </a>
        ) : null}
        <a
          href={`/${slug}`}
          style={{ display: 'inline-block', color: '#6366f1', fontWeight: 500 }}
        >
          ← Вернуться к мастеру
        </a>
      </main>
    );
  }

  // ─── Contact form ────────────────────────────────────────────────────────────
  if (step === 'contact' && selectedSlot && selectedService) {
    return (
      <main style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem' }}>
        <a href={`/${slug}`} style={{ color: '#6366f1', fontSize: '0.875rem', fontWeight: 500 }}>
          ← {storefront.title}
        </a>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.75rem 0 1.5rem' }}>Контактные данные</h1>

        {/* Selected slot summary */}
        <div style={{
          background: '#f5f3ff', border: '1px solid #c4b5fd',
          borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{selectedService.name}</div>
          <div style={{ fontSize: '0.875rem', color: '#555' }}>
            {formatDateLong(selectedSlot.startsAt, tz)} в {formatTime(selectedSlot.startsAt, tz)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6366f1', marginTop: '0.25rem' }}>
            {formatPrice(selectedService.priceKopecks)} · {selectedService.durationMin} мин
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Мария Иванова"
            autoComplete="name"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.375rem' }}>
            Телефон
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+79001234567"
            autoComplete="tel"
            style={inputStyle}
          />
          <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>Формат: +7XXXXXXXXXX</div>
        </div>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ width: '1rem', height: '1rem', marginTop: '0.125rem', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.875rem', color: '#555' }}>
            Я согласен(а) на обработку персональных данных
          </span>
        </label>

        {submitError && (
          <div style={{
            color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem',
            padding: '0.75rem', background: '#fef2f2', borderRadius: '8px',
          }}>
            {submitError}
          </div>
        )}

        <button
          onClick={() => void handleBook()}
          disabled={!canSubmit}
          style={{
            ...btnPrimary,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {submitting ? 'Отправка...' : 'Подтвердить запись'}
        </button>
        <button
          onClick={() => setStep('pick')}
          style={btnGhost}
        >
          ← Изменить время
        </button>
      </main>
    );
  }

  // ─── Pick service / date / slot ──────────────────────────────────────────────
  return (
    <main style={{ maxWidth: '520px', margin: '0 auto', padding: '1.5rem' }}>
      <a href={`/${slug}`} style={{ color: '#6366f1', fontSize: '0.875rem', fontWeight: 500 }}>
        ← {storefront.title}
      </a>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.75rem 0 1.5rem' }}>Запись</h1>

      {/* Service */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={sectionLabel}>УСЛУГА</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {services.map((svc) => {
            const selected = serviceId === svc.id;
            return (
              <button
                key={svc.id}
                onClick={() => { setServiceId(svc.id); setSelectedSlot(null); }}
                style={{
                  background: selected ? '#f5f3ff' : '#fff',
                  border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '0.875rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{svc.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '0.125rem' }}>{svc.durationMin} мин</div>
                </div>
                <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '0.9375rem' }}>
                  {formatPrice(svc.priceKopecks)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date */}
      {serviceId && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={sectionLabel}>ДАТА</div>
          <input
            type="date"
            value={date}
            min={todayStr()}
            onChange={(e) => { setDate(e.target.value); setSelectedSlot(null); }}
            style={inputStyle}
          />
        </div>
      )}

      {/* Slots */}
      {serviceId && date && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={sectionLabel}>ВРЕМЯ</div>
          {loadingSlots ? (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>Загрузка...</p>
          ) : slots.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>Нет доступных слотов на эту дату</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {slots.map((slot) => {
                const active = selectedSlot?.startsAt === slot.startsAt;
                return (
                  <button
                    key={slot.startsAt}
                    onClick={() => { setSelectedSlot(slot); setStep('contact'); }}
                    style={{
                      padding: '0.5rem 1rem',
                      border: active ? '2px solid #6366f1' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: active ? '#6366f1' : '#fff',
                      color: active ? '#fff' : '#1a1a1a',
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    {formatTime(slot.startsAt, tz)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '1rem',
  background: '#fff',
  outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.875rem',
  background: '#6366f1',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontSize: '1rem',
  fontWeight: 600,
};

const btnGhost: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.75rem',
  padding: '0.625rem',
  background: 'transparent',
  color: '#6366f1',
  border: 'none',
  fontSize: '0.875rem',
  fontWeight: 500,
};

const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#888',
  marginBottom: '0.5rem',
  letterSpacing: '0.05em',
};
