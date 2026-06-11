import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { parseRedisUrl } from '../utils/redis';

export type NotificationJobName = 'new_booking' | 'reminder' | 'cancellation';
export type NotificationJobData = { appointmentId: string };

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue<NotificationJobData> | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.queue = new Queue<NotificationJobData>('pb-notifications', {
      connection: parseRedisUrl(url),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  /** Notify master immediately when a new booking arrives */
  async scheduleNewBooking(appointmentId: string): Promise<void> {
    await this.queue?.add('new_booking', { appointmentId }, {
      jobId: `new-booking:${appointmentId}`,
    });
  }

  /** Schedule a 24-hour-before reminder for the client */
  async scheduleReminder(appointmentId: string, startsAt: Date): Promise<void> {
    const delay = startsAt.getTime() - Date.now() - 24 * 60 * 60 * 1_000;
    if (delay <= 0) return;
    await this.queue?.add('reminder', { appointmentId }, {
      jobId: `reminder:${appointmentId}`,
      delay,
    });
  }

  /** Remove a pending reminder when the appointment is cancelled */
  async cancelReminder(appointmentId: string): Promise<void> {
    const job = await this.queue?.getJob(`reminder:${appointmentId}`);
    await job?.remove();
  }
}
