'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminFacility, AdminFacilityDetail, AdminUser, Role } from '@/lib/types';
import { qk } from './keys';

export function useAdminFacilities() {
  return useQuery({
    queryKey: qk.adminFacilities,
    queryFn: () => api.get<AdminFacility[]>('/admin/facilities'),
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 30_000),
  });
}

export function useAdminFacility(id: string | null) {
  return useQuery({
    queryKey: id ? qk.adminFacility(id) : qk.adminFacilities,
    queryFn: () => api.get<AdminFacilityDetail>(`/admin/facilities/${id}`),
    enabled: !!id,
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: qk.adminUsers,
    queryFn: () => api.get<AdminUser[]>('/admin/users'),
  });
}

export interface CreateUserInput {
  name: string;
  phone: string;
  role: Role;
  email?: string;
  whatsappNumber?: string;
  password: string;
  businessName?: string;
  district?: string;
  region?: string;
  title?: string;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post('/admin/users', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/admin/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}
