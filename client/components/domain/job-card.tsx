import { cn } from '@/lib/utils';
import { ghs, relativeTime, zoneLabel } from '@/lib/format';
import type { Job } from '@/lib/types';
import { JobStatusBadge } from './badges';

/** Presentational job row used across provider + admin boards. Actions are passed in. */
export function JobCard({
  job,
  meta,
  actions,
  className,
}: {
  job: Job;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 transition-colors hover:border-foreground/15', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{job.pit.code}</span>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.pit.zone ? `${zoneLabel(job.pit.zone)} · ` : ''}
            {job.triggerSource.replace(/_/g, ' ')} · {relativeTime(job.createdAt)}
          </p>
          {meta && <div className="mt-2 text-sm text-muted-foreground">{meta}</div>}
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-semibold tabular-nums">{ghs(job.priceTotal)}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {job.paymentMethod === 'paystack' ? 'Mobile Money' : 'Cash'}
          </p>
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">{actions}</div>}
    </div>
  );
}
