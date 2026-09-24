/** '7:30 PM' → minutes since local midnight, or `fallback` when unparseable. */
export function parseClockTime(value: string, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})\s(AM|PM)$/.exec(value);
  if (!match) return fallback;
  const hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  return hour * 60 + minute + (match[3] === 'PM' ? 12 * 60 : 0);
}

/** Minutes since local midnight → '7:30 PM'. */
export function formatClockTime(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

export const minutesOfDay = (now: Date) => now.getHours() * 60 + now.getMinutes();
