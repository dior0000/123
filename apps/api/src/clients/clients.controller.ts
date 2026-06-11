import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ClientsService, UpdateClientSchema } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  list(@Request() req: { user: User }, @Query('search') search?: string) {
    return this.svc.list(req.user.id, search);
  }

  @Get(':id')
  findOne(@Request() req: { user: User }, @Param('id') id: string) {
    return this.svc.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req: { user: User }, @Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateClientSchema.parse(body);
    return this.svc.update(req.user.id, id, dto);
  }
}
