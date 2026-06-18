import { JobStatus } from '@prisma/client';
import { canTransition } from './job-state-machine';

describe('job-state-machine', () => {
  it('gates system-triggered jobs behind household approval', () => {
    // Approval: PENDING_APPROVAL → CREATED enters dispatch; decline → CANCELLED.
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.CREATED)).toBe(
      true,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.CANCELLED)).toBe(
      true,
    );
    // Cannot skip approval straight into dispatch.
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.OFFERED)).toBe(
      false,
    );
    expect(canTransition(JobStatus.PENDING_APPROVAL, JobStatus.ASSIGNED)).toBe(
      false,
    );
  });

  it('allows the happy-path lifecycle', () => {
    const path: JobStatus[] = [
      JobStatus.CREATED,
      JobStatus.OFFERED,
      JobStatus.ACCEPTED,
      JobStatus.EN_ROUTE,
      JobStatus.COMPLETED,
      JobStatus.PAID,
      JobStatus.CLOSED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('allows the cash settlement branch', () => {
    expect(canTransition(JobStatus.COMPLETED, JobStatus.PAID_CASH)).toBe(true);
    expect(canTransition(JobStatus.PAID_CASH, JobStatus.CLOSED)).toBe(true);
  });

  it('supports auto→broadcast fallback (ASSIGNED → OFFERED)', () => {
    expect(canTransition(JobStatus.ASSIGNED, JobStatus.OFFERED)).toBe(true);
  });

  it('rejects illegal jumps', () => {
    expect(canTransition(JobStatus.CREATED, JobStatus.COMPLETED)).toBe(false);
    expect(canTransition(JobStatus.CLOSED, JobStatus.PAID)).toBe(false);
    expect(canTransition(JobStatus.PAID, JobStatus.EN_ROUTE)).toBe(false);
  });
});
