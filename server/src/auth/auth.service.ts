import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterHouseholdDto } from './dto/register-household.dto';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }],
        active: true,
        deletedAt: null,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user);
  }

  async registerHousehold(dto: RegisterHouseholdDto) {
    await this.assertUnique(dto.phone, dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        whatsappNumber: dto.whatsappNumber ?? dto.phone,
        email: dto.email,
        passwordHash,
        role: UserRole.household,
        household: {
          create: {
            tier: 'unsensored',
            district: dto.district,
            community: dto.community,
          },
        },
      },
    });

    return this.issueToken(user);
  }

  async registerProvider(dto: RegisterProviderDto) {
    await this.assertUnique(dto.phone, dto.email);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        whatsappNumber: dto.whatsappNumber ?? dto.phone,
        email: dto.email,
        passwordHash,
        role: UserRole.provider,
        provider: {
          create: {
            businessName: dto.businessName,
            coverageZones: dto.coverageZones ?? [],
            region: dto.region,
            district: dto.district,
            vehicleCapacityLiters: dto.vehicleCapacityLiters,
          },
        },
      },
    });

    return this.issueToken(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, active: true, deletedAt: null },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    const passwordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return {
      message: 'Password changed successfully',
      ...this.issueToken(updated),
    };
  }

  private issueToken(user: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: UserRole;
    mustChangePassword: boolean;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
    return {
      access_token: this.jwt.sign(payload),
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }

  private async assertUnique(phone: string, email?: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone }, ...(email ? [{ email }] : [])],
      },
    });
    if (existing) {
      throw new ConflictException(
        'An account with this phone or email already exists',
      );
    }
  }
}
