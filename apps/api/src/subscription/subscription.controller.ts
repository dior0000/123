import { Controller, Get, Post, Body, Headers, HttpCode, UseGuards, Request } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly svc: SubscriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getMySubscription(@Request() req: { user: User }) {
    return this.svc.getByUser(req.user.id);
  }

  @Get('quota')
  @UseGuards(JwtAuthGuard)
  getQuota(@Request() req: { user: User }) {
    return this.svc.checkMonthlyQuota(req.user.id);
  }

  @Post('webhook/revenuecat')
  @HttpCode(200)
  revenueCatWebhook(
    @Body() body: unknown,
    @Headers('authorization') auth: string | undefined,
  ) {
    return this.svc.handleRevenueCatWebhook(JSON.stringify(body), auth);
  }
}
