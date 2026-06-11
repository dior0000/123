import { Controller, Get, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { WorkingHoursService, UpsertWorkingHoursSchema } from './working-hours.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(private readonly svc: WorkingHoursService) {}

  @Get()
  list(@Request() req: { user: User }) {
    return this.svc.listByUser(req.user.id);
  }

  @Put(':day')
  upsert(
    @Request() req: { user: User },
    @Param('day', ParseIntPipe) day: number,
    @Body() body: unknown,
  ) {
    const dto = UpsertWorkingHoursSchema.parse(body);
    return this.svc.upsert(req.user.id, day, dto);
  }

  @Delete(':day')
  remove(@Request() req: { user: User }, @Param('day', ParseIntPipe) day: number) {
    return this.svc.remove(req.user.id, day);
  }
}
