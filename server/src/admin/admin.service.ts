import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

const ONLINE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type FacilityStatus = 'ok' | 'warning' | 'critical' | 'unknown';

function fillStatus(fillPct: number | null): FacilityStatus {
  if (fillPct === null) return 'unknown';
  if (fillPct >= 80) return 'critical';
  if (fillPct >= 60) return 'warning';
  return 'ok';
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /** All pits with their device, latest reading, owner, and a derived facility status. */
  async facilities() {
    const pits = await this.prisma.pit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        household: {
          include: { user: { select: { name: true, phone: true } } },
        },
        devices: {
          select: {
            deviceId: true,
            lastSeen: true,
            lastLat: true,
            lastLng: true,
            active: true,
          },
        },
        readings: {
          orderBy: { sensorTs: 'desc' },
          take: 1,
          select: { fillPct: true, batteryMv: true, sensorTs: true },
        },
      },
    });

    return pits.map((p) => this.toFacility(p));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toFacility(p: any) {
    const reading = p.readings[0] ?? null;
    const fillPct = reading ? Number(reading.fillPct) : null;
    const device = p.devices[0] ?? null;
    const online =
      device?.lastSeen != null &&
      Date.now() - device.lastSeen.getTime() < ONLINE_WINDOW_MS;

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      ghanaPostAddress: p.ghanaPostAddress,
      sizeClass: p.sizeClass,
      zone: p.zone,
      sensored: p.sensored,
      pitDepthCm: p.pitDepthCm,
      district: p.district,
      community: p.community,
      active: p.active,
      household: p.household
        ? { name: p.household.user.name, phone: p.household.user.phone }
        : null,
      device: device
        ? {
            deviceId: device.deviceId,
            lastSeen: device.lastSeen,
            online,
            batteryMv: reading?.batteryMv ?? null,
          }
        : null,
      fillPct,
      lastReadingAt: reading?.sensorTs ?? null,
      status: fillStatus(fillPct),
    };
  }

  /** A single facility (pit) with reading history and recent jobs, for the detail page. */
  async facility(id: string) {
    const pit = await this.prisma.pit.findUnique({
      where: { id },
      include: {
        household: {
          include: { user: { select: { name: true, phone: true } } },
        },
        devices: {
          select: {
            deviceId: true,
            lastSeen: true,
            lastLat: true,
            lastLng: true,
            active: true,
          },
        },
        readings: {
          orderBy: { sensorTs: 'desc' },
          take: 20,
          select: {
            fillPct: true,
            batteryMv: true,
            temperatureC: true,
            sensorTs: true,
          },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            triggerSource: true,
            priceTotal: true,
            paymentMethod: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });
    if (!pit) throw new NotFoundException('Facility not found');

    return {
      ...this.toFacility(pit),
      readings: pit.readings.map((r) => ({
        fillPct: Number(r.fillPct),
        batteryMv: r.batteryMv,
        temperatureC: r.temperatureC != null ? Number(r.temperatureC) : null,
        sensorTs: r.sensorTs,
      })),
      jobs: pit.jobs,
    };
  }

  /** All users with their linked household / provider summary. Never returns password hashes. */
  async users() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        household: { select: { tier: true } },
        provider: { select: { businessName: true, verificationStatus: true } },
        districtOfficer: { select: { district: true, region: true, title: true } },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      whatsappNumber: u.whatsappNumber,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      household: u.household,
      provider: u.provider,
      districtOfficer: u.districtOfficer,
    }));
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (existing)
      throw new ConflictException('A user with this phone already exists');

    if (dto.role === UserRole.provider && !dto.businessName && !dto.name) {
      throw new BadRequestException('Provider accounts need a business name');
    }

    if (dto.role === UserRole.district_officer && !dto.district?.trim()) {
      throw new BadRequestException('District officers must be assigned a district');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        whatsappNumber: dto.whatsappNumber ?? null,
        role: dto.role,
        passwordHash,
        mustChangePassword: true,
        ...(dto.role === UserRole.household && { household: { create: {} } }),
        ...(dto.role === UserRole.provider && {
          provider: { create: { businessName: dto.businessName ?? dto.name } },
        }),
        ...(dto.role === UserRole.district_officer && {
          districtOfficer: {
            create: {
              district: dto.district ?? null,
              region: dto.region ?? null,
              title: dto.title ?? null,
            },
          },
        }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return user;
  }

  async setActive(id: string, active: boolean, actingUserId: string) {
    if (id === actingUserId && !active) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { active },
      select: { id: true, active: true },
    });
  }
}
