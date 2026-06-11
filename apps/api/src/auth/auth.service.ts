import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SmsProvider, SMS_PROVIDER } from './sms/sms.provider';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LENGTH = 6;
const REFRESH_TTL_DAYS = 30;
const BCRYPT_ROUNDS = 10;

// Demo accounts for store reviewers — skip SMS, accept fixed OTP
const DEMO_ACCOUNTS: Record<string, string> = {
  '+79999999999': '000000',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async sendOtp(phone: string): Promise<void> {
    if (DEMO_ACCOUNTS[phone]) return; // demo — no SMS needed

    const code = this.generateOtp();
    await this.prisma.otpCode.create({
      data: {
        phone,
        code,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    await this.sms.sendOtp(phone, code);
  }

  async verifyOtp(phone: string, code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const demoCode = DEMO_ACCOUNTS[phone];
    if (!demoCode || code !== demoCode) {
      const otp = await this.prisma.otpCode.findFirst({
        where: {
          phone,
          code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        throw new BadRequestException({ code: 'INVALID_OTP', message: 'Неверный или истёкший код' });
      }

      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
    }

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    // Ensure subscription record exists
    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, plan: 'free', status: 'active' },
    });

    return this.issueTokens(user.id);
  }

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify<{ sub: string }>(rawRefreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH', message: 'Невалидный refresh token' });
    }

    const tokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_ROUNDS);

    // Find stored token by userId — compare hashes
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!stored) {
      throw new UnauthorizedException({ code: 'REFRESH_NOT_FOUND', message: 'Сессия истекла' });
    }

    const valid = await bcrypt.compare(rawRefreshToken, stored.tokenHash);
    if (!valid) {
      throw new UnauthorizedException({ code: 'REFRESH_NOT_FOUND', message: 'Сессия истекла' });
    }

    // Rotation: delete old, issue new
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    void tokenHash; // unused var after refactor — hash stored during issueTokens
    return this.issueTokens(payload.sub);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.otpCode.deleteMany({ where: { phone: user.phone } });
      // Payment has no cascade from Appointment — delete explicitly
      await tx.payment.deleteMany({ where: { appointment: { userId } } });
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (stored) {
      const valid = await bcrypt.compare(rawRefreshToken, stored.tokenHash);
      if (valid) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
    }
  }

  private async issueTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret = this.config.getOrThrow<string>('JWT_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');

    const accessToken = this.jwt.sign(
      { sub: userId },
      { secret: accessSecret, expiresIn: accessExpiresIn as `${number}m` },
    );
    const refreshToken = this.jwt.sign(
      { sub: userId },
      { secret: refreshSecret, expiresIn: `${REFRESH_TTL_DAYS}d` as `${number}d` },
    );

    const tokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000)).padStart(OTP_LENGTH, '0');
  }
}
