'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useProviderDecision, useProviders } from '@/hooks/queries';
import type { Provider } from '@/lib/types';
import { ghs, humanize, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, VerificationBadge, StatusBadge } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Filter = 'all' | 'pending' | 'verified' | 'rejected';

export default function AdminProvidersPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const providers = useProviders(filter === 'all' ? undefined : filter);
  const list = providers.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Providers" description="Verify applicants and manage the provider roster." />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {providers.isLoading ? (
        <Skeleton className="h-80" />
      ) : providers.isError ? (
        <ErrorState message={(providers.error as Error).message} onRetry={() => providers.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="No providers here" description="Nothing matches this filter yet." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Business</th>
                  <th className="px-4 py-2.5 font-medium">Phone</th>
                  <th className="px-4 py-2.5 font-medium">Coverage</th>
                  <th className="px-4 py-2.5 font-medium">KYC</th>
                  <th className="px-4 py-2.5 font-medium">Verification</th>
                  <th className="px-4 py-2.5 font-medium text-right">Owes</th>
                  <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((p) => (
                  <ProviderTableRow key={p.id} provider={p} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {list.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function useDecision(provider: Provider) {
  const decide = useProviderDecision();
  function act(decision: 'verify' | 'reject', ok: string) {
    decide.mutate(
      { id: provider.id, decision },
      { onSuccess: () => toast.success(ok), onError: (e) => toast.error((e as Error).message) },
    );
  }
  return { act, pending: decide.isPending };
}

function ProviderTableRow({ provider }: { provider: Provider }) {
  const { act, pending } = useDecision(provider);
  const zones = provider.coverageZones.length
    ? provider.coverageZones.map(zoneLabel).join(', ')
    : '—';

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-3">
        <Link href={`/admin/providers/${provider.id}`} className="group inline-flex items-center gap-1.5 font-medium hover:underline">
          {provider.businessName}
          <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{provider.user?.phone ?? '—'}</td>
      <td className="px-4 py-3 text-muted-foreground">{zones}</td>
      <td className="px-4 py-3">
        <StatusBadge tone={provider.paystackSubaccountCode ? 'success' : 'neutral'}>
          {provider.paystackSubaccountCode ? 'active' : humanize(provider.kycStatus)}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <VerificationBadge status={provider.verificationStatus} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{ghs(provider.ledgerBalance)}</td>
      <td className="px-4 py-3 text-right">
        {provider.verificationStatus === 'pending' ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" disabled={pending} onClick={() => act('verify', 'Provider verified.')}>
              Verify
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => act('reject', 'Provider rejected.')}>
              Reject
            </Button>
          </div>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/providers/${provider.id}`}>View</Link>
          </Button>
        )}
      </td>
    </tr>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const { act, pending } = useDecision(provider);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/providers/${provider.id}`} className="min-w-0 hover:underline">
          <p className="font-medium">{provider.businessName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{provider.user?.phone ?? '—'}</p>
        </Link>
        <VerificationBadge status={provider.verificationStatus} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        zones {provider.coverageZones.length ? provider.coverageZones.map(zoneLabel).join(', ') : '—'} · owes {ghs(provider.ledgerBalance)}
      </p>
      {provider.verificationStatus === 'pending' && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" disabled={pending} onClick={() => act('verify', 'Provider verified.')}>
            Verify
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => act('reject', 'Provider rejected.')}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
