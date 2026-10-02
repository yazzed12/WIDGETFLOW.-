import React, { useId, useMemo, useState } from 'react';
import type { DateRangePreset, TemplateUsageTrendPoint } from '../templateInsightsTypes';
import { normalizeTemplateUsageTrend } from '../templateInsightsTrend';

const CHART_WIDTH = 820;
const CHART_HEIGHT = 270;
const PLOT = { left: 58, right: 800, top: 22, bottom: 208 };
const PLOT_HEIGHT = PLOT.bottom - PLOT.top;
const PLOT_WIDTH = PLOT.right - PLOT.left;

interface PlottedPoint {
  bucketStart: string;
  label: string;
  tooltipLabel: string;
  reportsCreated: number;
  x: number;
  y: number;
}

function tickIndices(length: number): Set<number> {
  if (length <= 9) return new Set(Array.from({ length }, (_, index) => index));
  const values = new Set<number>([0, length - 1]);
  for (let index = 1; index < 8; index += 1) values.add(Math.round((index * (length - 1)) / 8));
  return values;
}

export const TemplateUsageTrendChart: React.FC<{
  title: string;
  points: TemplateUsageTrendPoint[];
  startAt: string;
  endAt: string;
  preset: DateRangePreset;
  trendBucket?: string | null;
}> = ({ title, points, startAt, endAt, preset, trendBucket }) => {
  const generatedId = useId().replaceAll(':', '');
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;
  const gradientId = `${generatedId}-area`;
  const normalized = useMemo(() => normalizeTemplateUsageTrend(points, startAt, endAt, preset, trendBucket), [points, startAt, endAt, preset, trendBucket]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maximum = Math.max(1, ...normalized.map((point) => point.reportsCreated));
  const hasActivity = normalized.some((point) => point.reportsCreated > 0);
  const plotted: PlottedPoint[] = normalized.map((point, index) => ({
    ...point,
    x: normalized.length <= 1 ? PLOT.left + PLOT_WIDTH / 2 : PLOT.left + (index / (normalized.length - 1)) * PLOT_WIDTH,
    y: PLOT.bottom - (point.reportsCreated / maximum) * PLOT_HEIGHT,
  }));
  const polyline = plotted.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = plotted.length > 0 ? `M ${plotted[0].x} ${PLOT.bottom} L ${plotted.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${plotted[plotted.length - 1].x} ${PLOT.bottom} Z` : '';
  const ticks = tickIndices(plotted.length);
  const yTicks = Array.from(new Set([maximum, Math.round(maximum / 2), 0]));
  const active = activeIndex === null ? null : plotted[activeIndex] ?? null;
  const tooltipX = active ? Math.min(88, Math.max(12, (active.x / CHART_WIDTH) * 100)) : 50;
  const tooltipY = active ? Math.max(18, (active.y / CHART_HEIGHT) * 100 - 4) : 18;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5" aria-labelledby={titleId}>
      <div className="mb-3 flex items-center gap-2"><h2 id={titleId} className="text-sm font-bold text-slate-900">{title}</h2></div>
      {!hasActivity ? <div className="flex min-h-40 items-center justify-center rounded-lg bg-slate-50 px-4 text-center text-xs text-slate-500">No Template Reports were created during this period.</div> : (
        <>
          <p id={descriptionId} className="sr-only">Line chart of Template-backed Reports created during the selected period. Focus or hover a point to read the exact bucket and count.</p>
          <div className="relative overflow-x-auto" onMouseLeave={() => setActiveIndex(null)}>
            <div className={normalized.length > 18 ? 'min-w-[700px]' : 'min-w-0'}>
              <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="block h-auto w-full overflow-visible" role="group" aria-labelledby={`${titleId} ${descriptionId}`}>
                {yTicks.map((value) => {
                  const y = PLOT.bottom - (value / maximum) * PLOT_HEIGHT;
                  return <g key={`y-${value}`} aria-hidden="true"><line x1={PLOT.left} x2={PLOT.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 5"/><text x={PLOT.left - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{value}</text></g>;
                })}
                <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} stroke="#cbd5e1" aria-hidden="true" />
                {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} aria-hidden="true"/>}
                <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.18"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0.015"/></linearGradient></defs>
                <polyline points={polyline} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" />
                {active && <line x1={active.x} x2={active.x} y1={PLOT.top} y2={PLOT.bottom} stroke="#818cf8" strokeDasharray="4 4" aria-hidden="true"/>}
                {plotted.map((point, index) => <g key={point.bucketStart} onMouseEnter={() => setActiveIndex(index)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)}>
                  <circle cx={point.x} cy={point.y} r="11" fill="transparent" tabIndex={0} role="button" aria-label={`${point.tooltipLabel}. Reports Created: ${point.reportsCreated}`} className="cursor-pointer outline-none focus-visible:stroke-indigo-300 focus-visible:stroke-2" />
                  <circle cx={point.x} cy={point.y} r={activeIndex === index ? 6 : 4} fill={activeIndex === index ? '#312e81' : '#4f46e5'} stroke="white" strokeWidth={activeIndex === index ? 2 : 1.5} pointerEvents="none" />
                  {ticks.has(index) && <text x={point.x} y={PLOT.bottom + 24} textAnchor="middle" fill="#64748b" fontSize="10" aria-hidden="true">{point.label}</text>}
                </g>)}
              </svg>
              {active && <div role="status" aria-live="polite" className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] text-white shadow-lg" style={{ left: `${tooltipX}%`, top: `${tooltipY}%` }}><div className="font-semibold">{active.tooltipLabel}</div><div className="mt-0.5 text-slate-200">Reports Created: <span className="font-bold text-white">{active.reportsCreated}</span></div></div>}
            </div>
          </div>
          <ul className="sr-only" aria-label={`${title} data values`}>{plotted.map((point) => <li key={`data-${point.bucketStart}`}>{point.tooltipLabel}: Reports Created {point.reportsCreated}</li>)}</ul>
        </>
      )}
    </section>
  );
};
