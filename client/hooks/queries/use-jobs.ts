'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DistanceZone, Job, JobStatus, PaymentMethod, PitSize } from '@/lib/types';
import { qk } from './keys';

const ACTIVE_POLL = 15_000;
const BOARD_POLL = 10_000;

/** Pause polling when the tab is hidden (battery + data friendly). */
function pollWhenVisible(ms: number) {
  return () => (typeof document !== 'undefined' && document.hidden ? false : ms);
}

// ── Reads ──────────────────────────────────────────────────────────────────

export function useHouseholdJobs() {
  return useQuery({
    queryKey: qk.householdJobs,
    queryFn: () => api.get<Job[]>('/households/me/jobs'),
    refetchInterval: pollWhenVisible(ACTIVE_POLL),
  });
}

export function useProviderJobs() {
  return useQuery({
    queryKey: qk.providerJobs,
    queryFn: () => api.get<Job[]>('/jobs/provider/mine'),
    refetchInterval: pollWhenVisible(ACTIVE_POLL),
  });
}

export function useAdminJobs(status?: JobStatus) {
  return useQuery({
    queryKey: [...qk.jobs, status ?? 'all'],
    queryFn: () =>
      api
        .get<{ total: number; jobs: Job[] }>(`/jobs${status ? `?status=${status}` : ''}`)
        .then((r) => r.jobs),
    refetchInterval: pollWhenVisible(BOARD_POLL),
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export interface GuestRequestInput {
  name?: string;
  phone: string;
  whatsapp?: string;
  ghanaPostAddress: string;
  sizeClass: PitSize;
  zone: DistanceZone;
  paymentMethod: PaymentMethod;
}

/** Public guest request (landing page / no account). */
export function useGuestRequest() {
  return useMutation({
    mutationFn: (input: GuestRequestInput) => api.post<Job>('/jobs/guest', input, false),
  });
}

export interface RequestJobInput {
  pitId: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

/**
 * Household requests desludging for one of their pits. Accepts either a bare
 * pit id (per-pit "Request emptying" button) or a full payload (the dedicated
 * desludging request page, which also sets payment method and notes).
 */
export function useRequestJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | RequestJobInput) =>
      api.post<Job>('/jobs', typeof input === 'string' ? { pitId: input } : input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.householdJobs });
      qc.invalidateQueries({ queryKey: qk.pits });
    },
  });
}

/** Household approves a sensor/climate-triggered job → an operator is summoned. */
export function useApproveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => api.post<Job>(`/jobs/${jobId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.householdJobs });
      qc.invalidateQueries({ queryKey: qk.pits });
    },
  });
}

/** Household declines a pending approval request → the job is cancelled. */
export function useDeclineApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post<Job>(`/jobs/${id}/decline-approval`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.householdJobs });
      qc.invalidateQueries({ queryKey: qk.pits });
    },
  });
}

type ProviderAction = 'accept' | 'decline' | 'en-route' | 'done';

/** Provider job lifecycle transition (accept/decline/en-route/done). */
export function useProviderJobAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: ProviderAction }) =>
      api.post<Job>(`/jobs/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.providerJobs });
      qc.invalidateQueries({ queryKey: qk.providerEarnings });
    },
  });
}

type AdminAction =
  | { kind: 'offer'; providerId: string }
  | { kind: 'auto-assign' }
  | { kind: 'broadcast' }
  | { kind: 'cancel'; reason?: string }
  | { kind: 'close' };

/** Admin dispatch-board action on a job. */
export function useAdminJobAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: AdminAction }) => {
      switch (action.kind) {
        case 'offer':
          return api.post<Job>(`/jobs/${id}/offer`, { providerId: action.providerId });
        case 'cancel':
          return api.post<Job>(`/jobs/${id}/cancel`, { reason: action.reason });
        default:
          return api.post<Job>(`/jobs/${id}/${action.kind}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.reportSummary });
    },
  });
}
