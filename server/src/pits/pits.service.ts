import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LocationSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { CreatePitDto } from './dto/create-pit.dto';
import { RegisterSensorDto } from './dto/register-sensor.dto';

@Injectable()
export class PitsService {
  constructor(
    private prisma: PrismaService,
    private location: LocationService,
  ) {}

  private async householdId(userId: string): Promise<string> {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household profile not found');
    return household.id;
  }

  private async generateCode(): Promise<string> {
    const count = await this.prisma.pit.count();
    return `PIT-${String(count + 1).padStart(5, '0')}`;
  }

  async create(userId: string, dto: CreatePitDto) {
    const householdId = await this.householdId(userId);
    const resolved = await this.location.resolve(dto.ghanaPostAddress);

    return this.prisma.pit.create({
      data: {
        code: await this.generateCode(),
        householdId,
        name: dto.name,
        ghanaPostAddress: resolved.ghanaPostAddress,
        lat: resolved.lat,
        lng: resolved.lng,
        locationSource: LocationSource.ghanapost_gps,
        sizeClass: dto.sizeClass ?? 'standard',
        zone: dto.zone ?? 'near',
        pitDepthCm: dto.pitDepthCm ?? 200,
        dropHoles: dto.dropHoles,
        floodRisk: dto.floodRisk ?? false,
        district: dto.district,
        community: dto.community,
      },
    });
  }

  async listForUser(userId: string) {
    const householdId = await this.householdId(userId);
    return this.prisma.pit.findMany({
      where: { householdId, active: true },
      include: {
        devices: { where: { active: true } },
        readings: { orderBy: { sensorTs: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOwned(userId: string, pitId: string) {
    const householdId = await this.householdId(userId);
    const pit = await this.prisma.pit.findUnique({
      where: { id: pitId },
      include: {
        devices: true,
        readings: { orderBy: { sensorTs: 'desc' }, take: 20 },
      },
    });
    if (!pit) throw new NotFoundException(`Pit ${pitId} not found`);
    if (pit.householdId !== householdId) {
      throw new ForbiddenException('This pit does not belong to you');
    }
    return pit;
  }

  /**
   * Bind a sensor device to a pit and flag it sensored. Location for a sensored pit
   * derives from the device's GPRS-reported coordinates once readings arrive
   * (locationSource = sensor_gprs), so no address entry is required.
   */
  async registerSensor(userId: string, pitId: string, dto: RegisterSensorDto) {
    const pit = await this.getOwned(userId, pitId);

    const existing = await this.prisma.device.findUnique({
      where: { deviceId: dto.deviceId },
    });
    if (existing) {
      throw new ConflictException(
        `Device ${dto.deviceId} is already registered`,
      );
    }

    const [device] = await this.prisma.$transaction([
      this.prisma.device.create({
        data: {
          deviceId: dto.deviceId,
          pitId: pit.id,
          hmacKey: dto.hmacKey,
          installedAt: new Date(),
        },
      }),
      this.prisma.pit.update({
        where: { id: pit.id },
        data: {
          sensored: true,
          locationSource: LocationSource.sensor_gprs,
          ...(dto.pitDepthCm ? { pitDepthCm: dto.pitDepthCm } : {}),
        },
      }),
      this.prisma.household.update({
        where: { id: pit.householdId },
        data: { tier: 'sensored' },
      }),
    ]);

    return device;
  }
}
