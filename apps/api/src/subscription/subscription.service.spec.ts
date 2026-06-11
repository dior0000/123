import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';

const FREE_LIMIT = 30;

function makePrisma(appointmentCount: number, subscription?: object | null) {
  return {
    subscription: {
      findUnique: jest.fn(async () => subscription ?? null),
      upsert: jest.fn(async (_args: unknown) => ({})),
    },
    appointment: {
      count: jest.fn(async () => appointmentCount),
    },
  };
}

async function buildService(prisma: ReturnType<typeof makePrisma>, secret = 'test-secret') {
  const mod = await Test.createTestingModule({
    providers: [
      SubscriptionService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: { get: () => secret } },
    ],
  }).compile();
  return mod.get<SubscriptionService>(SubscriptionService);
}

describe('SubscriptionService', () => {
  it('allows booking when count < 30 (free plan)', async () => {
    const svc = await buildService(makePrisma(29));
    const result = await svc.checkMonthlyQuota('u1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('blocks 31st booking on free plan', async () => {
    const svc = await buildService(makePrisma(FREE_LIMIT));
    const result = await svc.checkMonthlyQuota('u1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows unlimited bookings on pro plan', async () => {
    const prisma = makePrisma(999, {
      plan: 'pro_monthly',
      status: 'active',
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    const svc = await buildService(prisma);
    const result = await svc.checkMonthlyQuota('u1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeNull();
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  it('treats expired pro as free', async () => {
    const prisma = makePrisma(FREE_LIMIT, {
      plan: 'pro_monthly',
      status: 'active',
      expiresAt: new Date(Date.now() - 1000), // expired
    });
    const svc = await buildService(prisma);
    const result = await svc.checkMonthlyQuota('u1');
    expect(result.allowed).toBe(false);
  });

  it('handles RevenueCat webhook and upserts subscription', async () => {
    const prisma = makePrisma(0);
    const svc = await buildService(prisma, 'my-secret');

    const payload = {
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: 'u1',
        product_id: 'pro_monthly_v1',
        expiration_at_ms: Date.now() + 30 * 86_400_000,
      },
    };

    const result = await svc.handleRevenueCatWebhook(JSON.stringify(payload), 'my-secret');
    expect(result.ok).toBe(true);
    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        create: expect.objectContaining({ plan: 'pro_monthly', status: 'active' }),
      }),
    );
  });

  it('ignores RevenueCat webhook with wrong secret', async () => {
    const prisma = makePrisma(0);
    const svc = await buildService(prisma, 'correct-secret');

    const payload = { event: { type: 'INITIAL_PURCHASE', app_user_id: 'u1', product_id: 'pro_monthly' } };
    await svc.handleRevenueCatWebhook(JSON.stringify(payload), 'wrong-secret');
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });
});
