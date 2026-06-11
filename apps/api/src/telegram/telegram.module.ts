import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

// PrismaModule is @Global(), so no explicit import needed here
@Module({ providers: [TelegramService], exports: [TelegramService] })
export class TelegramModule {}
