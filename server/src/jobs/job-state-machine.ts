import { JobStatus } from '@prisma/client';

/**
 * Single source of truth for the Job lifecycle. Both human-assisted (Phase 0) and
 * auto-assign + broadcast (Phase 1) dispatch run through these same transitions —
 * only the actor differs.
 *
 *   PENDING_APPROVAL → CREATED → OFFERED | ASSIGNED → ACCEPTED → EN_ROUTE →
 *   COMPLETED → PAID | PAID_CASH → CLOSED
 *   (+ SLA_BREACHED, CANCELLED from most live states)
 *
 * System-triggered jobs (sensor fill, climate pre-emption) open in PENDING_APPROVAL so the
 * household can prepare before an operator is summoned. Only on household approval does the
 * job move to CREATED and enter dispatch.
 */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING_APPROVAL]: [
    JobStatus.CREATED, // household approved → enter dispatch
    JobStatus.SLA_BREACHED,
    JobStatus.CANCELLED, // household declined or request expired
  ],
  [JobStatus.CREATED]: [
    JobStatus.OFFERED,
    JobStatus.ASSIGNED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.OFFERED]: [
    JobStatus.ACCEPTED,
    JobStatus.OFFERED, // re-broadcast to more providers
    JobStatus.ASSIGNED,
    JobStatus.SLA_BREACHED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.ASSIGNED]: [
    JobStatus.ACCEPTED,
    JobStatus.OFFERED, // broadcast fallback when not accepted in time
    JobStatus.SLA_BREACHED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.ACCEPTED]: [
    JobStatus.EN_ROUTE,
    JobStatus.SLA_BREACHED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.EN_ROUTE]: [
    JobStatus.COMPLETED,
    JobStatus.SLA_BREACHED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.COMPLETED]: [JobStatus.PAID, JobStatus.PAID_CASH],
  [JobStatus.PAID]: [JobStatus.CLOSED],
  [JobStatus.PAID_CASH]: [JobStatus.CLOSED],
  [JobStatus.CLOSED]: [],
  [JobStatus.SLA_BREACHED]: [
    JobStatus.OFFERED,
    JobStatus.ASSIGNED,
    JobStatus.ACCEPTED,
    JobStatus.CANCELLED,
  ],
  [JobStatus.CANCELLED]: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
