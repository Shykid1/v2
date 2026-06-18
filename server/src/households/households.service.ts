import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHouseholdDto } from './dto/update-household.dto';

@Injectable()
export class HouseholdsService {
  constructor(private prisma: PrismaService) {}

  async getByUser(userId: string) {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, phone: true, whatsappNumber: true } },
        pits: { where: { active: true } },
      },
    });
    if (!household) throw new NotFoundException('Household profile not found');
    return household;
  }

  async update(userId: string, dto: UpdateHouseholdDto) {
    const household = await this.getByUser(userId);

    if (dto.whatsappNumber !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { whatsappNumber: dto.whatsappNumber },
      });
    }

    return this.prisma.household.update({
      where: { id: household.id },
      data: {
        defaultPaymentMethod: dto.defaultPaymentMethod,
        district: dto.district,
        community: dto.community,
      },
    });
  }

  /** A household's job history (most recent first). */
  async jobs(userId: string) {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household profile not found');

    return this.prisma.job.findMany({
      where: { householdId: household.id },
      include: {
        pit: { select: { code: true, name: true } },
        provider: { select: { businessName: true } },
        payment: { select: { method: true, status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
