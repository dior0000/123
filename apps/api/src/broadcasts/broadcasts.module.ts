import { Module } from '@nestjs/common';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsProcessor } from './broadcasts.processor';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsProcessor],
})
export class BroadcastsModule {}
