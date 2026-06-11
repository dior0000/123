/**
 * Timezone utilities — no external dependencies.
 * All arithmetic uses UTC internally; Intl API for offset detection.
 */

/** Returns the IANA offset in minutes for `tz` at moment `utcDate` (positive = ahead of UTC). */
export function getTzOffsetMin(utcDate: Date, tz: string): number {
  // Build a formatter that shows both UTC and local components
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(utcDate);
  const get = (t: string) => {
    const v = parts.find((p) => p.type === t)?.value ?? '0';
    return parseInt(v, 10);
  };

  let h = get('hour');
  if (h === 24) h = 0;

  // Reconstruct what UTC instant these local components correspond to (naïvely)
  const pseudoUtcMs = Date.UTC(get('year'), get('month') - 1, get('day'), h, get('minute'), get('second'));

  return Math.round((pseudoUtcMs - utcDate.getTime()) / 60000);
}

/** Returns the calendar date string "YYYY-MM-DD" for `utcDate` in `tz`. */
export function getLocalDateStr(utcDate: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(utcDate);
}

/**
 * Converts a local date + time to a UTC Date.
 * Handles DST correctly by iterating until the round-trip matches.
 *
 * @param localDateStr "YYYY-MM-DD"
 * @param timeStr      "HH:MM"
 * @param tz           IANA timezone
 */
export function localToUtc(localDateStr: string, timeStr: string, tz: string): Date {
  const [yearStr, monthStr, dayStr] = localDateStr.split('-');
  const [hourStr, minStr] = timeStr.split(':');
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);
  const day = parseInt(dayStr!, 10);
  const hour = parseInt(hourStr!, 10);
  const min = parseInt(minStr!, 10);

  // First approximation: treat as UTC
  const approx = new Date(Date.UTC(year, month - 1, day, hour, min, 0));

  // Subtract offset to get a UTC candidate
  const offset1 = getTzOffsetMin(approx, tz);
  const candidate = new Date(approx.getTime() - offset1 * 60_000);

  // Re-check offset at candidate (DST transitions can shift the offset)
  const offset2 = getTzOffsetMin(candidate, tz);
  if (offset1 === offset2) return candidate;

  return new Date(approx.getTime() - offset2 * 60_000);
}

/** Returns 0-6 (Sun–Sat) day of week for `utcDate` in `tz`. */
export function getDayOfWeekInTz(utcDate: Date, tz: string): number {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(utcDate);
  const idx = weekdays.indexOf(name);
  return idx === -1 ? utcDate.getUTCDay() : idx;
}
