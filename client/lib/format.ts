/** Money, dates, and small label helpers shared across surfaces. */

export function ghs(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'GHS —';
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return 'GHS —';
  return `GHS ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "EN_ROUTE" -> "En route" */
export function humanize(s: string): string {
  const t = s.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const ZONE_LABEL: Record<string, string> = {
  near: 'In town',
  mid: 'Outside town',
  remote: 'Remote',
};
export const zoneLabel = (z: string) => ZONE_LABEL[z] ?? humanize(z);

const SIZE_LABEL: Record<string, string> = {
  standard: 'Standard pit',
  large_shared: 'Large / shared pit',
};
export const sizeLabel = (s: string) => SIZE_LABEL[s] ?? humanize(s);
