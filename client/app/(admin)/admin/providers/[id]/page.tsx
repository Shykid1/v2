'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useProvider, useProviderDecision } from '@/hooks/queries';
import { dateTime, ghs, humanize, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, JobStatusBadge, StatusBadge, VerificationBadge } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const provider = useProvider(id);
  const decide = useProviderDecision();

  function act(decision: 'verify' | 'reject', ok: string) {
    decide.mutate(
      { id, decision },
      { onSuccess: () => toast.success(ok), onError: (e) => toast.error((e as Error).message) },
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/admin/providers">
          <ArrowLeft className="size-4" /> Providers
        </Link>
      </Button>

      {provider.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : provider.isError ? (
        <ErrorState message={(provider.error as Error).message} onRetry={() => provider.refetch()} />
      ) : provider.data ? (
        (() => {
          const p = provider.data;
          return (
            <>
              <PageHeader
                title={p.businessName}
                description={p.user?.phone ?? undefined}
                actions={
                  p.verificationStatus === 'pending' ? (
                    <>
                      <Button disabled={decide.isPending} onClick={() => act('verify', 'Provider verified.')}>
                        Verify
                      </Button>
                      <Button variant="outline" className="text-destructive" disabled={decide.isPending} onClick={() => act('reject', 'Provider rejected.')}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <VerificationBadge status={p.verificationStatus} />
                  )
                }
              />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Verification"><VerificationBadge status={p.verificationStatus} /></Detail>
                <Detail label="KYC">
                  <StatusBadge tone={p.paystackSubaccountCode ? 'success' : 'neutral'}>
                    {p.paystackSubaccountCode ? 'active' : humanize(p.kycStatus)}
                  </StatusBadge>
                </Detail>
                <Detail label="Owes (ledger)"><span className="tabular-nums">{ghs(p.ledgerBalance)}</span></Detail>
                <Detail label="Vehicle capacity">
                  {p.vehicleCapacityLiters != null ? `${p.vehicleCapacityLiters} L` : '—'}
                </Detail>
                <Detail label="Coverage zones" className="sm:col-span-2">
                  {p.coverageZones.length ? p.coverageZones.map(zoneLabel).join(', ') : '—'}
                </Detail>
                <Detail label="WhatsApp">{p.user?.whatsappNumber ?? '—'}</Detail>
                <Detail label="Email">{p.user?.email ?? '—'}</Detail>
              </div>

              <Section title="Recent jobs">
                {p.jobs.length === 0 ? (
                  <Empty>No jobs assigned yet.</Empty>
                ) : (
                  <SimpleTable
                    head={['Pit', 'Status', 'Payment', 'Price', 'Created', 'Completed']}
                    rows={p.jobs.map((j) => [
                      <span key="pit" className="font-mono text-xs">{j.pit.name ?? j.pit.code}</span>,
                      <JobStatusBadge key="status" status={j.status} />,
                      humanize(j.paymentMethod),
                      <span key="price" className="tabular-nums">{ghs(j.priceTotal)}</span>,
                      dateTime(j.createdAt),
                      j.completedAt ? dateTime(j.completedAt) : '—',
                    ])}
                  />
                )}
              </Section>

              <Section title="Commission ledger">
                {p.ledgerEntries.length === 0 ? (
                  <Empty>No ledger entries yet.</Empty>
                ) : (
                  <SimpleTable
                    head={['Type', 'Amount', 'Balance after', 'Note', 'Date']}
                    rows={p.ledgerEntries.map((e) => [
                      humanize(e.type),
                      <span key="amt" className="tabular-nums">{ghs(e.amount)}</span>,
                      <span key="bal" className="tabular-nums">{ghs(e.balanceAfter)}</span>,
                      e.note ?? '—',
                      dateTime(e.createdAt),
                    ])}
                  />
                )}
              </Section>
            </>
          );
        })()
      ) : null}
    </div>
  );
}

function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${className ?? ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 text-sm font-medium">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function SimpleTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((cells, i) => (
            <tr key={i} className="hover:bg-muted/40">
              {cells.map((c, j) => (
                <td key={j} className="px-4 py-3 whitespace-nowrap">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
