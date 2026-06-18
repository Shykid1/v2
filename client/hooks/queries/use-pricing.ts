'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DistanceZone, PitSize, PriceQuote } from '@/lib/types';
import { qk } from './keys';

/** Live fixed-zonal quote for a size + zone. Public (no auth). */
export function usePriceQuote(size: PitSize, zone: DistanceZone, access = false) {
  return useQuery({
    queryKey: [...qk.priceQuote(size, zone), access],
    queryFn: () =>
      api.get<PriceQuote>(
        `/pricing/quote?size=${size}&zone=${zone}&access=${access}`,
        false,
      ),
    staleTime: 5 * 60_000,
  });
}
