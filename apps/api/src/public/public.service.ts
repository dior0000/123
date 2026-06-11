import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getAvailableSlots, getDayOfWeekInTz, getLocalDateStr } from '@pocketbiz/shared';
import { z } from 'zod';

export const PublicBookSchema = z.object({
  serviceId: z.string().cuid(),
  clientPhone: z.string().regex(/^\+7\d{10}$/, 'Формат +7XXXXXXXXXX'),
  clientName: z.string().min(1).max(100),
  startsAt: z.string().datetime(),
  consentGiven: z.boolean().refine((v) => v === true, { message: 'Необходимо согласие' }),
  telegramInitData: z.string().optional(),
});

export type PublicBookDto = z.infer<typeof PublicBookSchema>;

const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getStorefront(slug: string) {
    const storefront = await this.prisma.storefront.findUnique({
      where: { slug },
      include: { user: { select: { id: true, name: true, timezone: true } } },
    });
    if (!storefront || !storefront.isActive) {
      throw new NotFoundException({ code: 'STOREFRONT_NOT_FOUND', message: 'Витрина не найдена' });
    }
    const services = await this.prisma.service.findMany({
      where: { userId: storefront.userId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return { storefront, services };
  }

  async getPublicSlots(slug: string, serviceId: string, dateStr: string) {
    const storefront = await this.prisma.storefront.findUnique({
      where: { slug },
      include: { user: true },
    });
    if (!storefront || !storefront.isActive) {
      throw new NotFoundException({ code: 'STOREFRONT_NOT_FOUND', message: 'Витрина не найдена' });
    }

    const { user } = storefront;
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, userId: user.id, isActive: true },
    });
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Услуга не найдена' });
    }

    const date = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = getDayOfWeekInTz(date, user.timezone);
    const workingHours = await this.prisma.workingHours.findUnique({
      where: { userId_dayOfWeek: { userId: user.id, dayOfWeek } },
    });

    const localDate = getLocalDateStr(date, user.timezone);
    const dayStartUtc = new Date(`${localDate}T00:00:00Z`);
    const dayEndUtc = new Date(`${localDate}T23:59:59Z`);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId: user.id,
        status: { in: ['confirmed', 'pending'] },
        startsAt: { gte: dayStartUtc, lte: dayEndUtc },
      },
    });
    const timeOffs = await this.prisma.timeOff.findMany({
      where: { userId: user.id, startsAt: { lte: dayEndUtc }, endsAt: { gte: dayStartUtc } },
    });

    if (!workingHours) return [];

    return getAvailableSlots({
      date,
      timezone: user.timezone,
      workingHours,
      durationMin: service.durationMin,
      bufferMin: service.bufferMin,
      appointments,
      timeOffs,
    });
  }

  async book(slug: string, dto: PublicBookDto): Promise<{ appointmentId: string; isNew: boolean }> {
    const storefront = await this.prisma.storefront.findUnique({
      where: { slug },
      include: { user: true },
    });
    if (!storefront || !storefront.isActive) {
      throw new NotFoundException({ code: 'STOREFRONT_NOT_FOUND', message: 'Витрина не найдена' });
    }

    const { user } = storefront;
    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, userId: user.id, isActive: true },
    });
    if (!service) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Услуга не найдена' });
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

    // Deduplication: same master + client phone + start time → return existing
    const existing = await this.prisma.appointment.findFirst({
      where: {
        userId: user.id,
        startsAt,
        status: { in: ['pending', 'confirmed'] },
        client: { phone: dto.clientPhone },
      },
      include: { client: true },
    });
    if (existing) {
      // Check within dedup window
      if (Date.now() - existing.createdAt.getTime() < DEDUP_WINDOW_MS) {
        return { appointmentId: existing.id, isNew: false };
      }
      throw new ConflictException({
        code: 'SLOT_TAKEN',
        message: 'Это время уже занято — выберите другое',
      });
    }

    // Extract telegramId from validated initData
    let telegramId: string | undefined;
    if (dto.telegramInitData) {
      telegramId = this.extractTelegramId(dto.telegramInitData);
    }

    // Upsert client
    const client = await this.prisma.client.upsert({
      where: { userId_phone: { userId: user.id, phone: dto.clientPhone } },
      update: {
        name: dto.clientName,
        ...(telegramId ? { telegramId } : {}),
        ...(dto.consentGiven ? { consentGiven: true, consentAt: new Date() } : {}),
      },
      create: {
        userId: user.id,
        phone: dto.clientPhone,
        name: dto.clientName,
        telegramId: telegramId ?? null,
        consentGiven: dto.consentGiven,
        consentAt: dto.consentGiven ? new Date() : null,
        tags: [],
      },
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        userId: user.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: 'pending',
        source: telegramId ? 'telegram' : 'web',
      },
    });

    await this.notifications.scheduleNewBooking(appointment.id);
    await this.notifications.scheduleReminder(appointment.id, startsAt);

    return { appointmentId: appointment.id, isNew: true };
  }

  /**
   * Validates Telegram initData HMAC and returns the user's telegram_id.
   * Returns undefined if validation fails — we don't block the booking.
   */
  private extractTelegramId(initData: string): string | undefined {
    const botToken = process.env['TELEGRAM_BOT_TOKEN'];
    if (!botToken) return undefined;

    try {
      const params = new URLSearchParams(initData);
      const hash = params.get('hash');
      if (!hash) return undefined;

      params.delete('hash');
      const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

      const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
      const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (expected !== hash) return undefined;

      const userStr = params.get('user');
      if (!userStr) return undefined;
      const user = JSON.parse(userStr) as { id?: number };
      return user.id != null ? String(user.id) : undefined;
    } catch {
      return undefined;
    }
  }
}
