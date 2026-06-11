import { z } from 'zod';

export const SendOtpSchema = z.object({
  phone: z.string().regex(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX'),
});
export type SendOtpDto = z.infer<typeof SendOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^\+7\d{10}$/),
  code: z.string().length(6),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshSchema>;
