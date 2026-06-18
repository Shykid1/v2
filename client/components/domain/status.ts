import type { JobStatus } from '@/lib/types';

/** Semantic tone -> tinted badge classes. Tones map brand/status, never hardcode per page. */
export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'destructive';

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-primary/12 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/25 text-warning-foreground',
  destructive: 'bg-destructive/12 text-destructive',
};

/** Small dot color (solid) for timelines / inline markers. */
export const toneDot: Record<Tone, string> = {
  neutral: 'bg-muted-foreground/50',
  brand: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
};

export const jobStatusTone: Record<JobStatus, Tone> = {
  PENDING_APPROVAL: 'warning',
  CREATED: 'neutral',
  OFFERED: 'warning',
  ASSIGNED: 'warning',
  ACCEPTED: 'brand',
  EN_ROUTE: 'brand',
  COMPLETED: 'success',
  PAID: 'success',
  PAID_CASH: 'success',
  CLOSED: 'neutral',
  SLA_BREACHED: 'destructive',
  CANCELLED: 'destructive',
};

export function verificationTone(status: 'pending' | 'verified' | 'rejected'): Tone {
  return status === 'verified' ? 'success' : status === 'rejected' ? 'destructive' : 'warning';
}

/** Fill level -> tone. Calm under 60, watch 60-80, act at 80+. */
export function fillTone(pct: number): Tone {
  if (pct >= 80) return 'destructive';
  if (pct >= 60) return 'warning';
  return 'success';
}

/** Ordered happy-path lifecycle for the timeline component. */
export const JOB_LIFECYCLE: JobStatus[] = [
  'PENDING_APPROVAL',
  'CREATED',
  'ACCEPTED',
  'EN_ROUTE',
  'COMPLETED',
  'PAID',
  'CLOSED',
];
