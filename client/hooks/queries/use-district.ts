'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AdminFacility,
  DistrictAlerts,
  DistrictOverview,
  DistrictReports,
} from '@/lib/types';
import { qk } from './keys';

function pollWhenVisible(ms: number) {
  return () => (typeof document !== 'undefined' && document.hidden ? false : ms);
}

export function useDistrictOverview() {
  return useQuery({
    queryKey: qk.districtOverview,
    queryFn: () => api.get<DistrictOverview>('/district/overview'),
    refetchInterval: pollWhenVisible(30_000),
  });
}

export function useDistrictFacilities() {
  return useQuery({
    queryKey: qk.districtFacilities,
    queryFn: () => api.get<AdminFacility[]>('/district/facilities'),
    refetchInterval: pollWhenVisible(30_000),
  });
}

export function useDistrictAlerts() {
  return useQuery({
    queryKey: qk.districtAlerts,
    queryFn: () => api.get<DistrictAlerts>('/district/alerts'),
    refetchInterval: pollWhenVisible(20_000),
  });
}

/** District-scoped SDG/compliance rollups for the officer's own district. */
export function useDistrictReports() {
  return useQuery({
    queryKey: qk.districtReports,
    queryFn: () => api.get<DistrictReports>('/district/reports'),
  });
}

/** Regulatory action: flag a job for review with a compliance note. */
export function useEscalateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.post(`/district/jobs/${id}/escalate`, { note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.districtAlerts });
      qc.invalidateQueries({ queryKey: qk.districtOverview });
    },
  });
}
