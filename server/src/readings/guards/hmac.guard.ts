import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Device } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceCacheService } from '../../common/services/device-cache.service';

const HMAC_HEX_RE = /^[0-9a-f]{64}$/i;

/**
 * Authenticates a sensor payload with a per-device HMAC-SHA256 signature and rejects
 * replays. Signed message format (matches firmware/simulator):
 *   `${device_id}:${pit_code}:${timestamp}:${fill_pct}:${battery_mv}`
 */
@Injectable()
export class HmacGuard implements CanActivate {
  private readonly replayWindowMs: number;

  constructor(
    private prisma: PrismaService,
    private deviceCache: DeviceCacheService,
    config: ConfigService,
  ) {
    this.replayWindowMs = config.get<number>('HMAC_REPLAY_WINDOW_MS', 300000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { device?: Device }>();
    const body = request.body as Record<string, unknown>;

    const deviceId = body['device_id'] as string | undefined;
    const pitCode = body['pit_code'] as string | undefined;
    const timestamp = body['timestamp'] as string | undefined;
    const fillPct = body['fill_pct'];
    const batteryMv = body['battery_mv'];
    const hmac = body['hmac'] as string | undefined;

    if (!deviceId || !pitCode || !timestamp || !hmac) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (!HMAC_HEX_RE.test(hmac)) {
      throw new UnauthorizedException('Unauthorized');
    }

    const payloadTime = new Date(timestamp).getTime();
    if (
      isNaN(payloadTime) ||
      Math.abs(Date.now() - payloadTime) > this.replayWindowMs
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    const device = await this.getDevice(deviceId);
    if (!device) {
      throw new UnauthorizedException('Unauthorized');
    }

    // fill_pct is signed with one decimal place (matches firmware f"{fill_pct:.1f}").
    const fillStr = Number(fillPct).toFixed(1);
    const message = `${deviceId}:${pitCode}:${timestamp}:${fillStr}:${String(batteryMv)}`;
    const expected = createHmac('sha256', device.hmacKey)
      .update(message)
      .digest('hex');

    const provided = Buffer.from(hmac, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (
      provided.length !== expectedBuf.length ||
      !timingSafeEqual(provided, expectedBuf)
    ) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.device = device;
    return true;
  }

  private async getDevice(deviceId: string): Promise<Device | null> {
    const cached = this.deviceCache.get(deviceId);
    if (cached) return cached;

    const device = await this.prisma.device.findFirst({
      where: { deviceId, active: true },
    });
    if (device) this.deviceCache.set(deviceId, device);
    return device;
  }
}
