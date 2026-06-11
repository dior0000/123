import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { parseRedisUrl } from '../utils/redis';

@Injectable()
export class BroadcastsProcessor implements OnModuleInit, OnModuleDestroy {
  private worker: Worker | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.worker = new Worker(
      'pb-broadcasts',
      (job) => this.process(job),
      { connection: parseRedisUrl(url) },
    );
    this.worker.on('failed', (job, err) => {
      console.warn(`[BroadcastsProcessor] job ${job?.id ?? '?'} failed:`, err.message);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<{ broadcastId: string }>): Promise<void> {
    const { broadcastId } = job.data;
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
    });
    if (!broadcast || broadcast.status === 'sent' || broadcast.status === 'cancelled') return;

    await this.prisma.broadcast.update({ where: { id: broadcastId }, data: { status: 'sending' } });

    // Find eligible clients: consent given + subscribed + tag filter
    const clients = await this.prisma.client.findMany({
      where: {
        userId: broadcast.userId,
        consentGiven: true,
        isSubscribed: true,
        ...(broadcast.tags.length > 0 ? { tags: { hasSome: broadcast.tags } } : {}),
      },
    });

    const unsubscribeNote = '\n\n—\nЧтобы отписаться, напишите /unsubscribe';

    for (const client of clients) {
      if (client.telegramId) {
        await this.telegram.sendMessage(client.telegramId, broadcast.text + unsubscribeNote);
      }
      // TODO: SMS fallback — клиент без Telegram не получит рассылку. Нужен SmsProvider + лимиты.
    }

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'sent', sentAt: new Date() },
    });
  }
}
