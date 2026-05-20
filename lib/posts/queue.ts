import { addDays, getVietnamDateParts, vietnamWallTimeToInstant } from "@/lib/time";

// Posting window in Vietnam local time.
const QUEUE_START_HOUR = 8;  // 08:00
const QUEUE_END_HOUR = 22;   // 22:00

/**
 * Find the next available queue slot for a page.
 *
 * @param dailyLimit  - page.daily_post_limit
 * @param existingDates - scheduled_at of pending/processing jobs in the future
 * @param now         - current instant
 */
export function computeNextQueueSlot(
  dailyLimit: number,
  existingDates: Date[],
  now: Date,
): Date {
  if (dailyLimit <= 0) {
    throw new Error("Daily limit must be greater than 0.");
  }

  const slotMinutes = buildDaySlots(dailyLimit);

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    for (const minuteOfDay of slotMinutes) {
      const candidate = slotToDate(now, dayOffset, minuteOfDay);

      // Must be at least 5 minutes in the future
      if (candidate.getTime() <= now.getTime() + 5 * 60_000) continue;

      // No existing job within ±30 minutes of this slot
      const conflict = existingDates.some(
        (d) => Math.abs(d.getTime() - candidate.getTime()) < 30 * 60_000,
      );

      if (!conflict) return candidate;
    }
  }

  throw new Error("No available slot in the next 60 days.");
}

/** Evenly distribute `dailyLimit` slots across the posting window. */
function buildDaySlots(dailyLimit: number): number[] {
  const startMin = QUEUE_START_HOUR * 60;
  const endMin = QUEUE_END_HOUR * 60;
  const interval = (endMin - startMin) / dailyLimit;
  return Array.from({ length: dailyLimit }, (_, i) =>
    Math.round(startMin + i * interval),
  );
}

/**
 * Build the candidate instant for a Vietnam local date and minute-of-day.
 */
function slotToDate(now: Date, dayOffset: number, minuteOfDay: number): Date {
  const parts = getVietnamDateParts(addDays(now, dayOffset));
  return vietnamWallTimeToInstant(
    parts.year,
    parts.month,
    parts.day,
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
  );
}
