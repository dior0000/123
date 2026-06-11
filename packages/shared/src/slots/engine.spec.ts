import { getAvailableSlots } from './engine';
import { localToUtc } from './tz';
import type { WorkingHoursEntry, BookedBlock } from './types';

// Moscow: UTC+3, no DST — good for stable tests
const TZ_MSK = 'Europe/Moscow';
// London: has DST transitions
const TZ_LONDON = 'Europe/London';

const WH_10_20: WorkingHoursEntry = { dayOfWeek: 1, startTime: '10:00', endTime: '20:00' };

// Helper: create a BookedBlock from local time strings
function block(dateStr: string, startTime: string, endTime: string, tz = TZ_MSK): BookedBlock {
  return {
    startsAt: localToUtc(dateStr, startTime, tz),
    endsAt: localToUtc(dateStr, endTime, tz),
  };
}

// Any Monday in Moscow (no DST complications)
const MONDAY_MSK = new Date('2024-09-02T00:00:00Z'); // 2024-09-02 = Monday

describe('getAvailableSlots', () => {
  describe('basic behavior', () => {
    it('returns empty array when no working hours (day off)', () => {
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: null,
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
      });
      expect(slots).toHaveLength(0);
    });

    it('generates slots across the full working day', () => {
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      // 10:00, 11:00, ..., 19:00 → 10 slots
      expect(slots).toHaveLength(10);
      // First slot starts at 10:00 MSK = 07:00 UTC
      expect(slots[0]!.startsAt.toISOString()).toBe('2024-09-02T07:00:00.000Z');
      // Last slot starts at 19:00 MSK = 16:00 UTC, ends 20:00 = 17:00 UTC
      expect(slots[slots.length - 1]!.endsAt.toISOString()).toBe('2024-09-02T17:00:00.000Z');
    });

    it('last slot does not exceed working day end', () => {
      // 10:00–20:00, 90-min service, 60-min grid
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 90,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      for (const s of slots) {
        expect(s.endsAt.getTime()).toBeLessThanOrEqual(
          localToUtc('2024-09-02', '20:00', TZ_MSK).getTime(),
        );
      }
    });
  });

  describe('appointment overlaps', () => {
    it('removes slot overlapped by an appointment', () => {
      const appt = block('2024-09-02', '11:00', '12:00');
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 60,
        bufferMin: 0,
        appointments: [appt],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      const starts = slots.map((s) => s.startsAt.toISOString());
      // 11:00 MSK = 08:00 UTC — slot 11:00 should be gone
      expect(starts).not.toContain('2024-09-02T08:00:00.000Z');
      // 10:00 slot should remain (ends at 11:00 = exactly appt start, no overlap)
      expect(starts).toContain('2024-09-02T07:00:00.000Z');
    });

    it('respects buffer: slot ending before bufferMin before next appt is blocked', () => {
      // Appointment at 12:00, buffer 30 min → slot ending at 11:30 or later is blocked
      const appt = block('2024-09-02', '12:00', '13:00');
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 60,
        bufferMin: 30,
        appointments: [appt],
        timeOffs: [],
        slotIntervalMin: 30,
      });
      // Slot 10:30–11:30: effectiveEnd = 11:30+30min = 12:00 = appt.startsAt → NOT blocked (< not ≤)
      // Slot 11:00–12:00: effectiveEnd = 12:00+30=12:30 > appt.startsAt(12:00) AND effectiveEnd > startsAt → BLOCKED
      // Actually: blocked if slotStart < appt.endsAt AND effectiveEnd > appt.startsAt
      // Slot 11:00: effectiveEnd=12:30, appt.startsAt=12:00 → 12:30>12:00 ✓ AND 11:00<13:00 ✓ → BLOCKED
      // Slot 10:30: effectiveEnd=12:00, appt.startsAt=12:00 → 12:00>12:00 is FALSE → NOT blocked
      const blockedStart = localToUtc('2024-09-02', '11:00', TZ_MSK).toISOString();
      const okStart = localToUtc('2024-09-02', '10:30', TZ_MSK).toISOString();
      const starts = slots.map((s) => s.startsAt.toISOString());
      expect(starts).not.toContain(blockedStart);
      expect(starts).toContain(okStart);
    });

    it('handles back-to-back appointments blocking all slots', () => {
      // Fill the whole day with appointments
      const appts: BookedBlock[] = [
        block('2024-09-02', '10:00', '14:00'),
        block('2024-09-02', '14:00', '18:00'),
        block('2024-09-02', '18:00', '20:00'),
      ];
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 60,
        bufferMin: 0,
        appointments: appts,
        timeOffs: [],
        slotIntervalMin: 30,
      });
      expect(slots).toHaveLength(0);
    });
  });

  describe('TimeOff', () => {
    it('blocks slots overlapping a time-off period', () => {
      const timeOff = block('2024-09-02', '13:00', '15:00');
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: WH_10_20,
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [timeOff],
        slotIntervalMin: 60,
      });
      // Slots 13:00 and 14:00 should be blocked; 12:00 and 15:00 should be available
      const starts = slots.map((s) => s.startsAt.toISOString());
      expect(starts).not.toContain(localToUtc('2024-09-02', '13:00', TZ_MSK).toISOString());
      expect(starts).not.toContain(localToUtc('2024-09-02', '14:00', TZ_MSK).toISOString());
      expect(starts).toContain(localToUtc('2024-09-02', '12:00', TZ_MSK).toISOString());
      expect(starts).toContain(localToUtc('2024-09-02', '15:00', TZ_MSK).toISOString());
    });
  });

  describe('timezone / DST transitions', () => {
    it('Moscow (UTC+3, no DST) — slot at midnight boundary is correct', () => {
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      expect(slots).toHaveLength(1);
      // 08:00 MSK = 05:00 UTC
      expect(slots[0]!.startsAt.toISOString()).toBe('2024-09-02T05:00:00.000Z');
    });

    it('London (has DST) — spring-forward day produces correct UTC offsets', () => {
      // 2024-03-31 is the spring-forward day in London (clocks go +1 at 01:00)
      const springForwardDay = new Date('2024-03-31T12:00:00Z');
      const slots = getAvailableSlots({
        date: springForwardDay,
        timezone: TZ_LONDON,
        workingHours: { dayOfWeek: 0, startTime: '10:00', endTime: '12:00' },
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      // After spring-forward, 10:00 London = 09:00 UTC (BST = UTC+1)
      expect(slots).toHaveLength(2);
      expect(slots[0]!.startsAt.toISOString()).toBe('2024-03-31T09:00:00.000Z');
      expect(slots[1]!.startsAt.toISOString()).toBe('2024-03-31T10:00:00.000Z');
    });

    it('London — winter day uses GMT (UTC+0)', () => {
      const winterDay = new Date('2024-01-15T12:00:00Z'); // Monday, January = GMT
      const slots = getAvailableSlots({
        date: winterDay,
        timezone: TZ_LONDON,
        workingHours: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 60,
      });
      expect(slots).toHaveLength(1);
      // Winter: 10:00 London = 10:00 UTC
      expect(slots[0]!.startsAt.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('slot boundary: slot exactly ending at day end is included', () => {
      const slots = getAvailableSlots({
        date: MONDAY_MSK,
        timezone: TZ_MSK,
        workingHours: { dayOfWeek: 1, startTime: '19:00', endTime: '20:00' },
        durationMin: 60,
        bufferMin: 0,
        appointments: [],
        timeOffs: [],
        slotIntervalMin: 30,
      });
      // Only 19:00 slot fits (ends exactly at 20:00)
      expect(slots).toHaveLength(1);
      expect(slots[0]!.startsAt.toISOString()).toBe('2024-09-02T16:00:00.000Z');
    });
  });
});
