import { cn } from '@/lib/utils';
import { humanize } from '@/lib/format';
import type { JobStatus } from '@/lib/types';
import { JOB_LIFECYCLE } from './status';

/** Maps any status onto the happy-path lifecycle index. */
function lifecycleIndex(status: JobStatus): number {
  if (status === 'PAID_CASH') return JOB_LIFECYCLE.indexOf('PAID');
  if (status === 'ASSIGNED' || status === 'OFFERED') return JOB_LIFECYCLE.indexOf('CREATED');
  return JOB_LIFECYCLE.indexOf(status);
}

export function JobTimeline({ status, className }: { status: JobStatus; className?: string }) {
  const terminal = status === 'CANCELLED' || status === 'SLA_BREACHED';
  const current = lifecycleIndex(status);

  return (
    <ol className={cn('space-y-0', className)}>
      {JOB_LIFECYCLE.map((step, i) => {
        const reached = current >= 0 && i <= current;
        const isCurrent = i === current && !terminal;
        const last = i === JOB_LIFECYCLE.length - 1;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'mt-0.5 size-2.5 shrink-0 rounded-full ring-2 ring-card transition-colors',
                  reached ? 'bg-primary' : 'bg-border',
                  isCurrent && 'ring-primary/25',
                )}
              />
              {!last && (
                <span className={cn('w-px flex-1 my-0.5', reached && current > i ? 'bg-primary/40' : 'bg-border')} />
              )}
            </div>
            <span
              className={cn(
                'pb-3 text-sm leading-tight',
                isCurrent ? 'font-medium text-foreground' : reached ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {humanize(step === 'PAID' && status === 'PAID_CASH' ? 'PAID_CASH' : step)}
            </span>
          </li>
        );
      })}
      {terminal && (
        <li className="flex gap-3">
          <span className="mt-0.5 size-2.5 shrink-0 rounded-full bg-destructive ring-2 ring-card" />
          <span className="text-sm font-medium text-destructive">{humanize(status)}</span>
        </li>
      )}
    </ol>
  );
}
