import { Injectable } from '@nestjs/common';
import { Device } from '@prisma/client';

interface CacheEntry {
  device: Device;
  cachedAt: number;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class DeviceCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(deviceId: string): Device | null {
    const entry = this.cache.get(deviceId);
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
      return entry.device;
    }
    return null;
  }

  set(deviceId: string, device: Device): void {
    this.cache.set(deviceId, { device, cachedAt: Date.now() });
  }

  invalidate(deviceId: string): void {
    this.cache.delete(deviceId);
  }
}
