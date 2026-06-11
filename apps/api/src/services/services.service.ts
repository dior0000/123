import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(1).max(100),
  durationMin: z.number().int().min(5).max(480),
  priceKopecks: z.number().int().min(0),
  bufferMin: z.number().int().min(0).max(120).default(0),
});

export const UpdateServiceSchema = CreateServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateServiceDto = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceDto = z.infer<typeof UpdateServiceSchema>;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string) {
    return this.prisma.service.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: { ...dto, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateServiceDto) {
    await this.assertOwns(userId, id);
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertOwns(userId, id);
    // Soft-delete: set isActive=false to preserve appointment history
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }

  private async assertOwns(userId: string, id: string) {
    const svc = await this.prisma.service.findUnique({ where: { id } });
    if (!svc) throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Услуга не найдена' });
    if (svc.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
  }
}
