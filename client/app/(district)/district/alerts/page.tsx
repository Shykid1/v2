'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, Flag, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useEscalateJob, useDistrictAlerts } from '@/hooks/queries';
import type { Job } from '@/lib/types';
import { dateTime, ghs, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, JobStatusBadge, StatusBadge } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DistrictRegulationPage() {
  const alerts = useDistrictAlerts();
  const data = alerts.data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Regulatory queue"
        description="Service-chain breaks that need oversight: overdue approvals, SLA breaches, and critical pits."
      />

      {alerts.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : alerts.isError ? (
        <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} />
      ) : !data ? null : (
        <>
          <Section
            title="Approvals awaiting households"
            icon={<Clock className="size-4" />}
            description="Sensor-detected full pits the household has not yet approved for emptying."
            empty="No pending approvals."
          >
            {data.pendingApprovals.map((j) => (
              <JobRow key={j.id} job={j} />
            ))}
          </Section>

          <Section
            title="SLA breaches"
            icon={<ShieldAlert className="size-4" />}
            description="Jobs that passed their service deadline without completion."
            empty="No SLA breaches."
          >
            {data.slaBreaches.map((j) => (
              <JobRow key={j.id} job={j} />
            ))}
          </Section>

          <Section
            title="Critical pits"
            icon={<AlertTriangle className="size-4" />}
            description="Pits at or above 80% fill that require attention."
            empty="No critical pits."
          >
            {data.criticalPits.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{f.name ?? f.code}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{f.code}</span> · {f.household?.name ?? '—'} ·{' '}
                    {f.community ?? f.district ?? '—'}
                  </p>
                </div>
                <StatusBadge tone="destructive">
                  {f.fillPct != null ? `${f.fillPct.toFixed(0)}% full` : 'Critical'}
                </StatusBadge>
              </div>
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  description,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean) && items.length > 0;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-heading text-sm font-semibold">{title}</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      {hasItems ? (
        <div className="space-y-2.5">{children}</div>
      ) : (
        <EmptyState title={empty} />
      )}
    </section>
  );
}

function JobRow({ job }: { job: Job }) {
  const escalate = useEscalateJob();
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  function submit() {
    escalate.mutate(
      { id: job.id, note: note || undefined },
      {
        onSuccess: () => {
          toast.success('Flagged for review. Admin notified.');
          setOpen(false);
          setNote('');
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{job.pit.name ?? job.pit.code}</p>
            <JobStatusBadge status={job.status} />
            {job.overdue && <StatusBadge tone="destructive">Overdue</StatusBadge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{job.pit.code}</span> ·{' '}
            {job.household?.user.name ?? '—'} · {job.pit.community ?? job.pit.district ?? '—'} ·{' '}
            {ghs(job.priceTotal)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {job.approvalDeadline
              ? `Approval due ${dateTime(job.approvalDeadline)}`
              : `Created ${relativeTime(job.createdAt)}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <Flag /> Flag
        </Button>
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Compliance note (optional)"
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="sm" onClick={submit} disabled={escalate.isPending}>
            {escalate.isPending ? 'Submitting…' : 'Submit flag'}
          </Button>
        </div>
      )}
    </div>
  );
}
