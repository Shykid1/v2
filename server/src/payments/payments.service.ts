import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  JobStatus,
  LedgerEntryType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { PaystackClient } from './paystack.client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private paystack: PaystackClient,
    private notifications: NotificationsService,
    private settings: SettingsService,
  ) {}

  splitFor(total: number, providerSplitPercent: number) {
    const providerAmount = Math.round(total * providerSplitPercent) / 100;
    const commissionAmount = Math.round((total - providerAmount) * 100) / 100;
    return { providerAmount, commissionAmount };
  }

  // ─── Provider onboarding ─────────────────────────────────────────────────────

  async createSubaccount(input: {
    businessName: string;
    settlementBank: string;
    accountNumber: string;
  }): Promise<string> {
    // Providers are not tiered and pay no subscription — every job uses the flat,
    // admin-editable platform commission percentage.
    const platformCommissionPercent =
      await this.settings.get<number>('commission.percent');

    return this.paystack.createSubaccount({
      businessName: input.businessName,
      settlementBank: input.settlementBank,
      accountNumber: input.accountNumber,
      percentageCharge: platformCommissionPercent,
    });
  }

  // ─── Job payments ────────────────────────────────────────────────────────────

  private reference(prefix: string): string {
    return `${prefix}-${randomUUID()}`;
  }

  /**
   * Digital charge for a job. In mock mode it settles immediately so the slice is
   * exercisable; with a real key it initializes a Paystack transaction (split to the
   * provider subaccount, platform commission as the transaction charge) and returns a
   * checkout URL — final settlement arrives via webhook.
   */
  async chargeJobDigital(jobId: string): Promise<{
    payment: { id: string; status: PaymentStatus };
    authorizationUrl?: string;
  }> {
    const job = await this.loadJobForPayment(jobId);
    if (!job.assignedProviderId || !job.provider) {
      throw new BadRequestException('Job has no assigned provider');
    }
    const total = Number(job.priceTotal ?? 0);
    if (total <= 0) throw new BadRequestException('Job has no price');

    const split = await this.providerSplit(total);
    const email =
      job.household.user.email ?? `${job.household.user.phone}@sanichain.local`;
    const reference = this.reference('JOB');

    const existing = await this.prisma.payment.findUnique({ where: { jobId } });
    const init = await this.paystack.initializeTransaction({
      email,
      amount: total,
      reference,
      subaccount: job.provider.paystackSubaccountCode ?? undefined,
      transactionCharge: split.commissionAmount,
      metadata: { jobId, type: 'job' },
    });

    const data: Prisma.PaymentUncheckedCreateInput = {
      jobId,
      householdId: job.householdId,
      providerId: job.assignedProviderId,
      purpose: 'job',
      method: PaymentMethod.paystack,
      status: this.paystack.mock
        ? PaymentStatus.success
        : PaymentStatus.pending,
      amount: total,
      commissionAmount: split.commissionAmount,
      providerAmount: split.providerAmount,
      subaccountCode: job.provider.paystackSubaccountCode,
      paystackRef: init.reference,
      paystackAccessCode: init.accessCode,
      idempotencyKey: reference,
      paidAt: this.paystack.mock ? new Date() : null,
    };

    const payment = existing
      ? await this.prisma.payment.update({ where: { jobId }, data })
      : await this.prisma.payment.create({ data });

    if (this.paystack.mock) {
      await this.settleDigitalJob(
        jobId,
        job.assignedProviderId,
        split.providerAmount,
      );
    } else {
      // Live: send the checkout link to the household so they can pay (final
      // settlement of the split arrives via the Paystack webhook).
      await this.notifications.notify(
        job.household.user.whatsappNumber ?? job.household.user.phone,
        'job_payment_link',
        `SaniChain: pay GHS ${total} for desludging job ${jobId}: ${init.authorizationUrl}`,
        jobId,
      );
    }

    return {
      payment: { id: payment.id, status: payment.status },
      authorizationUrl: this.paystack.mock ? undefined : init.authorizationUrl,
    };
  }

  /** Provider attests cash collected: record payment + accrue commission to the ledger. */
  async recordCashCompletion(jobId: string) {
    const job = await this.loadJobForPayment(jobId);
    if (!job.assignedProviderId) {
      throw new BadRequestException('Job has no assigned provider');
    }
    const total = Number(job.priceTotal ?? 0);
    const split = await this.providerSplit(total);

    await this.prisma.payment.upsert({
      where: { jobId },
      create: {
        jobId,
        householdId: job.householdId,
        providerId: job.assignedProviderId,
        purpose: 'job',
        method: PaymentMethod.cash,
        status: PaymentStatus.success,
        amount: total,
        commissionAmount: split.commissionAmount,
        providerAmount: split.providerAmount,
        paidAt: new Date(),
      },
      update: { status: PaymentStatus.success, paidAt: new Date() },
    });

    await this.accrueCommission(
      job.assignedProviderId,
      jobId,
      split.commissionAmount,
    );
  }

  /** Block new cash jobs once outstanding commission exceeds the credit limit. */
  async canTakeCashJob(providerId: string): Promise<boolean> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { ledgerBalance: true, creditLimit: true },
    });
    if (!provider) return false;
    const limit = Number(provider.creditLimit);
    if (limit <= 0) return true; // 0 = no limit (pilot default)
    return Number(provider.ledgerBalance) < limit;
  }

  private async accrueCommission(
    providerId: string,
    jobId: string,
    amount: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const provider = await tx.provider.update({
        where: { id: providerId },
        data: { ledgerBalance: { increment: amount } },
      });
      await tx.commissionLedgerEntry.create({
        data: {
          providerId,
          jobId,
          type: LedgerEntryType.commission_accrued,
          amount,
          balanceAfter: provider.ledgerBalance,
          note: 'Commission owed on cash job',
        },
      });
    });
  }

  /**
   * On a successful digital job, mark it PAID and net any outstanding cash-commission
   * balance against the provider's split payout.
   */
  private async settleDigitalJob(
    jobId: string,
    providerId: string,
    providerAmount: number,
  ) {
    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.PAID, paidAt: new Date() },
      include: { household: { include: { user: true } } },
    });

    // Net cash-commission owed against this digital payout.
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: { ledgerBalance: true },
    });
    const owed = Number(provider?.ledgerBalance ?? 0);
    if (owed > 0) {
      const netted = Math.min(owed, providerAmount);
      await this.prisma.$transaction(async (tx) => {
        const p = await tx.provider.update({
          where: { id: providerId },
          data: { ledgerBalance: { decrement: netted } },
        });
        await tx.commissionLedgerEntry.create({
          data: {
            providerId,
            jobId,
            type: LedgerEntryType.payout_netted,
            amount: -netted,
            balanceAfter: p.ledgerBalance,
            note: 'Netted against digital split payout',
          },
        });
      });
    }

    await this.notifications.notify(
      job.household.user.whatsappNumber ?? job.household.user.phone,
      'job_paid',
      `SaniChain: payment received for your desludging job ${jobId}. Thank you!`,
      jobId,
    );
  }

  // ─── Sensor purchase ─────────────────────────────────────────────────────────

  async sensorCheckout(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const reference = this.reference('SENSOR');
    const email = user.email ?? `${user.phone}@sanichain.local`;

    const init = await this.paystack.initializeTransaction({
      email,
      amount,
      reference,
      metadata: { userId, type: 'sensor_purchase' },
    });

    await this.prisma.payment.create({
      data: {
        householdId: (
          await this.prisma.household.findUnique({
            where: { userId },
            select: { id: true },
          })
        )?.id,
        purpose: 'sensor_purchase',
        method: PaymentMethod.paystack,
        status: this.paystack.mock
          ? PaymentStatus.success
          : PaymentStatus.pending,
        amount,
        paystackRef: init.reference,
        idempotencyKey: reference,
        paidAt: this.paystack.mock ? new Date() : null,
      },
    });

    return {
      authorizationUrl: init.authorizationUrl,
      reference: init.reference,
    };
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.paystack.verifyWebhook(rawBody, signature)) {
      throw new BadRequestException('Invalid Paystack signature');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      data: { reference?: string; status?: string };
    };

    if (event.event === 'charge.success' && event.data.reference) {
      await this.reconcileCharge(event.data.reference);
    }
    return { received: true };
  }

  /** Idempotent: a repeated webhook for an already-successful payment is a no-op. */
  private async reconcileCharge(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paystackRef: reference },
    });
    if (!payment) {
      this.logger.warn(`Webhook for unknown reference ${reference}`);
      return;
    }
    if (payment.status === PaymentStatus.success) return; // already settled

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.success, paidAt: new Date() },
    });

    if (payment.purpose === 'job' && payment.jobId && payment.providerId) {
      await this.settleDigitalJob(
        payment.jobId,
        payment.providerId,
        Number(payment.providerAmount ?? 0),
      );
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Flat platform commission: provider keeps (100 − commission.percent)% of every job. */
  private async providerSplit(total: number) {
    const commissionPercent =
      await this.settings.get<number>('commission.percent');
    return this.splitFor(total, 100 - commissionPercent);
  }

  private async loadJobForPayment(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        household: { include: { user: true } },
        provider: true,
      },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }
}
