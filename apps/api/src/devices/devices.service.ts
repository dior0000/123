import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

export const RegisterDeviceSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});
export type RegisterDeviceDto = z.infer<typeof RegisterDeviceSchema>;

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.device.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });
  }

  async removeByToken(token: string): Promise<void> {
    await this.prisma.device.deleteMany({ where: { token } });
  }
}
