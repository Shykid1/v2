import { Injectable } from '@nestjs/common';
import { DistanceZone, PitSize } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PriceBreakdown {
  sizeClass: PitSize;
  zone: DistanceZone;
  basePrice: number;
  accessSurcharge: number;
  total: number;
  currency: string;
}

// Pilot fallback matrix (GHS) — used when no PricingRule row exists yet.
// size × zone, plus an optional access surcharge applied for remote/flood-cut routes.
const FALLBACK: Record<PitSize, Record<DistanceZone, number>> = {
  standard: { near: 250, mid: 350, remote: 500 },
  large_shared: { near: 400, mid: 550, remote: 750 },
};

const FALLBACK_ACCESS_SURCHARGE: Record<DistanceZone, number> = {
  near: 0,
  mid: 0,
  remote: 80,
};

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fixed zonal price: `pit size × distance zone` + optional access surcharge.
   * Reads an admin-editable PricingRule, falling back to the pilot matrix.
   */
  async quote(
    sizeClass: PitSize,
    zone: DistanceZone,
    opts: { applyAccessSurcharge?: boolean } = {},
  ): Promise<PriceBreakdown> {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { sizeClass_zone: { sizeClass, zone } },
    });

    const basePrice = rule ? Number(rule.basePrice) : FALLBACK[sizeClass][zone];
    const surchargeRate = rule
      ? Number(rule.accessSurcharge)
      : FALLBACK_ACCESS_SURCHARGE[zone];
    const accessSurcharge = opts.applyAccessSurcharge ? surchargeRate : 0;
    const currency = rule?.currency ?? 'GHS';

    return {
      sizeClass,
      zone,
      basePrice,
      accessSurcharge,
      total: basePrice + accessSurcharge,
      currency,
    };
  }
}
