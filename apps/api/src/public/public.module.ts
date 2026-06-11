import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [NotificationsModule, PaymentModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
