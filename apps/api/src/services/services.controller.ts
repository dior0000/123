import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ServicesService, CreateServiceSchema, UpdateServiceSchema } from './services.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Get()
  list(@Request() req: { user: User }) {
    return this.svc.listByUser(req.user.id);
  }

  @Post()
  create(@Request() req: { user: User }, @Body() body: unknown) {
    const dto = CreateServiceSchema.parse(body);
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req: { user: User }, @Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateServiceSchema.parse(body);
    return this.svc.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: { user: User }, @Param('id') id: string) {
    return this.svc.remove(req.user.id, id);
  }
}
