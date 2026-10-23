import { tokyoDay } from './checkins';

export function isDateDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getDateDay(value: any): string {
  if (isDateDay(value?.day)) return value.day;
  if (typeof value?.time === 'string') {
    const parsed = new Date(value.time);
    if (Number.isFinite(parsed.getTime())) return tokyoDay(parsed);
  }
  return '';
}

export function daysUntilDate(day: string, now = new Date()): number {
  if (!isDateDay(day)) return 0;
  return Math.max(0, Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse(tokyoDay(now) + 'T00:00:00Z')) / 86400000));
}
