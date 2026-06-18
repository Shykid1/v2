'use client';

import { useState } from 'react';
import { CloudRain, Radio } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAdminJobAction,
  useAdminJobs,
  useProviders,
  useReportSummary,
  useRunClimate,
  useSettings,
  useUpdateSetting,
} from '@/hooks/queries';
import type { Job, Provider } from '@/lib/types';
import { ghs, humanize, relativeTime } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, JobStatusBadge, StatCard } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AdminDispatchPage() {
  const report = useReportSummary();
  const jobs = useAdminJobs();
  const providers = useProviders();
  const settings = useSettings();
  const updateSetting = useUpdateSetting();
  const runClimate = useRunClimate();

  const verified = (providers.data ?? []).filter((p) => p.verificationStatus === 'verified');
  const dispatchMode = String(settings.data?.['dispatch.mode'] ?? 'assisted');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dispatch"
        description="The job chain, end to end. Surfaced nearest provider, one tap to offer."
      />

      {/* KPIs */}
      {report.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : report.data ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Households" value={report.data.coverage.households} />
          <StatCard
            label="Sensored pits"
            value={`${report.data.coverage.sensoredPits}/${report.data.coverage.totalPits}`}
            sub={`${report.data.coverage.sensoredPct}%`}
          />
          <StatCard
            label="Jobs completed"
            value={`${report.data.operations.jobsCompleted}/${report.data.operations.jobsTotal}`}
            sub={`${report.data.operations.completionRatePct}%`}
          />
          <StatCard label="Flood pre-emptive" value={report.data.operations.floodPreemptiveJobs} />
        </div>
      ) : null}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Dispatch mode</span>
          <Select
            value={dispatchMode}
            onValueChange={(v) =>
              updateSetting.mutate(
                { key: 'dispatch.mode', value: v },
                {
                  onSuccess: () => toast.success(`Dispatch mode set to ${v}.`),
                  onError: (e) => toast.error((e as Error).message),
                },
              )
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assisted">Assisted (Phase 0)</SelectItem>
              <SelectItem value="auto">Auto + broadcast (Phase 1)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={() =>
              runClimate.mutate(true, {
                onSuccess: () => toast.success('Climate poll run. Flood window forced.'),
                onError: (e) => toast.error((e as Error).message),
              })
            }
            disabled={runClimate.isPending}
          >
            <CloudRain /> Run climate poll
          </Button>
        </div>
      </div>

      {/* Job chain */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Job chain
          </h2>
          {(() => {
            const pending = (jobs.data ?? []).filter(
              (j) => j.status === 'PENDING_APPROVAL',
            ).length;
            return pending > 0 ? (
              <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning-foreground">
                {pending} awaiting household approval
              </span>
            ) : null;
          })()}
        </div>
        {jobs.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : jobs.isError ? (
          <ErrorState message={(jobs.error as Error).message} onRetry={() => jobs.refetch()} />
        ) : (jobs.data ?? []).length === 0 ? (
          <EmptyState icon={<Radio className="size-5" />} title="No jobs in the chain" description="Triggered jobs will appear here for dispatch." />
        ) : (
          <div className="space-y-2.5">
            {(jobs.data ?? []).map((job) => (
              <AdminJobRow key={job.id} job={job} verified={verified} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminJobRow({ job, verified }: { job: Job; verified: Provider[] }) {
  const action = useAdminJobAction();
  const [offerTo, setOfferTo] = useState('');
  const pending = action.isPending;

  function run(kind: Parameters<typeof action.mutate>[0]['action'], ok: string) {
    action.mutate(
      { id: job.id, action: kind },
      { onSuccess: () => toast.success(ok), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{job.pit.code}</span>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {humanize(job.triggerSource)} · {job.household?.user.name ?? 'guest'} ·{' '}
            {job.provider?.businessName ?? 'unassigned'} · {relativeTime(job.createdAt)}
          </p>
        </div>
        <span className="font-heading text-sm font-semibold tabular-nums">{ghs(job.priceTotal)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
        {job.status === 'PENDING_APPROVAL' && (
          <span className="text-xs text-muted-foreground">
            Awaiting household approval before dispatch
            {job.overdue ? ' · overdue' : ''}
          </span>
        )}
        {job.status === 'CREATED' && (
          <>
            <Select value={offerTo} onValueChange={setOfferTo}>
              <SelectTrigger className="h-8 w-48" size="sm">
                <SelectValue placeholder="Offer to provider…" />
              </SelectTrigger>
              <SelectContent>
                {verified.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No verified providers
                  </SelectItem>
                ) : (
                  verified.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.businessName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!offerTo || pending}
              onClick={() => run({ kind: 'offer', providerId: offerTo }, 'Offered to provider.')}
            >
              Offer
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ kind: 'auto-assign' }, 'Auto-assigned nearest provider.')}>
              Auto-assign
            </Button>
          </>
        )}
        {(job.status === 'OFFERED' || job.status === 'ASSIGNED') && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run({ kind: 'broadcast' }, 'Broadcast to eligible providers.')}>
            Broadcast
          </Button>
        )}
        {(job.status === 'PAID' || job.status === 'PAID_CASH') && (
          <Button size="sm" disabled={pending} onClick={() => run({ kind: 'close' }, 'Job closed.')}>
            Close job
          </Button>
        )}
        {!['CLOSED', 'CANCELLED', 'PAID', 'PAID_CASH'].includes(job.status) && (
          <Button size="sm" variant="ghost" className="ml-auto text-destructive" disabled={pending} onClick={() => run({ kind: 'cancel' }, 'Job cancelled.')}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
