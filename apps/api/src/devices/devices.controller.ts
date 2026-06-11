import { Controller, Post, Delete, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { DevicesService, RegisterDeviceSchema } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  @Post()
  @HttpCode(200)
  register(@Request() req: { user: User }, @Body() body: unknown) {
    const dto = RegisterDeviceSchema.parse(body);
    return this.svc.register(req.user.id, dto);
  }

  @Delete(':token')
  @HttpCode(204)
  remove(@Param('token') token: string) {
    return this.svc.removeByToken(token);
  }
}
