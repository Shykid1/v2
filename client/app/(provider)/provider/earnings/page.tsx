'use client';

import { Wallet } from 'lucide-react';
import { useProviderEarnings } from '@/hooks/queries';
import { ghs, humanize } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, StatCard, StatusBadge } from '@/components/domain';
import type { Tone } from '@/components/domain';
import { Skeleton } from '@/components/ui/skeleton';

const PAYMENT_TONE: Record<string, Tone> = {
  success: 'success',
  paid: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'neutral',
};

export default function ProviderEarningsPage() {
  const earnings = useProviderEarnings();
  const payments = earnings.data?.payments ?? [];
  const paidCount = payments.filter((p) => p.status.toLowerCase() === 'success').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="Payouts, transactions, and the cash commission you owe." />

      {earnings.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : earnings.isError ? (
        <ErrorState message={(earnings.error as Error).message} onRetry={() => earnings.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Commission owed"
              value={ghs(earnings.data?.ledgerBalance ?? 0)}
              sub={earnings.data?.creditLimit ? `Limit ${ghs(earnings.data.creditLimit)}` : 'No credit limit'}
            />
            <StatCard label="Jobs paid" value={paidCount} />
            <StatCard label="Transactions" value={payments.length} />
          </div>

          {payments.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-5" />}
              title="No transactions yet"
              description="Completed digital jobs and payouts will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Reference</th>
                    <th className="px-4 py-2.5 font-medium">Method</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-mono text-xs">{p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 capitalize">{p.method === 'paystack' ? 'Mobile Money' : p.method}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={PAYMENT_TONE[p.status.toLowerCase()] ?? 'neutral'}>
                          {humanize(p.status)}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">{ghs(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
