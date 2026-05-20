import { parseVietnamDatetimeLocal } from "@/lib/time";

export function parseDatetimeLocal(value: string, timezoneOffset: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const offset = Number(timezoneOffset);

  if (!Number.isFinite(offset)) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const localTimeAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const localCheck = new Date(localTimeAsUtc);

  if (
    localCheck.getUTCFullYear() !== Number(year) ||
    localCheck.getUTCMonth() !== Number(month) - 1 ||
    localCheck.getUTCDate() !== Number(day) ||
    localCheck.getUTCHours() !== Number(hour) ||
    localCheck.getUTCMinutes() !== Number(minute)
  ) {
    return null;
  }

  const utcTime = localTimeAsUtc + offset * 60 * 1000;
  const date = new Date(utcTime);

  return date;
}

export function parseScheduleDate(value: string, timezoneOffset: string | null): Date | null {
  const vietnamDate = parseVietnamDatetimeLocal(value);
  if (vietnamDate) {
    return vietnamDate;
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  return parseDatetimeLocal(value, timezoneOffset);
}
