import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { type PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, type IPaymentProvider } from './payment.provider';

export const CreatePaymentSchema = z.object({
  appointmentId: z.string().cuid(),
});
export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: IPaymentProvider,
  ) {}

  async createForAppointment(masterId: string, dto: CreatePaymentDto) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { service: true },
    });
    if (!appt || appt.userId !== masterId) {
      throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Запись не найдена' });
    }

    // Idempotent: return existing payment if already created
    const existing = await this.prisma.payment.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) return existing;

    const bookingUrl = this.config.get<string>('BOOKING_RETURN_URL') ?? 'http://localhost:3000';
    const result = await this.provider.createPayment({
      appointmentId: dto.appointmentId,
      amountKopecks: appt.service.priceKopecks,
      description: appt.service.name,
      returnUrl: `${bookingUrl}/success`,
    });

    return this.prisma.payment.create({
      data: {
        appointmentId: dto.appointmentId,
        providerRef: result.providerRef,
        provider: this.config.get<string>('PAYMENT_PROVIDER') ?? 'stub',
        amountKopecks: appt.service.priceKopecks,
        status: 'pending',
      },
    });
  }

  /** Called from public booking page — no master auth */
  async createForPublicBooking(appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });
    if (!appt) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Запись не найдена' });

    const existing = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (existing) return existing;

    const bookingUrl = this.config.get<string>('BOOKING_RETURN_URL') ?? 'http://localhost:3000';
    const result = await this.provider.createPayment({
      appointmentId,
      amountKopecks: appt.service.priceKopecks,
      description: appt.service.name,
      returnUrl: `${bookingUrl}/success`,
    });

    return this.prisma.payment.create({
      data: {
        appointmentId,
        providerRef: result.providerRef,
        provider: this.config.get<string>('PAYMENT_PROVIDER') ?? 'stub',
        amountKopecks: appt.service.priceKopecks,
        status: 'pending',
      },
    });
  }

  async handleWebhook(rawBody: string, headers: Record<string, string | undefined>) {
    const parsed = await this.provider.parseWebhookPayload(rawBody, headers);
    if (!parsed) return { ok: true };

    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: parsed.providerRef },
    });
    if (!payment || payment.status === parsed.status) return { ok: true }; // idempotent

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: parsed.status as PaymentStatus,
        paidAt: parsed.status === 'paid' ? new Date() : null,
      },
    });

    return { ok: true };
  }
}
