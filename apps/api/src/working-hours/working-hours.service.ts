import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

export const UpsertWorkingHoursSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Формат HH:MM'),
});

export type UpsertWorkingHoursDto = z.infer<typeof UpsertWorkingHoursSchema>;

@Injectable()
export class WorkingHoursService {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string) {
    return this.prisma.workingHours.findMany({
      where: { userId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  upsert(userId: string, dayOfWeek: number, dto: UpsertWorkingHoursDto) {
    return this.prisma.workingHours.upsert({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
      update: dto,
      create: { userId, dayOfWeek, ...dto },
    });
  }

  async remove(userId: string, dayOfWeek: number) {
    const wh = await this.prisma.workingHours.findUnique({
      where: { userId_dayOfWeek: { userId, dayOfWeek } },
    });
    if (!wh) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Рабочие часы не найдены' });
    if (wh.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Нет доступа' });
    return this.prisma.workingHours.delete({ where: { userId_dayOfWeek: { userId, dayOfWeek } } });
  }
}
