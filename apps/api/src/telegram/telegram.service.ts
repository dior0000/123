import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      console.info('[TelegramService] TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }
    this.bot = new Bot(token);

    this.bot.command('start', (ctx) =>
      ctx.reply('Вы подключены к PocketBiz. Будем напоминать о ваших записях!'),
    );

    this.bot.command('unsubscribe', async (ctx) => {
      const telegramId = String(ctx.from?.id);
      await this.prisma.client.updateMany({
        where: { telegramId },
        data: { isSubscribed: false },
      });
      return ctx.reply('Вы отписались от рассылок мастера. Напишите /start чтобы подписаться снова.');
    });

    this.bot.catch((err) => console.warn('[TelegramBot] error:', err));
    void this.bot.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.bot?.stop();
  }

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.api.sendMessage(chatId, text);
    } catch (err) {
      console.warn('[TelegramService] sendMessage failed:', err);
    }
  }
}
