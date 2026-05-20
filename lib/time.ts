const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function getVietnamDateParts(date: Date) {
  const shifted = new Date(date.getTime() + VIETNAM_UTC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function vietnamWallTimeToInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VIETNAM_UTC_OFFSET_MS);
}

export function parseVietnamDatetimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match.map(Number);
  const localCheck = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    localCheck.getUTCFullYear() !== year ||
    localCheck.getUTCMonth() !== month - 1 ||
    localCheck.getUTCDate() !== day ||
    localCheck.getUTCHours() !== hour ||
    localCheck.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return vietnamWallTimeToInstant(year, month, day, hour, minute);
}

