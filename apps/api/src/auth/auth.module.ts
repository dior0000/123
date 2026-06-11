import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StubSmsProvider } from './sms/stub-sms.provider';
import { SMS_PROVIDER } from './sms/sms.provider';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets injected per-call via ConfigService
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: SMS_PROVIDER, useClass: StubSmsProvider },
  ],
  exports: [AuthService],
})
export class AuthModule {}
