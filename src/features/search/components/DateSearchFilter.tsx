import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
} from 'lucide-react';
import {
  dayRange,
  hoursRange,
  lastSevenDaysRange,
  monthRange,
  weekSegments,
} from '../dateRangeFilter';
import type { DateSearchFilterValue, DateSearchMode } from '../dateRangeFilter';

interface DateSearchFilterProps {
  value: DateSearchFilterValue | null;
  onChange: (value: DateSearchFilterValue | null) => void;
  disabled?: boolean;
}

const modes: Array<{ key: DateSearchMode; label: string }> = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
  { key: 'hours', label: 'Hours' },
];

const monthNames = Array.from({ length: 12 }, (_, month) => new Date(2020, month, 1).toLocaleDateString([], { month: 'short' }));

function toDateInputValue(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function fromDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export const DateSearchFilter: React.FC<DateSearchFilterProps> = ({ value, onChange, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DateSearchMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [weekSelection, setWeekSelection] = useState<'last7' | number>('last7');
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('14:00');
  const [validationError, setValidationError] = useState<string | null>(null);

  const openPanel = () => {
    const source = value?.start ?? new Date();
    setMode(value?.mode ?? 'month');
    setAnchor(source);
    setWeekSelection('last7');
    setValidationError(null);
    setOpen(true);
  };

  const segments = useMemo(() => weekSegments(anchor.getFullYear(), anchor.getMonth()), [anchor]);

  const apply = () => {
    setValidationError(null);
    let next: DateSearchFilterValue | null = null;
    if (mode === 'month') next = monthRange(anchor.getFullYear(), anchor.getMonth());
    if (mode === 'week') {
      if (weekSelection === 'last7') next = lastSevenDaysRange();
      else {
        const segment = segments[weekSelection];
        if (segment) next = { mode, start: segment.start, end: segment.end, label: `Week ${weekSelection + 1} · ${segment.label}` };
      }
    }
    if (mode === 'day') next = dayRange(anchor);
    if (mode === 'hours') {
      next = hoursRange(anchor, fromTime, toTime);
      if (!next) {
        setValidationError('Choose a date and a To time later than From. Overnight ranges are not supported.');
        return;
      }
    }
    if (!next) {
      setValidationError('Choose a valid date range.');
      return;
    }
    onChange(next);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
    setValidationError(null);
  };

  const shiftMonth = (delta: number) => setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <div className="relative shrink-0">
      <button type="button" disabled={disabled} onClick={openPanel} aria-haspopup="dialog" aria-expanded={open} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${value ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300'} disabled:cursor-not-allowed disabled:opacity-50`}>
        <CalendarDays className="h-4 w-4" />
        <span>{value?.label ?? 'Date Search'}</span>
        {value && <span role="button" tabIndex={0} aria-label="Clear date filter" onClick={(event) => { event.stopPropagation(); clear(); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); clear(); } }}><X className="h-3.5 w-3.5" /></span>}
      </button>

      {open && <div role="dialog" aria-label="Date search filter" className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
          {modes.map((item) => <button type="button" key={item.key} onClick={() => { setMode(item.key); setValidationError(null); }} className={`rounded-md px-2 py-1.5 text-[11px] font-semibold ${mode === item.key ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>{item.label}</button>)}
        </div>

        {mode === 'month' && <div className="space-y-3"><div className="flex items-center justify-between"><button type="button" onClick={() => shiftMonth(-12)} aria-label="Previous year" className="rounded p-1 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button><span className="text-sm font-bold text-slate-800">{anchor.getFullYear()}</span><button type="button" onClick={() => shiftMonth(12)} aria-label="Next year" className="rounded p-1 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button></div><div className="grid grid-cols-4 gap-2">{monthNames.map((name, month) => <button type="button" key={name} onClick={() => setAnchor(new Date(anchor.getFullYear(), month, 1))} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${anchor.getMonth() === month ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-indigo-300'}`}>{name}</button>)}</div></div>}

        {mode === 'week' && <div className="space-y-2"><button type="button" onClick={() => setWeekSelection('last7')} className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold ${weekSelection === 'last7' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>Last 7 Days</button><div className="flex items-center justify-between pt-1"><button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded p-1 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-700">{anchor.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span><button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded p-1 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button></div>{segments.map((segment, index) => <button type="button" key={segment.start.toISOString()} onClick={() => setWeekSelection(index)} className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${weekSelection === index ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}><span className="font-semibold">Week {index + 1}</span><span className="ml-2 text-slate-500">{segment.label}</span></button>)}</div>}

        {(mode === 'day' || mode === 'hours') && <label className="block text-xs font-semibold text-slate-700">Date<input type="date" value={toDateInputValue(anchor)} onChange={(event) => { const next = fromDateInputValue(event.target.value); if (next) setAnchor(next); }} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" /></label>}
        {mode === 'hours' && <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-700"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />From</span><input type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" /></label><label className="text-xs font-semibold text-slate-700">To<input type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" /></label></div>}
        {validationError && <p role="alert" className="mt-3 text-[11px] font-medium text-rose-600">{validationError}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={clear} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear</button><button type="button" onClick={apply} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Apply</button></div>
      </div>}
    </div>
  );
};
