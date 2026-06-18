import { cn } from '@/lib/utils';
import { humanize } from '@/lib/format';
import type { JobStatus } from '@/lib/types';
import { jobStatusTone, toneClasses, verificationTone, type Tone } from './status';

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <StatusBadge tone={jobStatusTone[status]} className={className}>
      {humanize(status)}
    </StatusBadge>
  );
}

export function VerificationBadge({
  status,
  className,
}: {
  status: 'pending' | 'verified' | 'rejected';
  className?: string;
}) {
  return (
    <StatusBadge tone={verificationTone(status)} className={className}>
      {humanize(status)}
    </StatusBadge>
  );
}
