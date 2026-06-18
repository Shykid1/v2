import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, Prisma, ProviderVerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class ProvidersService {
  constructor(
    private prisma: PrismaService,
    private payments: PaymentsService,
    private notifications: NotificationsService,
  ) {}

  private async byUser(userId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider;
  }

  getMe(userId: string) {
    return this.byUser(userId);
  }

  async update(userId: string, dto: UpdateProviderDto) {
    const provider = await this.byUser(userId);

    if (dto.whatsappNumber !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { whatsappNumber: dto.whatsappNumber },
      });
    }

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        coverageZones: dto.coverageZones,
        region: dto.region,
        district: dto.district,
        vehicleCapacityLiters: dto.vehicleCapacityLiters,
        available: dto.available,
        baseLat: dto.baseLat,
        baseLng: dto.baseLng,
      },
    });
  }

  /** Provider submits settlement details — creates a pending Paystack subaccount. */
  async submitKyc(userId: string, dto: SubmitKycDto) {
    const provider = await this.byUser(userId);

    const subaccountCode = await this.payments.createSubaccount({
      businessName: provider.businessName,
      settlementBank: dto.settlementBank,
      accountNumber: dto.accountNumber,
    });

    return this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        kycStatus: KycStatus.pending,
        paystackSubaccountCode: subaccountCode,
      },
    });
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  list(status?: ProviderVerificationStatus) {
    const where: Prisma.ProviderWhereInput = status
      ? { verificationStatus: status }
      : {};
    return this.prisma.provider.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true, whatsappNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin detail view: a single provider with owner, recent jobs, and ledger. */
  async findOne(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: { name: true, phone: true, whatsappNumber: true, email: true },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            priceTotal: true,
            paymentMethod: true,
            createdAt: true,
            completedAt: true,
            pit: { select: { code: true, name: true } },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    return provider;
  }

  /**
   * Admin approves a provider. Requires KYC (subaccount) so payouts can settle.
   * Providers are not tiered and pay no subscription.
   */
  async verify(providerId: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    if (!provider.paystackSubaccountCode) {
      throw new BadRequestException(
        'Provider must submit KYC (settlement details) before verification',
      );
    }

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        verificationStatus: ProviderVerificationStatus.verified,
        kycStatus: KycStatus.verified,
      },
    });

    await this.notifications.send({
      channel: 'whatsapp',
      template: 'provider_verified',
      recipient: provider.user.whatsappNumber ?? provider.user.phone,
      body: `Welcome to SaniChain, ${provider.businessName}! Your account is verified — you can now accept jobs.`,
    });

    return updated;
  }

  async reject(providerId: string, reason?: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    const updated = await this.prisma.provider.update({
      where: { id: providerId },
      data: { verificationStatus: ProviderVerificationStatus.rejected },
    });

    await this.notifications.send({
      channel: 'sms',
      template: 'provider_rejected',
      recipient: provider.user.phone,
      body: `SaniChain: your provider application needs attention. ${reason ?? 'Please contact support.'}`,
    });

    return updated;
  }

  /** Transactions + revenue history for a provider. */
  async earnings(userId: string) {
    const provider = await this.byUser(userId);
    const [payments, ledger] = await Promise.all([
      this.prisma.payment.findMany({
        where: { providerId: provider.id, purpose: 'job' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.commissionLedgerEntry.findMany({
        where: { providerId: provider.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return {
      ledgerBalance: Number(provider.ledgerBalance),
      creditLimit: Number(provider.creditLimit),
      payments,
      ledger,
    };
  }
}
