'use client';

import { useMemo, useState } from 'react';
import { Droplets, WifiOff } from 'lucide-react';
import { useDistrictFacilities } from '@/hooks/queries';
import type { AdminFacility, FacilityStatus } from '@/lib/types';
import { relativeTime, sizeLabel, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, FillGauge, StatusBadge } from '@/components/domain';
import type { Tone } from '@/components/domain';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_TONE: Record<FacilityStatus, Tone> = {
  critical: 'destructive',
  warning: 'warning',
  ok: 'success',
  unknown: 'neutral',
};
const STATUS_LABEL: Record<FacilityStatus, string> = {
  critical: 'Critical',
  warning: 'Watch',
  ok: 'Safe',
  unknown: 'No data',
};

type Filter = 'all' | FacilityStatus;

export default function DistrictMonitoringPage() {
  const facilities = useDistrictFacilities();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const all = facilities.data ?? [];
    return filter === 'all' ? all : all.filter((f) => f.status === filter);
  }, [facilities.data, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pit monitoring"
        description="Live containment status of every pit in your district."
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="critical">Critical</TabsTrigger>
          <TabsTrigger value="warning">Watch</TabsTrigger>
          <TabsTrigger value="ok">Safe</TabsTrigger>
          <TabsTrigger value="unknown">No data</TabsTrigger>
        </TabsList>
      </Tabs>

      {facilities.isLoading ? (
        <Skeleton className="h-80" />
      ) : facilities.isError ? (
        <ErrorState message={(facilities.error as Error).message} onRetry={() => facilities.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Droplets className="size-5" />} title="No facilities" description="Nothing matches this filter." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Pit</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Sensor</th>
                  <th className="px-4 py-2.5 font-medium">Fill</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{f.name ?? f.code}</div>
                      <div className="font-mono text-xs text-muted-foreground">{f.code} · {sizeLabel(f.sizeClass)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{f.household?.name ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{f.household?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{f.community ?? f.district ?? zoneLabel(f.zone)}</div>
                      <div className="font-mono text-xs text-muted-foreground">{f.ghanaPostAddress ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <DeviceCell facility={f} />
                    </td>
                    <td className="px-4 py-3 w-36">
                      <FillGauge pct={f.fillPct} showLabel={false} />
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {f.fillPct != null ? `${f.fillPct.toFixed(0)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {list.map((f) => (
              <div key={f.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{f.name ?? f.code}</p>
                    <p className="font-mono text-xs text-muted-foreground">{f.code}</p>
                  </div>
                  <StatusBadge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.household?.name ?? '—'} · {f.community ?? f.district ?? zoneLabel(f.zone)}
                </p>
                <div className="mt-3">
                  <FillGauge pct={f.fillPct} />
                </div>
                <div className="mt-2">
                  <DeviceCell facility={f} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DeviceCell({ facility }: { facility: AdminFacility }) {
  if (!facility.device) {
    return <span className="text-xs text-muted-foreground">No sensor</span>;
  }
  const { online, lastSeen } = facility.device;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${online ? 'bg-success' : 'bg-muted-foreground/50'}`} />
      <span className="font-mono">{facility.device.deviceId}</span>
      <span className="text-muted-foreground">
        {online ? '· online' : <span className="inline-flex items-center gap-1"><WifiOff className="size-3" /> {lastSeen ? relativeTime(lastSeen) : 'never'}</span>}
      </span>
    </div>
  );
}
