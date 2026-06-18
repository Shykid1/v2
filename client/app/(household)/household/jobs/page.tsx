'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useApproveJob, useDeclineApproval, useHouseholdJobs } from '@/hooks/queries';
import type { Job } from '@/lib/types';
import { dateTime, ghs, humanize, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, JobStatusBadge, JobTimeline } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function HouseholdJobsPage() {
  const jobs = useHouseholdJobs();
  const approve = useApproveJob();
  const decline = useDeclineApproval();
  const [active, setActive] = useState<Job | null>(null);
  const list = jobs.data ?? [];

  function approveActive() {
    if (!active) return;
    approve.mutate(active.id, {
      onSuccess: () => {
        toast.success('Approved. We are summoning an operator now.');
        setActive(null);
      },
      onError: (e) => toast.error((e as Error).message),
    });
  }

  function declineActive() {
    if (!active) return;
    decline.mutate(
      { id: active.id },
      {
        onSuccess: () => {
          toast.success('Request declined.');
          setActive(null);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Every emptying request and where it stands." />

      {jobs.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : jobs.isError ? (
        <ErrorState message={(jobs.error as Error).message} onRetry={() => jobs.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-5" />}
          title="No jobs yet"
          description="When you request emptying, it will appear here with live status."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <ul className="divide-y">
            {list.map((job) => (
              <li key={job.id}>
                <button
                  onClick={() => setActive(job)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{job.pit.code}</span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {job.provider?.businessName ?? 'Assigning provider'} · {dateTime(job.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 font-heading text-sm font-semibold tabular-nums">
                    {ghs(job.priceTotal)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono">{active.pit.code}</span>
                  <JobStatusBadge status={active.status} />
                </SheetTitle>
                <SheetDescription>
                  {zoneLabel(active.pit.zone ?? 'near')} · {humanize(active.triggerSource)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 overflow-y-auto px-4 pb-6">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Price" value={ghs(active.priceTotal)} />
                  <Detail
                    label="Payment"
                    value={active.paymentMethod === 'paystack' ? 'Mobile Money' : 'Cash'}
                  />
                  <Detail label="Provider" value={active.provider?.businessName ?? '—'} />
                  <Detail label="Requested" value={dateTime(active.createdAt)} />
                </dl>
                {active.status === 'PENDING_APPROVAL' && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                    <p className="text-sm font-medium text-warning-foreground">
                      Awaiting your approval
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Approve to summon an operator — prepare access and {ghs(active.priceTotal)}{' '}
                      before they arrive.
                      {active.approvalDeadline
                        ? ` Please respond by ${dateTime(active.approvalDeadline)}.`
                        : ''}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" onClick={approveActive} disabled={approve.isPending}>
                        {approve.isPending ? 'Approving…' : 'Approve & summon'}
                      </Button>
                      <Button variant="outline" onClick={declineActive} disabled={decline.isPending}>
                        Decline
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Progress
                  </p>
                  <JobTimeline status={active.status} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
