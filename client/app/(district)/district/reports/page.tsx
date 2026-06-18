'use client';

import dynamic from 'next/dynamic';
import { Printer } from 'lucide-react';
import { useDistrictReports } from '@/hooks/queries';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, StatCard } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const DistrictCoverageChart = dynamic(() => import('@/components/charts/district-coverage-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px]" />,
});
const PaymentMixChart = dynamic(() => import('@/components/charts/payment-mix-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px]" />,
});

export default function DistrictReportsPage() {
  const reports = useDistrictReports();
  const data = reports.data;
  const districts = data?.byDistrict ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="SDG & compliance reporting"
        description="JMP-aligned sanitation coverage and service operations for partner reporting."
        actions={
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer /> Print
          </Button>
        }
      />

      {reports.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : reports.isError ? (
        <ErrorState message={(reports.error as Error).message} onRetry={() => reports.refetch()} />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Households" value={data.summary.coverage.households} />
            <StatCard
              label="Sensored coverage"
              value={`${data.summary.coverage.sensoredPct}%`}
              sub={`${data.summary.coverage.sensoredPits}/${data.summary.coverage.totalPits} pits`}
            />
            <StatCard
              label="Completion rate"
              value={`${data.summary.operations.completionRatePct}%`}
              sub={`${data.summary.operations.jobsCompleted}/${data.summary.operations.jobsTotal} jobs`}
            />
            <StatCard label="Verified providers" value={data.summary.coverage.providersVerified} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-heading text-sm font-semibold">Pit coverage by district</h2>
              <p className="mt-0.5 mb-4 text-xs text-muted-foreground">Total pits vs sensored pits.</p>
              {reports.isLoading ? (
                <Skeleton className="h-[300px]" />
              ) : districts.length === 0 ? (
                <EmptyState title="No district data yet" />
              ) : (
                <DistrictCoverageChart data={districts} />
              )}
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="font-heading text-sm font-semibold">Payment mix</h2>
              <p className="mt-0.5 mb-4 text-xs text-muted-foreground">How completed jobs were paid.</p>
              <PaymentMixChart
                cash={data.summary.operations.cashJobs}
                digital={data.summary.operations.digitalJobs}
              />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: 'var(--chart-1)' }} />
                  <dt className="text-muted-foreground">Mobile Money</dt>
                  <dd className="ml-auto font-medium tabular-nums">{data.summary.operations.digitalJobs}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: 'var(--chart-3)' }} />
                  <dt className="text-muted-foreground">Cash</dt>
                  <dd className="ml-auto font-medium tabular-nums">{data.summary.operations.cashJobs}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
