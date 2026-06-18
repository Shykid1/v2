'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { AlertTriangle, Droplets, Radio, WifiOff } from 'lucide-react';
import { useAdminFacilities } from '@/hooks/queries';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, StatCard } from '@/components/domain';
import { Skeleton } from '@/components/ui/skeleton';

const SensorMap = dynamic(() => import('@/components/admin/sensor-map'), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-xl" />,
});

export default function AdminOverviewPage() {
  const facilities = useAdminFacilities();
  const list = useMemo(() => facilities.data ?? [], [facilities.data]);

  const stats = useMemo(() => {
    const critical = list.filter((f) => f.status === 'critical').length;
    const watch = list.filter((f) => f.status === 'warning').length;
    const sensored = list.filter((f) => f.sensored).length;
    const offline = list.filter((f) => f.device && !f.device.online).length;
    return { critical, watch, sensored, offline };
  }, [list]);

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Live status of every monitored pit across the network."
      />

      {facilities.isError ? (
        <ErrorState message={(facilities.error as Error).message} onRetry={() => facilities.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facilities.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <StatCard label="Facilities" value={list.length} icon={<Droplets className="size-4" />} />
                <StatCard
                  label="Critical"
                  value={stats.critical}
                  sub="≥ 80% full"
                  icon={<AlertTriangle className="size-4" />}
                />
                <StatCard label="Sensored" value={stats.sensored} icon={<Radio className="size-4" />} />
                <StatCard
                  label="Offline sensors"
                  value={stats.offline}
                  sub="no reading in 24h"
                  icon={<WifiOff className="size-4" />}
                />
              </>
            )}
          </div>

          <div className="h-[60vh] lg:h-[65vh]">
            <SensorMap facilities={list} />
          </div>
        </>
      )}
    </div>
  );
}
