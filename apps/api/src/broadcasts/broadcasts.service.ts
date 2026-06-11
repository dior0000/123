import { Injectable, BadRequestException, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { parseRedisUrl } from '../utils/redis';

export const CreateBroadcastSchema = z.object({
  text: z.string().min(1).max(2000),
  tags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateBroadcastDto = z.infer<typeof CreateBroadcastSchema>;

@Injectable()
export class BroadcastsService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.queue = new Queue('pb-broadcasts', {
      connection: parseRedisUrl(url),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async list(userId: string) {
    return this.prisma.broadcast.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateBroadcastDto) {
    return this.prisma.broadcast.create({
      data: {
        userId,
        text: dto.text,
        tags: dto.tags,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: 'draft',
      },
    });
  }

  async schedule(userId: string, broadcastId: string) {
    const broadcast = await this.assertOwns(userId, broadcastId);
    if (broadcast.status !== 'draft') {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Рассылка уже запланирована или отправлена' });
    }

    const delay = broadcast.scheduledAt
      ? Math.max(0, broadcast.scheduledAt.getTime() - Date.now())
      : 0;

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'scheduled' },
    });

    await this.queue?.add(
      'send',
      { broadcastId },
      { jobId: `broadcast:${broadcastId}`, delay },
    );

    return { broadcastId, scheduledAt: broadcast.scheduledAt, delay };
  }

  async cancel(userId: string, broadcastId: string) {
    const broadcast = await this.assertOwns(userId, broadcastId);
    if (!['draft', 'scheduled'].includes(broadcast.status)) {
      throw new BadRequestException({ code: 'CANNOT_CANCEL', message: 'Рассылку нельзя отменить' });
    }
    // Remove the queued job
    const job = await this.queue?.getJob(`broadcast:${broadcastId}`);
    await job?.remove();

    return this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: 'cancelled' },
    });
  }

  private async assertOwns(userId: string, id: string) {
    const broadcast = await this.prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) throw new NotFoundException({ code: 'BROADCAST_NOT_FOUND', message: 'Рассылка не найдена' });
    if (broadcast.userId !== userId) throw new NotFoundException({ code: 'BROADCAST_NOT_FOUND', message: 'Рассылка не найдена' });
    return broadcast;
  }
}
