import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import {
  AppointmentsService,
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  GetSlotsSchema,
} from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  list(@Request() req: { user: User }, @Query('date') date?: string) {
    return this.svc.listByUser(req.user.id, date);
  }

  @Get('slots')
  slots(@Request() req: { user: User }, @Query() query: unknown) {
    const dto = GetSlotsSchema.parse(query);
    return this.svc.getSlots(req.user.id, dto.serviceId, dto.date);
  }

  @Get(':id')
  findOne(@Request() req: { user: User }, @Param('id') id: string) {
    return this.svc.findOne(req.user.id, id);
  }

  @Post()
  create(@Request() req: { user: User }, @Body() body: unknown) {
    const dto = CreateAppointmentSchema.parse(body);
    return this.svc.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req: { user: User }, @Param('id') id: string, @Body() body: unknown) {
    const dto = UpdateAppointmentSchema.parse(body);
    return this.svc.update(req.user.id, id, dto);
  }
}
