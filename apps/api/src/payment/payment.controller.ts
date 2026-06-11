import { Controller, Post, Param, Body, Headers, HttpCode, UseGuards, Request } from '@nestjs/common';
import { PaymentService, CreatePaymentSchema } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

/** Master-facing: create a payment link for an appointment */
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly svc: PaymentService) {}

  @Post()
  @HttpCode(200)
  create(@Request() req: { user: User }, @Body() body: unknown) {
    const dto = CreatePaymentSchema.parse(body);
    return this.svc.createForAppointment(req.user.id, dto);
  }

  /** Webhook from payment provider — no auth, uses rawBody string */
  @Post('webhook/:provider')
  @HttpCode(200)
  webhook(
    @Param('provider') _provider: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    return this.svc.handleWebhook(JSON.stringify(body), headers);
  }
}
