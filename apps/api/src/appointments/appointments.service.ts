import { Injectable, NotFoundException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { getAvailableSlots, getDayOfWeekInTz, getLocalDateStr } from '@pocketbiz/shared';
import { z } from 'zod';

export const CreateAppointmentSchema = z.object({
  serviceId: z.string().cuid(),
  clientPhone: z.string().regex(/^\+7\d{10}$/, 'Формат +7XXXXXXXXXX'),
  clientName: z.string().min(1).max(100),
  startsAt: z.string().datetime(), // ISO UTC string
  consentGiven: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const UpdateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  notes: z.string().max(500).optional(),
});

export const GetSlotsSchema = z.object({
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат YYYY-MM-DD'),
});

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscription: SubscriptionService,
  ) {}

  async listByUser(userId: string, dateStr?: string) {
    const where = dateStr
      ? {
          userId,
          startsAt: {
            gte: new Date(`${dateStr}T00:00:00Z`),
            lt: new Date(`${dateStr}T23:59:59Z`),
          },
        }
      : { userId };
    return this.prisma.appointment.findMany({
      where,
      include: { client: true, service: true },
      orderBy: { startsAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateAppointmentDto) {
    const quota = await this.subscription.checkMonthlyQuota(userId);
    if (!quota.allowed) {
      throw new HttpException(
        { code: 'FREE_LIMIT', message: 'Достигнут лимит 30 записей/месяц. Перейдите на Pro.' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const service = await this.prisma.service.findUnique({ where: { id: dto.serviceId } });
    if (!service || service.userId !== userId) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Услуга не найдена' });
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

    // Upsert client (create if new phone for this master)
    const client = await this.prisma.client.upsert({
      where: { userId_phone: { userId, phone: dto.clientPhone } },
      update: { name: dto.clientName },
      create: {
        userId,
        phone: dto.clientPhone,
        name: dto.clientName,
        consentGiven: dto.consentGiven,
        consentAt: dto.consentGiven ? new Date() : null,
      },
    });

    return this.prisma.appointment.create({
      data: { userId, clientId: client.id, serviceId: dto.serviceId, startsAt, endsAt, source: 'master', status: 'confirmed', notes: dto.notes },
      include: { client: true, service: true },
    });
  }

  async findOne(userId: string, id: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id },
      include: { client: true, service: true },
    });
    if (!appt) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Запись не найдена' });
    if (appt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    return appt;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto) {
    await this.assertOwns(userId, id);
    return this.prisma.appointment.update({
      where: { id },
      data: dto,
      include: { client: true, service: true },
    });
  }

  async getSlots(userId: string, serviceId: string, dateStr: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Пользователь не найден' });

    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || service.userId !== userId) {
      throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Услуга не найдена' });
    }

    const date = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = getDayOfWeekInTz(date, user.timezone);

    const workingHours = await this.prisma.workingHours.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    });

    // Fetch existing appointments for the day
    const localDate = getLocalDateStr(date, user.timezone);
    const dayStartUtc = new Date(`${localDate}T00:00:00Z`);
    const dayEndUtc = new Date(`${localDate}T23:59:59Z`);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        userId,
        status: { in: ['confirmed', 'pending'] },
        startsAt: { gte: dayStartUtc, lte: dayEndUtc },
      },
    });

    const timeOffs = await this.prisma.timeOff.findMany({
      where: {
        userId,
        startsAt: { lte: dayEndUtc },
        endsAt: { gte: dayStartUtc },
      },
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

  private async assertOwns(userId: string, id: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException({ code: 'APPOINTMENT_NOT_FOUND', message: 'Запись не найдена' });
    if (appt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
  }
}
