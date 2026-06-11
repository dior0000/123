import { Controller, Post, Delete, Body, UseGuards, Request, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SendOtpSchema, VerifyOtpSchema, RefreshSchema } from './dto/auth.dto';
import type { User } from '@prisma/client';

interface RequestWithUser {
  user: User;
  body: { refreshToken?: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('send-otp')
  @HttpCode(200)
  async sendOtp(@Body() body: unknown): Promise<{ ok: boolean }> {
    const dto = SendOtpSchema.parse(body);
    await this.auth.sendOtp(dto.phone);
    return { ok: true };
  }

  @Post('verify-otp')
  @HttpCode(200)
  async verifyOtp(@Body() body: unknown): Promise<{ accessToken: string; refreshToken: string }> {
    const dto = VerifyOtpSchema.parse(body);
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() body: unknown): Promise<{ accessToken: string; refreshToken: string }> {
    const dto = RefreshSchema.parse(body);
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@Request() req: RequestWithUser): Promise<{ ok: boolean }> {
    const rt = req.body.refreshToken ?? '';
    await this.auth.logout(req.user.id, rt);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(200)
  async deleteAccount(@Request() req: { user: { id: string } }): Promise<{ ok: boolean }> {
    await this.auth.deleteAccount(req.user.id);
    return { ok: true };
  }
}
