'use client';

import { cn } from '@/lib/utils';
import { fillTone, toneDot } from './status';

/** Pit fill level. Animates the fill via scaleX (no layout thrash). */
export function FillGauge({
  pct,
  className,
  showLabel = true,
}: {
  pct: number | null;
  className?: string;
  showLabel?: boolean;
}) {
  if (pct === null) {
    return (
      <div className={cn('space-y-1.5', className)}>
        {showLabel && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Fill level</span>
            <span>No sensor</span>
          </div>
        )}
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(100, pct));
  const tone = fillTone(clamped);

  return (
    <div className={cn('space-y-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Fill level</span>
          <span className="font-medium tabular-nums">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Pit fill level"
      >
        <div
          className={cn('h-full origin-left rounded-full transition-transform duration-700', toneDot[tone])}
          style={{
            transform: `scaleX(${clamped / 100})`,
            transitionTimingFunction: 'var(--ease-out-quint)',
          }}
        />
      </div>
    </div>
  );
}
