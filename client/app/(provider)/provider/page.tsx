'use client';

import Link from 'next/link';
import { Clock, MapPin, Navigation, Phone, Truck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProviderJobs, useProviderMe, useProviderJobAction } from '@/hooks/queries';
import type { Job, Provider } from '@/lib/types';
import { ghs, relativeTime, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, JobStatusBadge, StatCard } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const OFFER_STATUSES = new Set(['OFFERED', 'ASSIGNED']);
const ACTIVE_STATUSES = new Set(['ACCEPTED', 'EN_ROUTE']);
const DONE_STATUSES = new Set(['COMPLETED', 'PAID', 'PAID_CASH', 'CLOSED']);

export default function ProviderJobsPage() {
  const me = useProviderMe();
  const jobs = useProviderJobs();
  const list = jobs.data ?? [];

  const offers = list.filter((j) => OFFER_STATUSES.has(j.status)).length;
  const active = list.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
  const done = list.filter((j) => DONE_STATUSES.has(j.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Verified full-pit jobs assigned or offered to you." />

      {me.data && <ProviderStatusBanner provider={me.data} />}

      {!jobs.isLoading && list.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="New offers" value={offers} icon={<Clock className="size-4" />} />
          <StatCard label="In progress" value={active} icon={<Navigation className="size-4" />} />
          <StatCard label="Completed" value={done} icon={<Truck className="size-4" />} />
        </div>
      )}

      {jobs.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : jobs.isError ? (
        <ErrorState message={(jobs.error as Error).message} onRetry={() => jobs.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Truck className="size-5" />}
          title="No jobs right now"
          description="New offers arrive here and on WhatsApp. Keep your phone handy."
        />
      ) : (
        <div className="space-y-3">
          {list.map((job) => (
            <ProviderJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderStatusBanner({ provider }: { provider: Provider }) {
  if (provider.verificationStatus === 'pending') {
    return (
      <Banner tone="warning" icon={<Clock className="size-4" />} title="Application under review">
        Our team is reviewing your details. You will be able to accept jobs once verified.
      </Banner>
    );
  }
  if (provider.verificationStatus === 'rejected') {
    return (
      <Banner tone="destructive" icon={<XCircle className="size-4" />} title="Application not approved">
        Contact operations to resolve your application.
      </Banner>
    );
  }
  if (!provider.paystackSubaccountCode) {
    return (
      <Banner tone="warning" icon={<Clock className="size-4" />} title="Finish onboarding">
        Add your Mobile Money settlement details to receive payouts and start accepting jobs.
        <Link href="/provider/onboarding" className="mt-1 inline-block font-medium underline underline-offset-2">
          Continue onboarding
        </Link>
      </Banner>
    );
  }
  return null;
}

function Banner({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warning' | 'destructive';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const cls = tone === 'warning' ? 'bg-warning/15 text-warning-foreground' : 'bg-destructive/10 text-destructive';
  return (
    <div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${cls}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <p className="opacity-90">{children}</p>
      </div>
    </div>
  );
}

function ProviderJobCard({ job }: { job: Job }) {
  const action = useProviderJobAction();
  const navUrl =
    job.pit.lat != null && job.pit.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.pit.lat},${job.pit.lng}`
      : null;
  const phone = job.household?.user.phone;
  const pending = action.isPending;

  function act(a: 'accept' | 'decline' | 'en-route' | 'done', okMsg: string) {
    action.mutate(
      { id: job.id, action: a },
      { onSuccess: () => toast.success(okMsg), onError: (e) => toast.error((e as Error).message) },
    );
  }

  const offered = job.status === 'OFFERED' || job.status === 'ASSIGNED';

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">{job.pit.code}</span>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {job.pit.ghanaPostAddress ?? job.pit.name ?? '—'}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {zoneLabel(job.pit.zone ?? 'near')} · {relativeTime(job.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-semibold tabular-nums">{ghs(job.priceTotal)}</p>
          <p className="text-xs text-muted-foreground">
            {job.paymentMethod === 'paystack' ? 'Mobile Money' : 'Cash'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        {offered && (
          <>
            <Button className="flex-1 sm:flex-none" onClick={() => act('accept', 'Job accepted.')} disabled={pending}>
              Accept
            </Button>
            <Button variant="ghost" onClick={() => act('decline', 'Job declined.')} disabled={pending}>
              Decline
            </Button>
          </>
        )}
        {job.status === 'ACCEPTED' && (
          <Button className="flex-1 sm:flex-none" onClick={() => act('en-route', 'Marked en route.')} disabled={pending}>
            <Navigation /> Start, mark en route
          </Button>
        )}
        {job.status === 'EN_ROUTE' && (
          <Button className="flex-1 sm:flex-none" onClick={() => act('done', 'Marked done. Payment is processing.')} disabled={pending}>
            Mark done
          </Button>
        )}
        {navUrl && (
          <Button asChild variant="outline" size="icon" aria-label="Navigate to pit">
            <a href={navUrl} target="_blank" rel="noopener noreferrer">
              <Navigation />
            </a>
          </Button>
        )}
        {phone && (
          <Button asChild variant="outline" size="icon" aria-label="Call household">
            <a href={`tel:${phone}`}>
              <Phone />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
