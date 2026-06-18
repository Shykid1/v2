'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Earnings, Provider, ProviderDetail } from '@/lib/types';
import { qk } from './keys';

export interface SubmitKycInput {
  settlementBank: string;
  accountNumber: string;
  accountType?: 'momo' | 'bank';
}

export interface UpdateProviderInput {
  coverageZones?: string[];
  region?: string;
  district?: string;
  vehicleCapacityLiters?: number;
  available?: boolean;
}

// ── Provider self ─────────────────────────────────────────────────────────────

export function useProviderMe() {
  return useQuery({ queryKey: qk.providerMe, queryFn: () => api.get<Provider>('/providers/me') });
}

export function useProviderEarnings() {
  return useQuery({
    queryKey: qk.providerEarnings,
    queryFn: () => api.get<Earnings>('/providers/me/earnings'),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProviderInput) => api.patch<Provider>('/providers/me', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.providerMe }),
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitKycInput) =>
      api.post<Provider>('/providers/me/kyc', { accountType: 'momo', ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.providerMe }),
  });
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function useProviders(status?: 'pending' | 'verified' | 'rejected') {
  return useQuery({
    queryKey: [...qk.providers, status ?? 'all'],
    queryFn: () => api.get<Provider[]>(`/providers${status ? `?status=${status}` : ''}`),
  });
}

export function useProvider(id: string | null) {
  return useQuery({
    queryKey: id ? qk.provider(id) : qk.providers,
    queryFn: () => api.get<ProviderDetail>(`/providers/${id}`),
    enabled: !!id,
  });
}

export function useProviderDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'verify' | 'reject'; reason?: string }) =>
      api.post<Provider>(`/providers/${id}/${decision}`, decision === 'reject' ? { reason } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.providers }),
  });
}
