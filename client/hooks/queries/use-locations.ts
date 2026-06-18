'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LocationRegion } from '@/lib/types';
import { qk } from './keys';

/**
 * Canonical Ghana regions + districts that power location selects. Public (no auth)
 * and effectively static, so it is cached aggressively.
 */
export function useLocations() {
  return useQuery({
    queryKey: qk.locations,
    queryFn: () => api.get<LocationRegion[]>('/locations/regions', false),
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });
}
