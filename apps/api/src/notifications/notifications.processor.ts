import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { PushService } from '../push/push.service';
import { parseRedisUrl } from '../utils/redis';
import type { NotificationJobData } from './notifications.service';

@Injectable()
export class NotificationsProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker<NotificationJobData> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly push: PushService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.worker = new Worker<NotificationJobData>(
      'pb-notifications',
      (job) => this.process(job),
      { connection: parseRedisUrl(url) },
    );
    this.worker.on('failed', (job, err) => {
      console.warn(`[NotificationsProcessor] job ${job?.id ?? '?'} failed:`, err.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name === 'new_booking') {
      await this.handleNewBooking(job.data.appointmentId);
    } else if (job.name === 'reminder') {
      await this.handleReminder(job.data.appointmentId);
    }
  }

  private async handleNewBooking(appointmentId: string): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, service: true },
    });
    if (!appt) return;

    const devices = await this.prisma.device.findMany({ where: { userId: appt.userId } });
    if (devices.length) {
      const timeStr = new Date(appt.startsAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });
      await this.push.sendToTokens(
        devices.map((d) => d.token),
        {
          title: 'Новая запись',
          body: `${appt.client.name} • ${appt.service.name} в ${timeStr}`,
          data: { screen: 'appointment', id: appointmentId },
        },
      );
    }
  }

  private async handleReminder(appointmentId: string): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { client: true, service: true },
    });
    if (!appt || appt.status === 'cancelled') return;

    const dateStr = new Date(appt.startsAt).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
    const timeStr = new Date(appt.startsAt).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    const text = `Напоминаем о записи:\n📅 ${dateStr} в ${timeStr}\n✂️ ${appt.service.name}`;

    if (appt.client.telegramId) {
      await this.telegram.sendMessage(appt.client.telegramId, text);
    }
    // TODO: SMS fallback — клиент без Telegram не получит напоминание. Нужен SmsProvider + лимиты.
  }
}
