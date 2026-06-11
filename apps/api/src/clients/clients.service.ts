import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const UpdateClientSchema = z.object({
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).optional(),
});
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, search?: string) {
    return this.prisma.client.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: { _count: { select: { appointments: true } } },
    });
  }

  async findOne(userId: string, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { startsAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!client || client.userId !== userId) {
      throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Клиент не найден' });
    }
    return client;
  }

  async update(userId: string, id: string, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client || client.userId !== userId) {
      throw new NotFoundException({ code: 'CLIENT_NOT_FOUND', message: 'Клиент не найден' });
    }
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async unsubscribeByTelegramId(telegramId: string): Promise<void> {
    await this.prisma.client.updateMany({
      where: { telegramId },
      data: { isSubscribed: false },
    });
  }
}
