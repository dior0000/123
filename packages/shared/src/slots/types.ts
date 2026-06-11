export interface WorkingHoursEntry {
  dayOfWeek: number; // 0=Sun, 1=Mon … 6=Sat
  startTime: string; // "HH:MM" in master's timezone
  endTime: string; // "HH:MM" in master's timezone
}

export interface BookedBlock {
  startsAt: Date; // UTC
  endsAt: Date; // UTC
}

export interface SlotParams {
  /** Any Date whose calendar date (in `timezone`) is the day to compute */
  date: Date;
  /** Master's IANA timezone, e.g. "Europe/Moscow" */
  timezone: string;
  /** Working hours for this day of week, or null if day-off */
  workingHours: WorkingHoursEntry | null;
  /** Service duration in minutes */
  durationMin: number;
  /** Buffer after the service ends (before next slot can start) */
  bufferMin: number;
  /** Existing confirmed/pending appointments that overlap this day */
  appointments: BookedBlock[];
  /** Time-off periods that overlap this day */
  timeOffs: BookedBlock[];
  /** Slot grid step in minutes (default 30) */
  slotIntervalMin?: number;
}

export interface Slot {
  startsAt: Date; // UTC
  endsAt: Date; // UTC
}
