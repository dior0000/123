import { z } from 'zod';

export const AppointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const PhoneSchema = z
  .string()
  .regex(/^\+7\d{10}$/, 'Phone must be +7XXXXXXXXXX');
export type Phone = z.infer<typeof PhoneSchema>;
