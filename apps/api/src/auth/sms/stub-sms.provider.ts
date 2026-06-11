import { Injectable } from '@nestjs/common';
import { SmsProvider } from './sms.provider';

@Injectable()
export class StubSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    // Stub: prints OTP to logs — never use in production
    console.info(`[SMS STUB] phone=${phone} code=${code}`);
  }
}
