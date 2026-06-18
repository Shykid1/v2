'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DistrictReportRow, PlatformSettings, ReportSummary } from '@/lib/types';
import { qk } from './keys';

export function useReportSummary() {
  return useQuery({
    queryKey: qk.reportSummary,
    queryFn: () => api.get<ReportSummary>('/reports/summary'),
  });
}

export function useReportByDistrict() {
  return useQuery({
    queryKey: qk.reportByDistrict,
    queryFn: () => api.get<DistrictReportRow[]>('/reports/by-district'),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: () => api.get<PlatformSettings>('/settings'),
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      api.put<PlatformSettings>('/settings', { key, value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}

/** Force a climate poll (optionally forcing a flood window for demos). */
export function useRunClimate() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, boolean>({
    mutationFn: (forceFlood: boolean) =>
      api.post<unknown>(`/climate/run${forceFlood ? '?forceFlood=true' : ''}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.reportSummary });
    },
  });
}
