export const checkinNames = ['Aさん', 'Bさん'] as const;
export type CheckinName = typeof checkinNames[number];
export type Checkin = { date: string; name: CheckinName; note: string; createdAt: string };

export function tokyoDay(now = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

export function checkinKey(date: string, name: CheckinName): string {
  return `checkin:${date}:${name === 'Aさん' ? 'account-a' : 'account-b'}`;
}

export function getCheckins(data: Record<string, any>): Checkin[] {
  return Object.entries(data).filter(([key, value]) => key.startsWith('checkin:') && checkinNames.includes(value?.name) && /^\d{4}-\d{2}-\d{2}$/.test(value?.date) && key === checkinKey(value.date, value.name) && typeof value.note === 'string').map(([, value]) => value as Checkin).sort((a,b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}
