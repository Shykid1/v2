'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { AdminFacility, FacilityStatus } from '@/lib/types';
import { relativeTime, sizeLabel, zoneLabel } from '@/lib/format';
import { FillGauge, StatusBadge } from '@/components/domain';
import type { Tone } from '@/components/domain';
import { Button } from '@/components/ui/button';

// Concrete colors (Leaflet markers are injected HTML; mirror the OKLCH tokens).
const STATUS_COLOR: Record<FacilityStatus, string> = {
  critical: 'oklch(0.52 0.2 22)',
  warning: 'oklch(0.78 0.15 80)',
  ok: 'oklch(0.58 0.11 150)',
  unknown: 'oklch(0.6 0.01 75)',
};

const STATUS_TONE: Record<FacilityStatus, Tone> = {
  critical: 'destructive',
  warning: 'warning',
  ok: 'success',
  unknown: 'neutral',
};

const LEGEND: { label: string; status: FacilityStatus }[] = [
  { label: 'Safe', status: 'ok' },
  { label: 'Watch', status: 'warning' },
  { label: 'Critical', status: 'critical' },
  { label: 'No data', status: 'unknown' },
];

function markerHtml(status: FacilityStatus) {
  const color = STATUS_COLOR[status];
  if (status === 'critical') {
    return `<div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:24px;height:24px;border-radius:50%;border:2px solid ${color};opacity:0.45;animation:sc-ring 1.6s ease-in-out infinite;"></div>
      <div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.4);"></div>
    </div>`;
  }
  const size = status === 'warning' ? 13 : 12;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`;
}

export default function SensorMap({ facilities }: { facilities: AdminFacility[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<AdminFacility | null>(null);

  const valid = useMemo(
    () => facilities.filter((f) => f.lat != null && f.lng != null),
    [facilities],
  );
  const hasLocations = valid.length > 0;

  // Create the map once locations are available. The query starts empty and
  // resolves async, so this must react to `hasLocations` rather than run only
  // on mount — otherwise the map never initializes.
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (mapInstanceRef.current || !hasLocations) return;
    const node = mapRef.current as HTMLElement & { _leaflet_id?: number };

    if (!document.getElementById('sc-map-styles')) {
      const s = document.createElement('style');
      s.id = 'sc-map-styles';
      s.textContent =
        '@keyframes sc-ring{0%,100%{transform:scale(1);opacity:0.45}50%{transform:scale(1.65);opacity:0.1}}';
      document.head.appendChild(s);
    }

    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || mapInstanceRef.current || node._leaflet_id) return;

      const bounds = L.latLngBounds(valid.map((f) => [f.lat!, f.lng!] as [number, number]));

      const map = L.map(node, { zoomControl: false });
      leafletRef.current = L;
      mapInstanceRef.current = map;
      map.fitBounds(bounds.pad(0.2), { maxZoom: 15 });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 19,
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      map.on('click', () => setSelected(null));
      setReady(true);

      // Leaflet measures the container on init; if layout has not settled the
      // tiles render against a stale size and the map appears blank. Recompute
      // once after paint, and on every container resize.
      requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
      const ro = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize());
      ro.observe(node);
      resizeObserverRef.current = ro;
    });

    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapInstanceRef.current?.remove?.();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
      delete node._leaflet_id;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLocations]);

  // Sync markers whenever the facilities change (incl. the 30s refetch), without
  // tearing down the map — keeps pan/zoom and selection intact.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !L || !layer) return;

    layer.clearLayers();
    valid.forEach((f) => {
      const isCritical = f.status === 'critical';
      const icon = L.divIcon({
        html: markerHtml(f.status),
        className: '',
        iconSize: isCritical ? [24, 24] : [13, 13],
        iconAnchor: isCritical ? [12, 12] : [6, 6],
      });
      const marker = L.marker([f.lat!, f.lng!], { icon }).addTo(layer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      marker.on('click', (e: any) => {
        L.DomEvent.stopPropagation(e);
        setSelected(f);
      });
    });
  }, [valid, ready]);

  return (
    <div className="relative size-full overflow-hidden rounded-xl border">
      {hasLocations ? (
        <div ref={mapRef} className="size-full" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 bg-muted text-sm text-muted-foreground">
          <span>No GPS coordinates on file yet</span>
          <span className="text-xs">Register a pit address to place it on the map.</span>
        </div>
      )}

      {selected && (
        <div className="absolute top-3 left-3 z-[1000] w-72 rounded-xl border bg-card p-4 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <StatusBadge tone={STATUS_TONE[selected.status]}>
                {selected.status === 'ok' ? 'Safe' : selected.status}
              </StatusBadge>
              <h3 className="mt-1 truncate font-heading font-semibold">
                {selected.name ?? selected.code}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selected.community ?? zoneLabel(selected.zone)} · <span className="font-mono">{selected.code}</span>
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mt-3">
            <FillGauge pct={selected.fillPct} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Cell label="Type" value={sizeLabel(selected.sizeClass)} />
            <Cell
              label="Battery"
              value={selected.device?.batteryMv != null ? `${(selected.device.batteryMv / 1000).toFixed(2)}V` : '—'}
            />
            <Cell label="District" value={selected.district ?? '—'} />
            <Cell
              label="Last seen"
              value={selected.device?.lastSeen ? relativeTime(selected.device.lastSeen) : 'Never'}
            />
          </dl>

          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href="/admin/facilities">Facilities</Link>
            </Button>
            <Button asChild size="sm" className="flex-1">
              <Link href="/admin/dispatch">Dispatch</Link>
            </Button>
          </div>
        </div>
      )}

      {hasLocations && (
        <div className="absolute bottom-10 left-3 z-[1000] space-y-1.5 rounded-lg border bg-card/90 px-3 py-2 text-xs backdrop-blur-sm">
          {LEGEND.map(({ label, status }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full ring-2 ring-card"
                style={{ background: STATUS_COLOR[status] }}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
