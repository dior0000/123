import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const FREE_MONTHLY_LIMIT = 30;

interface RevenueCatEventPayload {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    expiration_at_ms?: number;
  };
}

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getByUser(userId: string) {
    return (
      (await this.prisma.subscription.findUnique({ where: { userId } })) ?? {
        plan: 'free',
        status: 'active',
        expiresAt: null,
      }
    );
  }

  /** Returns true if the user has an active Pro subscription */
  async isPro(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.plan === 'free') return false;
    if (sub.status !== 'active') return false;
    if (sub.expiresAt && sub.expiresAt < new Date()) return false;
    return true;
  }

  /** Returns remaining free-tier appointments this month, or null if Pro */
  async checkMonthlyQuota(userId: string): Promise<{ allowed: boolean; remaining: number | null }> {
    if (await this.isPro(userId)) return { allowed: true, remaining: null };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.appointment.count({
      where: { userId, createdAt: { gte: startOfMonth } },
    });

    const remaining = Math.max(0, FREE_MONTHLY_LIMIT - count);
    return { allowed: count < FREE_MONTHLY_LIMIT, remaining };
  }

  async handleRevenueCatWebhook(
    rawBody: string,
    authHeader: string | undefined,
  ): Promise<{ ok: boolean }> {
    const secret = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET');
    // RevenueCat sends the secret directly as Authorization header
    if (!secret || authHeader !== secret) return { ok: true };

    let payload: RevenueCatEventPayload;
    try {
      payload = JSON.parse(rawBody) as RevenueCatEventPayload;
    } catch {
      return { ok: true };
    }

    const { type, app_user_id: userId, product_id: productId, expiration_at_ms } = payload.event;
    if (!userId || !productId) return { ok: true };

    const plan = this.mapProduct(productId);
    const status = this.isActiveEvent(type) ? 'active' : 'cancelled';
    const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan, status, expiresAt },
      update: { plan, status, expiresAt },
    });

    return { ok: true };
  }

  private mapProduct(productId: string): string {
    if (productId.includes('yearly') || productId.includes('annual')) return 'pro_yearly';
    return 'pro_monthly';
  }

  private isActiveEvent(type: string): boolean {
    return ['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'].includes(type);
  }
}
