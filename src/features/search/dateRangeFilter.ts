export type DateSearchMode = 'month' | 'week' | 'day' | 'hours';

export interface DateSearchFilterValue {
  mode: DateSearchMode;
  start: Date;
  end: Date;
  label: string;
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

export function monthRange(year: number, month: number): DateSearchFilterValue {
  const start = startOfMonth(year, month);
  const end = startOfMonth(year, month + 1);
  return { mode: 'month', start, end, label: start.toLocaleDateString([], { month: 'long', year: 'numeric' }) };
}

export function weekSegments(year: number, month: number): Array<{ start: Date; end: Date; label: string }> {
  const monthStart = startOfMonth(year, month);
  const monthEnd = startOfMonth(year, month + 1);
  const segments: Array<{ start: Date; end: Date; label: string }> = [];
  let cursor = new Date(monthStart);
  // Monday (1) through Sunday (0), constrained to the selected month.
  while (cursor < monthEnd) {
    const day = cursor.getDay();
    const daysFromMonday = (day + 6) % 7;
    const start = new Date(cursor);
    start.setDate(start.getDate() - daysFromMonday);
    if (start < monthStart) start.setTime(monthStart.getTime());
    const end = new Date(cursor);
    end.setDate(end.getDate() + (6 - daysFromMonday) + 1);
    if (end > monthEnd) end.setTime(monthEnd.getTime());
    const label = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${new Date(end.getTime() - 1).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    if (!segments.some((segment) => segment.start.getTime() === start.getTime())) segments.push({ start, end, label });
    cursor = new Date(end);
  }
  return segments;
}

export function lastSevenDaysRange(now = new Date()): DateSearchFilterValue {
  const end = startOfDay(now);
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { mode: 'week', start, end, label: 'Last 7 Days' };
}

export function dayRange(value: Date): DateSearchFilterValue {
  const start = startOfDay(value);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { mode: 'day', start, end, label: start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) };
}

export function hoursRange(value: Date, from: string, to: string): DateSearchFilterValue | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(from) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(to)) return null;
  const [fromHour, fromMinute] = from.split(':').map(Number);
  const [toHour, toMinute] = to.split(':').map(Number);
  if (toHour * 60 + toMinute <= fromHour * 60 + fromMinute) return null;
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate(), fromHour, fromMinute);
  const end = new Date(value.getFullYear(), value.getMonth(), value.getDate(), toHour, toMinute);
  const dayLabel = value.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return { mode: 'hours', start, end, label: `${dayLabel} · ${formatTime(start)} – ${formatTime(end)}` };
}

export function matchesDateRange(timestamp: string | Date | null | undefined, range: DateSearchFilterValue | null | undefined): boolean {
  if (!range) return true;
  const value = timestamp instanceof Date ? timestamp : new Date(String(timestamp ?? ''));
  if (Number.isNaN(value.getTime())) return false;
  return value.getTime() >= range.start.getTime() && value.getTime() < range.end.getTime();
}

export function formatTime(value: Date): string {
  return value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
