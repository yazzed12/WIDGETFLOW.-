import React, { useRef } from 'react';

interface StudioResizeHandleProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onResize: (value: number) => void;
  direction: 'left-pane' | 'right-pane';
}

export const StudioResizeHandle: React.FC<StudioResizeHandleProps> = ({
  label,
  value,
  min,
  max,
  onResize,
  direction,
}) => {
  const drag = useRef<{ pointerId: number; startX: number; startValue: number } | null>(null);
  const nextValue = (clientX: number) => {
    if (!drag.current) return;
    const delta = clientX - drag.current.startX;
    onResize(Math.min(max, Math.max(min, drag.current.startValue + (direction === 'left-pane' ? delta : -delta))));
  };

  return (
    <div
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, startX: event.clientX, startValue: value };
      }}
      onPointerMove={(event) => {
        if (drag.current?.pointerId === event.pointerId) nextValue(event.clientX);
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointerId !== event.pointerId) return;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 12;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onResize(Math.max(min, value + (direction === 'left-pane' ? -step : step)));
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onResize(Math.min(max, value + (direction === 'left-pane' ? step : -step)));
        } else if (event.key === 'Home') {
          event.preventDefault();
          onResize(min);
        } else if (event.key === 'End') {
          event.preventDefault();
          onResize(max);
        }
      }}
      className="group relative z-30 w-1.5 shrink-0 cursor-col-resize touch-none select-none bg-transparent outline-none hover:bg-indigo-400/40 focus-visible:bg-indigo-400/60 active:bg-indigo-500/70"
      style={{ userSelect: 'none' }}
      title={`${label} (drag or use arrow keys)`}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-300/70 group-hover:bg-indigo-400 group-focus-visible:bg-indigo-500" />
    </div>
  );
};
