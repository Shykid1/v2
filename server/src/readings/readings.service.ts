import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Device, LocationSource, TriggerSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { SettingsService } from '../settings/settings.service';
import { CreateReadingDto } from './dto/create-reading.dto';

@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);

  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
    private settings: SettingsService,
  ) {}

  /**
   * Ingest a signed sensor reading. Updates the device heartbeat and, for a sensored
   * pit, derives the pit's location from the GPRS-reported coordinates. When the fill
   * level crosses the threshold, a sensor-fill Job is created automatically (SN-04).
   */
  async ingest(dto: CreateReadingDto, device: Device) {
    const pit = await this.prisma.pit.findFirst({
      where: { code: dto.pit_code, active: true },
    });
    if (!pit) throw new NotFoundException(`Pit ${dto.pit_code} not found`);

    const sensorTs = new Date(dto.timestamp);

    const duplicate = await this.prisma.reading.findUnique({
      where: { deviceId_sensorTs: { deviceId: device.deviceId, sensorTs } },
    });
    if (duplicate) {
      throw new ConflictException(
        'Duplicate reading for this device and timestamp',
      );
    }

    const hasCoords = dto.lat !== undefined && dto.lng !== undefined;

    const reading = await this.prisma.$transaction(async (tx) => {
      const r = await tx.reading.create({
        data: {
          pitId: pit.id,
          deviceId: device.deviceId,
          fillPct: dto.fill_pct,
          fillCm: dto.fill_cm ?? (dto.fill_pct * pit.pitDepthCm) / 100,
          temperatureC: dto.temperature_c,
          humidityPct: dto.humidity_pct,
          batteryMv: dto.battery_mv,
          rssi: dto.rssi,
          hmacValid: true,
          sensorTs,
          lat: dto.lat,
          lng: dto.lng,
        },
      });
      await tx.device.update({
        where: { id: device.id },
        data: {
          lastSeen: new Date(),
          ...(hasCoords ? { lastLat: dto.lat, lastLng: dto.lng } : {}),
        },
      });
      // Sensored pit: keep coordinates fresh from the device GPRS fix.
      if (hasCoords && pit.locationSource === LocationSource.sensor_gprs) {
        await tx.pit.update({
          where: { id: pit.id },
          data: { lat: dto.lat, lng: dto.lng },
        });
      }
      return r;
    });

    // Threshold → auto job (only for sensored pits).
    let jobCreated: string | null = null;
    const threshold = await this.settings.get<number>(
      'sensor.fillThresholdPct',
    );
    if (pit.sensored && dto.fill_pct >= threshold) {
      const job = await this.jobs.createForPit(
        pit.id,
        TriggerSource.sensor_fill,
      );
      jobCreated = job.id;
      this.logger.log(
        `Pit ${pit.code} at ${dto.fill_pct}% ≥ ${threshold}% → job ${job.id}`,
      );
    }

    return {
      reading_id: reading.id,
      fill_pct: dto.fill_pct,
      job_created: jobCreated,
    };
  }

  async findByPit(pitId: string, limit = 50) {
    return this.prisma.reading.findMany({
      where: { pitId },
      orderBy: { sensorTs: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
