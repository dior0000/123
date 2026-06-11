import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { TelegramModule } from '../telegram/telegram.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TelegramModule, PushModule],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
