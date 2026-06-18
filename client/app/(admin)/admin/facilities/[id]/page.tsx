'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { useAdminFacility } from '@/hooks/queries';
import type { FacilityStatus } from '@/lib/types';
import { dateTime, ghs, humanize, relativeTime, sizeLabel, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, FillGauge, JobStatusBadge, StatusBadge } from '@/components/domain';
import type { Tone } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const facility = useAdminFacility(id);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/admin/facilities">
          <ArrowLeft className="size-4" /> Facilities
        </Link>
      </Button>

      {facility.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : facility.isError ? (
        <ErrorState message={(facility.error as Error).message} onRetry={() => facility.refetch()} />
      ) : facility.data ? (
        (() => {
          const f = facility.data;
          return (
            <>
              <PageHeader
                title={f.name ?? f.code}
                description={`${f.code} · ${sizeLabel(f.sizeClass)} · ${zoneLabel(f.zone)}`}
                actions={<StatusBadge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</StatusBadge>}
              />

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-card p-5 lg:col-span-1">
                  <p className="text-xs text-muted-foreground">Current fill</p>
                  <div className="mt-3">
                    <FillGauge pct={f.fillPct} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {f.lastReadingAt ? `Last reading ${relativeTime(f.lastReadingAt)}` : 'No readings yet'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                  <Detail label="Owner">{f.household?.name ?? '—'}</Detail>
                  <Detail label="Owner phone">{f.household?.phone ?? '—'}</Detail>
                  <Detail label="Location">{f.community ?? f.district ?? zoneLabel(f.zone)}</Detail>
                  <Detail label="GhanaPost GPS"><span className="font-mono text-xs">{f.ghanaPostAddress ?? '—'}</span></Detail>
                  <Detail label="Sensor">
                    {f.device ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${f.device.online ? 'bg-success' : 'bg-muted-foreground/50'}`} />
                        <span className="font-mono text-xs">{f.device.deviceId}</span>
                        {f.device.online ? (
                          <span className="text-xs text-muted-foreground">online</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <WifiOff className="size-3" /> {f.device.lastSeen ? relativeTime(f.device.lastSeen) : 'never'}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No sensor</span>
                    )}
                  </Detail>
                  <Detail label="Battery">
                    {f.device?.batteryMv != null ? `${(f.device.batteryMv / 1000).toFixed(2)} V` : '—'}
                  </Detail>
                </div>
              </div>

              <Section title="Recent readings">
                {f.readings.length === 0 ? (
                  <Empty>No sensor readings recorded.</Empty>
                ) : (
                  <SimpleTable
                    head={['Fill', 'Battery', 'Temp', 'When']}
                    rows={f.readings.map((r) => [
                      <span key="fill" className="tabular-nums">{r.fillPct.toFixed(0)}%</span>,
                      r.batteryMv != null ? `${(r.batteryMv / 1000).toFixed(2)} V` : '—',
                      r.temperatureC != null ? `${r.temperatureC.toFixed(1)}°C` : '—',
                      dateTime(r.sensorTs),
                    ])}
                  />
                )}
              </Section>

              <Section title="Recent jobs">
                {f.jobs.length === 0 ? (
                  <Empty>No desludging jobs for this pit yet.</Empty>
                ) : (
                  <SimpleTable
                    head={['Status', 'Trigger', 'Payment', 'Price', 'Created', 'Completed']}
                    rows={f.jobs.map((j) => [
                      <JobStatusBadge key="status" status={j.status} />,
                      humanize(j.triggerSource),
                      humanize(j.paymentMethod),
                      <span key="price" className="tabular-nums">{ghs(j.priceTotal)}</span>,
                      dateTime(j.createdAt),
                      j.completedAt ? dateTime(j.completedAt) : '—',
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
