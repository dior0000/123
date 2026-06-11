import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IPaymentProvider, CreatePaymentParams, CreatePaymentResult } from '../payment.provider';

const API_URL = 'https://api.yookassa.ru/v3';

@Injectable()
export class YooKassaProvider implements IPaymentProvider {
  private readonly shopId: string;
  private readonly secretKey: string;

  constructor(config: ConfigService) {
    this.shopId = config.get<string>('YOOKASSA_SHOP_ID') ?? '';
    this.secretKey = config.get<string>('YOOKASSA_SECRET_KEY') ?? '';
  }

  private get auth(): string {
    return `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const body = {
      amount: { value: (params.amountKopecks / 100).toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description,
      metadata: { appointmentId: params.appointmentId },
      capture: true,
    };
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': params.appointmentId, // deterministic — safe to retry
        Authorization: this.auth,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { description?: string };
      throw new Error(`YooKassa: ${err.description ?? res.status}`);
    }
    const data = (await res.json()) as {
      id: string;
      confirmation: { confirmation_url: string };
    };
    return { providerRef: data.id, paymentUrl: data.confirmation.confirmation_url };
  }

  async parseWebhookPayload(
    rawBody: string,
  ): Promise<{ providerRef: string; status: 'paid' | 'failed' } | null> {
    try {
      const body = JSON.parse(rawBody) as { object?: { id?: string } };
      const paymentId = body.object?.id;
      if (!paymentId) return null;

      // Re-fetch from YooKassa to verify authenticity (no HMAC in YooKassa webhooks)
      const res = await fetch(`${API_URL}/payments/${paymentId}`, {
        headers: { Authorization: this.auth },
      });
      if (!res.ok) return null;

      const payment = (await res.json()) as { id: string; status: string };
      return {
        providerRef: payment.id,
        status: payment.status === 'succeeded' ? 'paid' : 'failed',
      };
    } catch {
      return null;
    }
  }
}
