import { Controller, Get, Post, Param, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { BroadcastsService, CreateBroadcastSchema } from './broadcasts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly svc: BroadcastsService) {}

  @Get()
  list(@Request() req: { user: User }) {
    return this.svc.list(req.user.id);
  }

  @Post()
  create(@Request() req: { user: User }, @Body() body: unknown) {
    const dto = CreateBroadcastSchema.parse(body);
    return this.svc.create(req.user.id, dto);
  }

  @Post(':id/send')
  @HttpCode(200)
  schedule(@Request() req: { user: User }, @Param('id') id: string) {
    return this.svc.schedule(req.user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Request() req: { user: User }, @Param('id') id: string) {
    return this.svc.cancel(req.user.id, id);
  }
}
