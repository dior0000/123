import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type IPaymentProvider } from './payment.provider';

const mockProvider: IPaymentProvider = {
  createPayment: jest.fn(async ({ appointmentId }) => ({
    providerRef: `ref_${appointmentId}`,
    paymentUrl: 'https://pay.example.com/checkout',
  })),
  parseWebhookPayload: jest.fn(async (rawBody: string) => {
    const body = JSON.parse(rawBody) as { providerRef?: string; status?: string };
    if (!body.providerRef) return null;
    return { providerRef: body.providerRef, status: body.status === 'paid' ? 'paid' as const : 'failed' as const };
  }),
};

const makeDb = () => {
  const payments: Array<{
    id: string;
    appointmentId: string;
    providerRef: string;
    provider: string;
    amountKopecks: number;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  let seq = 0;

  return {
    appointment: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id !== 'appt1') return null;
        return {
          id: 'appt1',
          userId: 'user1',
          service: { id: 'svc1', name: 'Маникюр', priceKopecks: 150000 },
        };
      }),
    },
    payment: {
      findUnique: jest.fn(async ({ where }: { where: { appointmentId?: string; providerRef?: string } }) => {
        if (where.appointmentId) return payments.find((p) => p.appointmentId === where.appointmentId) ?? null;
        if (where.providerRef) return payments.find((p) => p.providerRef === where.providerRef) ?? null;
        return null;
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const p = { id: `pay${++seq}`, ...data, paidAt: null, createdAt: new Date(), updatedAt: new Date() } as typeof payments[0];
        payments.push(p);
        return p;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const p = payments.find((x) => x.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      }),
    },
    _payments: payments,
  };
};

async function buildService(db: ReturnType<typeof makeDb>) {
  const mod = await Test.createTestingModule({
    providers: [
      PaymentService,
      { provide: PrismaService, useValue: db },
      { provide: PAYMENT_PROVIDER, useValue: mockProvider },
      {
        provide: ConfigService,
        useValue: { get: (key: string) => (key === 'PAYMENT_PROVIDER' ? 'stub' : 'http://localhost:3000') },
      },
    ],
  }).compile();
  return mod.get<PaymentService>(PaymentService);
}

describe('PaymentService', () => {
  let svc: PaymentService;
  let db: ReturnType<typeof makeDb>;

  beforeEach(async () => {
    db = makeDb();
    svc = await buildService(db);
    (mockProvider.createPayment as jest.Mock).mockClear();
    (db.payment.create as jest.Mock).mockClear();
    (db.payment.update as jest.Mock).mockClear();
  });

  it('creates a payment record and returns paymentUrl', async () => {
    const result = await svc.createForPublicBooking('appt1');
    expect(result.providerRef).toBe('ref_appt1');
    expect(mockProvider.createPayment).toHaveBeenCalledTimes(1);
    expect(db.payment.create).toHaveBeenCalledTimes(1);
  });

  it('idempotent: duplicate booking call returns existing payment without creating a new one', async () => {
    await svc.createForPublicBooking('appt1');
    const second = await svc.createForPublicBooking('appt1');
    expect(second.providerRef).toBe('ref_appt1');
    expect(mockProvider.createPayment).toHaveBeenCalledTimes(1); // only once
    expect(db.payment.create).toHaveBeenCalledTimes(1);
  });

  it('webhook: updates payment status to paid', async () => {
    await svc.createForPublicBooking('appt1');
    await svc.handleWebhook(JSON.stringify({ providerRef: 'ref_appt1', status: 'paid' }), {});
    const payment = db._payments[0]!;
    expect(payment.status).toBe('paid');
    expect(payment.paidAt).not.toBeNull();
    expect(db.payment.update).toHaveBeenCalledTimes(1);
  });

  it('webhook: duplicate delivery does not double-update (idempotent)', async () => {
    await svc.createForPublicBooking('appt1');
    await svc.handleWebhook(JSON.stringify({ providerRef: 'ref_appt1', status: 'paid' }), {});
    await svc.handleWebhook(JSON.stringify({ providerRef: 'ref_appt1', status: 'paid' }), {});
    expect(db.payment.update).toHaveBeenCalledTimes(1); // second call skipped (same status)
  });

  it('webhook: unknown providerRef is silently ignored', async () => {
    await svc.handleWebhook(JSON.stringify({ providerRef: 'unknown_ref', status: 'paid' }), {});
    expect(db.payment.update).not.toHaveBeenCalled();
  });
});
