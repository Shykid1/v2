import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        household: { include: { pits: true } },
        provider: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const safe: Partial<typeof user> = { ...user };
    delete safe.passwordHash;
    return safe;
  }

  /** Resolve the Household row for a household user (throws if missing). */
  async householdIdFor(userId: string): Promise<string> {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household profile not found');
    return household.id;
  }

  /** Resolve the Provider row for a provider user (throws if missing). */
  async providerIdFor(userId: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider.id;
  }
}
