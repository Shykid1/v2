'use client';

import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Droplets,
  WifiOff,
} from 'lucide-react';
import { useDistrictFacilities, useDistrictOverview } from '@/hooks/queries';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, StatCard } from '@/components/domain';
import { Skeleton } from '@/components/ui/skeleton';

const SensorMap = dynamic(() => import('@/components/admin/sensor-map'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-xl" />,
});

export default function DistrictOverviewPage() {
  const overview = useDistrictOverview();
  const facilities = useDistrictFacilities();
  const list = facilities.data ?? [];
  const o = overview.data;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title="Monitoring & regulation"
        description={
          o?.district
            ? `Oversight of sanitation service delivery in ${o.district}.`
            : 'Programme-wide oversight of sanitation service delivery.'
        }
      />

      {overview.isError ? (
        <ErrorState
          message={(overview.error as Error).message}
          onRetry={() => overview.refetch()}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overview.isLoading || !o ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <StatCard
                  label="Critical pits"
                  value={o.criticalPits}
                  sub="≥ 80% full"
                  icon={<AlertTriangle className="size-4" />}
                />
                <StatCard
                  label="Awaiting approval"
                  value={o.pendingApprovals}
                  sub={`${o.overdueApprovals} overdue`}
                  icon={<Clock className="size-4" />}
                />
                <StatCard
                  label="SLA breaches"
                  value={o.slaBreaches}
                  icon={<ClipboardCheck className="size-4" />}
                />
                <StatCard
                  label="Completion rate"
                  value={`${o.completionRatePct}%`}
                  sub={`${o.jobsCompleted}/${o.jobsTotal} jobs`}
                  icon={<CheckCircle2 className="size-4" />}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overview.isLoading || !o ? null : (
              <>
                <StatCard label="Monitored pits" value={o.totalPits} icon={<Droplets className="size-4" />} />
                <StatCard label="With sensors" value={o.monitoredPits} sub={`of ${o.totalPits}`} />
                <StatCard label="On watch" value={o.warningPits} sub="60–80% full" />
                <StatCard
                  label="Offline sensors"
                  value={o.offlineSensors}
                  sub="no reading 24h"
                  icon={<WifiOff className="size-4" />}
                />
              </>
            )}
          </div>

          <div className="h-[55vh]">
            {facilities.isLoading ? (
              <Skeleton className="size-full rounded-xl" />
            ) : (
              <SensorMap facilities={list} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
