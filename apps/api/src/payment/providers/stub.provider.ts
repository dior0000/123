import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IPaymentProvider, CreatePaymentParams, CreatePaymentResult } from '../payment.provider';

@Injectable()
export class StubPaymentProvider implements IPaymentProvider {
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const providerRef = `stub_${randomUUID()}`;
    console.info(`[StubPaymentProvider] payment created: ${providerRef}, ${params.amountKopecks} kopecks`);
    return {
      providerRef,
      paymentUrl: `${params.returnUrl}?stub_paid=1&ref=${providerRef}`,
    };
  }

  async parseWebhookPayload(
    rawBody: string,
  ): Promise<{ providerRef: string; status: 'paid' | 'failed' } | null> {
    try {
      const body = JSON.parse(rawBody) as {
        object?: { id?: string; status?: string };
      };
      const ref = body.object?.id;
      const status = body.object?.status;
      if (!ref || !status) return null;
      return { providerRef: ref, status: status === 'succeeded' ? 'paid' : 'failed' };
    } catch {
      return null;
    }
  }
}
