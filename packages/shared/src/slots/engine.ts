import { localToUtc, getLocalDateStr } from './tz';
import type { SlotParams, Slot } from './types';

const DEFAULT_INTERVAL_MIN = 30;

/**
 * Returns all available slots for a given day.
 *
 * All date arithmetic is in UTC; `timezone` is only used to:
 *  - determine which calendar date falls on `date`
 *  - parse "HH:MM" working-hour boundaries into UTC instants
 */
export function getAvailableSlots(params: SlotParams): Slot[] {
  const {
    date,
    timezone,
    workingHours,
    durationMin,
    bufferMin,
    appointments,
    timeOffs,
    slotIntervalMin = DEFAULT_INTERVAL_MIN,
  } = params;

  if (!workingHours) return [];
  if (durationMin <= 0) return [];

  const localDateStr = getLocalDateStr(date, timezone);

  const dayStart = localToUtc(localDateStr, workingHours.startTime, timezone);
  const dayEnd = localToUtc(localDateStr, workingHours.endTime, timezone);

  // Sanity: if endTime <= startTime (e.g. overnight schedule) skip
  if (dayEnd <= dayStart) return [];

  const slotMs = slotIntervalMin * 60_000;
  const durationMs = durationMin * 60_000;
  const bufferMs = bufferMin * 60_000;

  const slots: Slot[] = [];
  let cursor = dayStart.getTime();

  while (cursor + durationMs <= dayEnd.getTime()) {
    const slotStart = cursor;
    const slotEnd = cursor + durationMs;
    const effectiveEnd = slotEnd + bufferMs; // end including buffer

    const blocked =
      appointments.some((a) => slotStart < a.endsAt.getTime() && effectiveEnd > a.startsAt.getTime()) ||
      timeOffs.some((t) => slotStart < t.endsAt.getTime() && slotEnd > t.startsAt.getTime());

    if (!blocked) {
      slots.push({ startsAt: new Date(slotStart), endsAt: new Date(slotEnd) });
    }

    cursor += slotMs;
  }

  return slots;
}
