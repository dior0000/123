import { z } from 'zod';

// TODO(phase-1): Full Prisma-aligned types after schema migration
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

// TODO(phase-2): SlotEngine types
// TODO(phase-3): Booking request/response schemas
// TODO(phase-5): Payment types
