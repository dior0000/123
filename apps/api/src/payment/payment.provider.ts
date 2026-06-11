export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreatePaymentParams {
  appointmentId: string;
  amountKopecks: number;
  description: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  paymentUrl: string;
  providerRef: string;
}

export interface IPaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  /** Parse webhook body → providerRef + normalised status. Return null to silently ignore. */
  parseWebhookPayload(
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): Promise<{ providerRef: string; status: 'paid' | 'failed' } | null>;
}
