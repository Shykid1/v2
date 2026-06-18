'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HouseholdProfile, PaymentMethod } from '@/lib/types';
import { qk } from './keys';

export interface UpdateHouseholdInput {
  defaultPaymentMethod?: PaymentMethod;
  whatsappNumber?: string;
  district?: string;
  community?: string;
}

export function useHousehold() {
  return useQuery({
    queryKey: qk.householdMe,
    queryFn: () => api.get<HouseholdProfile>('/households/me'),
  });
}

export function useUpdateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHouseholdInput) =>
      api.patch<HouseholdProfile>('/households/me', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.householdMe }),
  });
}

export interface SensorCheckoutResult {
  authorizationUrl?: string;
  reference?: string;
}

export function useSensorCheckout() {
  return useMutation({
    mutationFn: (amount: number) =>
      api.post<SensorCheckoutResult>('/payments/sensor-checkout', { amount }),
  });
}
