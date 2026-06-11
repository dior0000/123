import { Controller, Get, Post, Param, Query, Body, HttpCode } from '@nestjs/common';
import { z } from 'zod';
import { PublicService, PublicBookSchema } from './public.service';
import { PaymentService } from '../payment/payment.service';

const PublicPaySchema = z.object({ appointmentId: z.string().cuid() });

@Controller('public')
export class PublicController {
  constructor(
    private readonly svc: PublicService,
    private readonly payments: PaymentService,
  ) {}

  @Get('storefront/:slug')
  getStorefront(@Param('slug') slug: string) {
    return this.svc.getStorefront(slug);
  }

  @Get('storefront/:slug/slots')
  getSlots(
    @Param('slug') slug: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.svc.getPublicSlots(slug, serviceId, date);
  }

  @Post('storefront/:slug/book')
  @HttpCode(200)
  book(@Param('slug') slug: string, @Body() body: unknown) {
    const dto = PublicBookSchema.parse(body);
    return this.svc.book(slug, dto);
  }

  /** Initiate payment for an existing booking (client-side, no auth) */
  @Post('storefront/:slug/pay')
  @HttpCode(200)
  pay(@Param('slug') _slug: string, @Body() body: unknown) {
    const { appointmentId } = PublicPaySchema.parse(body);
    return this.payments.createForPublicBooking(appointmentId);
  }
}
