import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ResolvedLocation {
  ghanaPostAddress: string;
  lat: number | null;
  lng: number | null;
  resolved: boolean;
}

/**
 * Resolves a GhanaPost GPS digital address (e.g. "NM-0123-4567") to coordinates.
 *
 * PLACEHOLDER: the real GhanaPost GPS integration will be supplied later. For now this
 * accepts and normalizes the address and returns it without coordinates (resolved=false)
 * so the rest of the system can already capture and store addresses against pits/jobs.
 * The interface here is the contract the real client must satisfy.
 */
@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // GhanaPost GPS format: AA-NNNN-NNNN (area code, district, unique).
  private static readonly GPS_RE = /^[A-Z]{2}-\d{3,4}-\d{4}$/;

  /** Canonical Ghana regions with their districts, for location selects. */
  async regions() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        districts: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        },
      },
    });
  }

  isValidFormat(address: string): boolean {
    return LocationService.GPS_RE.test((address ?? '').trim().toUpperCase());
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async resolve(address: string): Promise<ResolvedLocation> {
    const normalized = (address ?? '').trim().toUpperCase();

    // TODO: replace with the real GhanaPost GPS API lookup (user to provide).
    this.logger.debug(
      `GhanaPost GPS resolve (placeholder) for "${normalized}" — coordinates not yet available`,
    );

    return {
      ghanaPostAddress: normalized,
      lat: null,
      lng: null,
      resolved: false,
    };
  }
}
