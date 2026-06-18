'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DistanceZone, Pit, PitSize } from '@/lib/types';
import { qk } from './keys';

export interface CreatePitInput {
  name?: string;
  ghanaPostAddress: string;
  sizeClass?: PitSize;
  zone?: DistanceZone;
  district?: string;
  community?: string;
  pitDepthCm?: number;
}

export interface RegisterSensorInput {
  deviceId: string;
  hmacKey: string;
  pitDepthCm?: number;
}

export function usePits() {
  return useQuery({ queryKey: qk.pits, queryFn: () => api.get<Pit[]>('/pits') });
}

export function usePit(id: string | null) {
  return useQuery({
    queryKey: id ? qk.pit(id) : qk.pits,
    queryFn: () => api.get<Pit>(`/pits/${id}`),
    enabled: !!id,
  });
}

export function useCreatePit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePitInput) => api.post<Pit>('/pits', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.pits }),
  });
}

export function useRegisterSensor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pitId, ...input }: RegisterSensorInput & { pitId: string }) =>
      api.post<Pit>(`/pits/${pitId}/sensor`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.pits }),
  });
}
