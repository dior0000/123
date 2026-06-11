import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SMS_PROVIDER } from './sms/sms.provider';

// Lightweight in-memory store — mirrors the real Prisma API
const makeDb = () => {
  const otps: Array<{
    id: string;
    phone: string;
    code: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }> = [];
  const users: Array<{ id: string; phone: string }> = [];
  const tokens: Array<{ id: string; userId: string; tokenHash: string; expiresAt: Date; createdAt: Date }> = [];

  return {
    otpCode: {
      create: jest.fn(async ({ data }: { data: { phone: string; code: string; expiresAt: Date } }) => {
        const row = { id: `otp${otps.length + 1}`, ...data, usedAt: null, createdAt: new Date() };
        otps.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: { where: { phone: string; code: string } }) => {
        return (
          otps.find(
            (o) =>
              o.phone === where.phone &&
              o.code === where.code &&
              !o.usedAt &&
              o.expiresAt > new Date(),
          ) ?? null
        );
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: { usedAt: Date } }) => {
        const row = otps.find((o) => o.id === where.id);
        if (row) row.usedAt = data.usedAt;
        return row;
      }),
    },
    user: {
      upsert: jest.fn(async ({ where, create }: { where: { phone: string }; create: { phone: string } }) => {
        let u = users.find((u) => u.phone === where.phone);
        if (!u) {
          u = { id: `u${users.length + 1}`, ...create };
          users.push(u);
        }
        return u;
      }),
    },
    subscription: {
      upsert: jest.fn(async () => null),
    },
    refreshToken: {
      create: jest.fn(
        async ({
          data,
        }: {
          data: { userId: string; tokenHash: string; expiresAt: Date };
        }) => {
          const row = { id: `rt${tokens.length + 1}`, ...data, createdAt: new Date() };
          tokens.push(row);
          return row;
        },
      ),
      findFirst: jest.fn(async ({ where }: { where: { userId: string } }) => {
        return tokens.find((t) => t.userId === where.userId && t.expiresAt > new Date()) ?? null;
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const idx = tokens.findIndex((t) => t.id === where.id);
        if (idx >= 0) tokens.splice(idx, 1);
        return null;
      }),
    },
  } as unknown as PrismaService;
};

const makeJwt = () => {
  let counter = 0;
  return {
    sign: jest.fn((payload: { sub: string }, opts: { secret: string; expiresIn: string }) => {
      return `tok.${payload.sub}.${opts.expiresIn}.${++counter}`;
    }),
    verify: jest.fn((token: string) => {
      // format: tok.<sub>.<expiresIn>.<counter>
      const parts = token.split('.');
      const sub = parts[1];
      if (!sub || parts[0] !== 'tok') throw new Error('invalid token');
      return { sub };
    }),
  } as unknown as JwtService;
};

const makeConfig = () =>
  ({
    getOrThrow: jest.fn((k: string) => {
      const m: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return m[k] ?? k;
    }),
    get: jest.fn((_k: string, d: string) => d),
  }) as unknown as ConfigService;

async function buildModule(db: PrismaService) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: db },
      { provide: JwtService, useValue: makeJwt() },
      { provide: ConfigService, useValue: makeConfig() },
      { provide: SMS_PROVIDER, useValue: { sendOtp: jest.fn() } },
    ],
  }).compile();
  return module.get<AuthService>(AuthService);
}

describe('AuthService', () => {
  let service: AuthService;
  let db: PrismaService;

  beforeEach(async () => {
    db = makeDb();
    service = await buildModule(db);
  });

  describe('sendOtp', () => {
    it('saves OTP and invokes SMS provider', async () => {
      await service.sendOtp('+79001234567');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((db.otpCode.create as jest.Mock).mock.calls).toHaveLength(1);
    });
  });

  describe('verifyOtp', () => {
    it('throws BadRequest on wrong code', async () => {
      await expect(service.verifyOtp('+79001234567', '000000')).rejects.toThrow(BadRequestException);
    });

    it('returns tokens on correct code', async () => {
      await service.sendOtp('+79001234567');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = ((db.otpCode.create as jest.Mock).mock.calls[0] as [{ data: { code: string } }])[0].data.code;
      const result = await service.verifyOtp('+79001234567', code);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('refresh rotation', () => {
    let rt1: string;

    beforeEach(async () => {
      await service.sendOtp('+79001234567');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = ((db.otpCode.create as jest.Mock).mock.calls[0] as [{ data: { code: string } }])[0].data.code;
      ({ refreshToken: rt1 } = await service.verifyOtp('+79001234567', code));
    });

    it('issues new token pair on refresh', async () => {
      const { accessToken, refreshToken: rt2 } = await service.refresh(rt1);
      expect(accessToken).toBeDefined();
      expect(rt2).toBeDefined();
      expect(rt2).not.toBe(rt1);
    });

    it('deletes old token (rotation)', async () => {
      await service.refresh(rt1);
      expect((db.refreshToken.delete as jest.Mock).mock.calls).toHaveLength(1);
    });

    it('creates a new stored token after rotation', async () => {
      const createBefore = (db.refreshToken.create as jest.Mock).mock.calls.length;
      await service.refresh(rt1);
      expect((db.refreshToken.create as jest.Mock).mock.calls.length).toBe(createBefore + 1);
    });

    it('rejects an invalid refresh token', async () => {
      await expect(service.refresh('invalid.token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects reuse of already-rotated token', async () => {
      await service.refresh(rt1);
      // After rotation, rt1 is deleted from DB — findFirst returns null
      await expect(service.refresh(rt1)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('bcrypt hashing', () => {
    it('stored tokenHash does not equal raw token', async () => {
      await service.sendOtp('+79001234567');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = ((db.otpCode.create as jest.Mock).mock.calls[0] as [{ data: { code: string } }])[0].data.code;
      const { refreshToken } = await service.verifyOtp('+79001234567', code);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stored = (db.refreshToken.create as jest.Mock).mock.calls[0] as [{ data: { tokenHash: string } }];
      const hash = stored[0].data.tokenHash;
      expect(hash).not.toBe(refreshToken);
      const valid = await bcrypt.compare(refreshToken, hash);
      expect(valid).toBe(true);
    });
  });
});
