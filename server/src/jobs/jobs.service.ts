import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DispatchMode,
  JobOfferStatus,
  JobStatus,
  PaymentMethod,
  Pit,
  Prisma,
  TriggerSource,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LocationService } from '../location/location.service';
import { SettingsService } from '../settings/settings.service';
import { haversineKm } from '../common/geo';
import { canTransition } from './job-state-machine';
import { CreateJobDto } from './dto/create-job.dto';
import { GuestRequestDto } from './dto/guest-request.dto';

const JOB_INCLUDE = {
  pit: {
    select: {
      code: true,
      name: true,
      lat: true,
      lng: true,
      ghanaPostAddress: true,
      sizeClass: true,
      zone: true,
    },
  },
  household: {
    include: {
      user: { select: { name: true, phone: true, whatsappNumber: true } },
    },
  },
  provider: { include: { user: { select: { name: true, phone: true } } } },
  payment: true,
  offers: { include: { provider: { select: { businessName: true } } } },
} satisfies Prisma.JobInclude;

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private pricing: PricingService,
    private payments: PaymentsService,
    private notifications: NotificationsService,
    private location: LocationService,
    private settings: SettingsService,
  ) {}

  // ─── Creation (all triggers converge here) ───────────────────────────────────

  /** Create a job for an existing pit. Used by sensor-fill, climate, dashboard, USSD. */
  async createForPit(
    pitId: string,
    triggerSource: TriggerSource,
    opts: {
      paymentMethod?: PaymentMethod;
      notes?: string;
      climateSnapshotId?: string;
    } = {},
  ) {
    const pit = await this.prisma.pit.findUnique({
      where: { id: pitId },
      include: { household: { include: { user: true } } },
    });
    if (!pit) throw new NotFoundException(`Pit ${pitId} not found`);

    // Guard: don't open a second active job for the same pit.
    const open = await this.prisma.job.findFirst({
      where: {
        pitId,
        status: { notIn: [JobStatus.CLOSED, JobStatus.CANCELLED] },
      },
    });
    if (open) {
      this.logger.debug(
        `Pit ${pitId} already has open job ${open.id}; skipping`,
      );
      return open;
    }

    // System-initiated triggers (sensor fill, climate pre-emption) pause for household
    // approval so the household can prepare before an operator is summoned. Direct
    // requests (dashboard, USSD, guest) are already an explicit ask and dispatch at once.
    const awaitApproval =
      triggerSource === TriggerSource.sensor_fill ||
      triggerSource === TriggerSource.climate_preempt;

    return this.createJobRow(pit, triggerSource, {
      paymentMethod: opts.paymentMethod ?? pit.household.defaultPaymentMethod,
      notes: opts.notes,
      climateSnapshotId: opts.climateSnapshotId,
      awaitApproval,
    });
  }

  /** Household dashboard request. */
  async createForHousehold(userId: string, dto: CreateJobDto) {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household profile not found');

    const pit = await this.prisma.pit.findUnique({
      where: { id: dto.pitId },
      include: { household: { include: { user: true } } },
    });
    if (!pit) throw new NotFoundException(`Pit ${dto.pitId} not found`);
    if (pit.householdId !== household.id) {
      throw new ForbiddenException('This pit does not belong to you');
    }

    return this.createForPit(dto.pitId, TriggerSource.dashboard, {
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
    });
  }

  /** Guest / USSD request with no account — creates a lightweight household + pit. */
  async createGuestRequest(dto: GuestRequestDto, triggerSource: TriggerSource) {
    const resolved = await this.location.resolve(dto.ghanaPostAddress);

    const user = await this.prisma.user.upsert({
      where: { phone: dto.phone },
      create: {
        name: dto.name ?? 'Guest',
        phone: dto.phone,
        whatsappNumber: dto.whatsapp ?? dto.phone,
        role: 'household',
        household: {
          create: {
            tier: 'unsensored',
            defaultPaymentMethod: dto.paymentMethod,
          },
        },
      },
      update: {},
      include: { household: true },
    });

    let household = user.household;
    if (!household) {
      household = await this.prisma.household.create({
        data: {
          userId: user.id,
          tier: 'unsensored',
          defaultPaymentMethod: dto.paymentMethod,
        },
      });
    }

    const count = await this.prisma.pit.count();
    const pit = await this.prisma.pit.create({
      data: {
        code: `PIT-${String(count + 1).padStart(5, '0')}`,
        householdId: household.id,
        ghanaPostAddress: resolved.ghanaPostAddress,
        lat: resolved.lat,
        lng: resolved.lng,
        locationSource: 'ghanapost_gps',
        sizeClass: dto.sizeClass ?? 'standard',
        zone: dto.zone ?? 'near',
      },
      include: { household: { include: { user: true } } },
    });

    return this.createJobRow(pit, triggerSource, {
      paymentMethod: dto.paymentMethod,
      guestPhone: dto.phone,
      guestWhatsapp: dto.whatsapp,
    });
  }

  private async createJobRow(
    pit: Pit & {
      household: {
        user: { name: string; phone: string; whatsappNumber: string | null };
      };
    },
    triggerSource: TriggerSource,
    opts: {
      paymentMethod: PaymentMethod;
      notes?: string;
      guestPhone?: string;
      guestWhatsapp?: string;
      climateSnapshotId?: string;
      awaitApproval?: boolean;
    },
  ) {
    const access = pit.floodRisk || pit.zone === 'remote';
    const price = await this.pricing.quote(pit.sizeClass, pit.zone, {
      applyAccessSurcharge: access,
    });
    const slaHours = await this.settings.get<number>('job.slaHours');
    const mode = await this.settings.get<string>('dispatch.mode');

    const now = Date.now();
    const approvalWindowHours = opts.awaitApproval
      ? await this.settings.get<number>('approval.windowHours')
      : 0;

    const job = await this.prisma.job.create({
      data: {
        pitId: pit.id,
        householdId: pit.householdId,
        triggerSource,
        status: opts.awaitApproval
          ? JobStatus.PENDING_APPROVAL
          : JobStatus.CREATED,
        dispatchMode:
          mode === 'auto' ? DispatchMode.auto : DispatchMode.assisted,
        paymentMethod: opts.paymentMethod,
        priceTotal: price.total,
        priceBreakdown: price as unknown as Prisma.InputJsonValue,
        notes: opts.notes,
        guestPhone: opts.guestPhone,
        guestWhatsapp: opts.guestWhatsapp,
        climateSnapshotId: opts.climateSnapshotId,
        slaDeadline: new Date(now + slaHours * 3_600_000),
        approvalRequestedAt: opts.awaitApproval ? new Date(now) : null,
        approvalDeadline: opts.awaitApproval
          ? new Date(now + approvalWindowHours * 3_600_000)
          : null,
      },
      include: JOB_INCLUDE,
    });

    const recipient =
      job.household.user.whatsappNumber ?? job.household.user.phone;

    // System trigger: alert the household to approve + alert district officers. No dispatch yet.
    if (opts.awaitApproval) {
      await this.notifications.notify(
        recipient,
        'job_approval_requested',
        `SaniChain: your pit ${pit.code} is full. Approve emptying (GHS ${price.total}) so we can send an operator — prepare access and payment before they arrive. Approve in the app.`,
        job.id,
      );
      await this.notifyDistrictOfficers(
        pit.district,
        `SaniChain district alert: pit ${pit.code}${pit.community ? ` (${pit.community})` : ''} reached full level and is awaiting household approval.`,
        job.id,
      );
      return this.findOne(job.id);
    }

    // Direct request: confirm and enter dispatch immediately.
    await this.notifications.notify(
      recipient,
      'job_created',
      `SaniChain: your desludging request is received (${pit.code}). Price: GHS ${price.total}. We are assigning a provider.`,
      job.id,
    );
    if (job.dispatchMode === DispatchMode.auto) {
      await this.autoAssign(job.id);
    }

    return this.findOne(job.id);
  }

  /**
   * Move an approved (or directly-requested) job into dispatch: confirm to the household
   * and, in auto mode, assign the nearest provider. Phase 0 leaves assisted jobs for an
   * admin to dispatch from the board.
   */
  private async proceedToDispatch(jobId: string) {
    const job = await this.findOne(jobId);
    const recipient =
      job.household.user.whatsappNumber ?? job.household.user.phone;
    await this.notifications.notify(
      recipient,
      'job_approved',
      `SaniChain: emptying approved for ${job.pit.code} (GHS ${String(job.priceTotal)}). We are assigning a provider now.`,
      job.id,
    );
    if (job.dispatchMode === DispatchMode.auto) {
      await this.autoAssign(job.id);
    }
    return this.findOne(jobId);
  }

  // ─── Household approval (system-triggered jobs) ──────────────────────────────

  /** Household approves a sensor/climate-triggered job → enters dispatch. */
  async approve(jobId: string, householdUserId: string) {
    const job = await this.requireOwnedByHousehold(jobId, householdUserId);
    if (job.status !== JobStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This job is not awaiting your approval');
    }
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CREATED, approvedAt: new Date() },
    });
    return this.proceedToDispatch(jobId);
  }

  /** Household declines a sensor/climate-triggered job → cancelled. */
  async declineApproval(jobId: string, householdUserId: string, reason?: string) {
    const job = await this.requireOwnedByHousehold(jobId, householdUserId);
    if (job.status !== JobStatus.PENDING_APPROVAL) {
      throw new BadRequestException('This job is not awaiting your approval');
    }
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        cancelledReason: reason ?? 'Declined by household',
        closedAt: new Date(),
      },
    });
    return this.findOne(jobId);
  }

  /**
   * Alert the district officer(s) overseeing a pit's district. Strictly scoped:
   * officers only ever hear about pits in their own district, so a pit with no
   * district (or a district with no officer) notifies no one here — admins are
   * alerted through their own channels.
   */
  private async notifyDistrictOfficers(
    district: string | null,
    body: string,
    jobId?: string,
  ) {
    if (!district) return;
    const officers = await this.prisma.user.findMany({
      where: {
        role: UserRole.district_officer,
        active: true,
        districtOfficer: { district },
      },
      select: { phone: true, whatsappNumber: true },
    });
    for (const o of officers) {
      await this.notifications.notify(
        o.whatsappNumber ?? o.phone,
        'district_pit_alert',
        body,
        jobId,
      );
    }
  }

  // ─── Dispatch ────────────────────────────────────────────────────────────────

  private async eligibleProviders(pit: {
    zone: string;
    lat: number | null;
    lng: number | null;
  }) {
    const providers = await this.prisma.provider.findMany({
      where: { verificationStatus: 'verified', available: true },
      include: { user: { select: { phone: true, whatsappNumber: true } } },
    });
    // Prefer providers covering the pit's zone; rank by distance when coords exist.
    return providers
      .filter(
        (p) =>
          p.coverageZones.length === 0 || p.coverageZones.includes(pit.zone),
      )
      .map((p) => ({
        provider: p,
        distanceKm:
          pit.lat != null &&
          pit.lng != null &&
          p.baseLat != null &&
          p.baseLng != null
            ? haversineKm(pit.lat, pit.lng, p.baseLat, p.baseLng)
            : Number.POSITIVE_INFINITY,
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /** Phase 0 — admin offers the job to one provider (one-tap). */
  async offerToProvider(jobId: string, providerId: string) {
    const job = await this.requireJob(jobId);
    this.assertTransition(job.status, JobStatus.OFFERED);

    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true },
    });
    if (!provider) throw new NotFoundException('Provider not found');
    if (provider.verificationStatus !== 'verified') {
      throw new BadRequestException('Provider is not verified');
    }
    await this.assertCashAllowed(job.paymentMethod, providerId);

    const timeout = await this.settings.get<number>(
      'dispatch.offerTimeoutMinutes',
    );
    await this.prisma.jobOffer.create({
      data: {
        jobId,
        providerId,
        expiresAt: new Date(Date.now() + timeout * 60_000),
      },
    });
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.OFFERED, offeredAt: new Date() },
    });

    await this.notifications.notify(
      provider.user.whatsappNumber ?? provider.user.phone,
      'job_offered',
      `SaniChain: new job ${jobId} (${job.pit.code}). ${job.paymentMethod === 'cash' ? 'Cash' : 'Digital'} GHS ${String(job.priceTotal)}. Reply to accept in the app.`,
      jobId,
    );
    return this.findOne(jobId);
  }

  /** Phase 1 — auto-assign nearest eligible provider. */
  async autoAssign(jobId: string) {
    const job = await this.requireJob(jobId);
    const ranked = await this.eligibleProviders(job.pit);
    if (ranked.length === 0) {
      this.logger.warn(
        `No eligible providers for job ${jobId}; awaiting admin`,
      );
      return this.findOne(jobId);
    }
    const best = ranked[0].provider;
    const timeout = await this.settings.get<number>(
      'dispatch.offerTimeoutMinutes',
    );

    await this.prisma.jobOffer.create({
      data: {
        jobId,
        providerId: best.id,
        expiresAt: new Date(Date.now() + timeout * 60_000),
      },
    });
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.ASSIGNED,
        assignedProviderId: best.id,
        offeredAt: new Date(),
      },
    });

    const provider = await this.prisma.provider.findUnique({
      where: { id: best.id },
      include: { user: true },
    });
    if (provider) {
      await this.notifications.notify(
        provider.user.whatsappNumber ?? provider.user.phone,
        'job_assigned',
        `SaniChain: you have a new job ${jobId} (${job.pit.code}). Accept in the app.`,
        jobId,
      );
    }
    return this.findOne(jobId);
  }

  /** Phase 1 — broadcast to all eligible providers; first to accept wins. */
  async broadcast(jobId: string) {
    const job = await this.requireJob(jobId);
    const ranked = await this.eligibleProviders(job.pit);
    if (ranked.length === 0) return this.findOne(jobId);

    const timeout = await this.settings.get<number>(
      'dispatch.offerTimeoutMinutes',
    );
    const expiresAt = new Date(Date.now() + timeout * 60_000);

    for (const { provider } of ranked) {
      await this.prisma.jobOffer.upsert({
        where: { jobId_providerId: { jobId, providerId: provider.id } },
        create: { jobId, providerId: provider.id, expiresAt },
        update: {
          status: JobOfferStatus.pending,
          expiresAt,
          respondedAt: null,
        },
      });
      await this.notifications.notify(
        provider.user.whatsappNumber ?? provider.user.phone,
        'job_broadcast',
        `SaniChain: job ${jobId} (${job.pit.code}) available — first to accept wins.`,
        jobId,
      );
    }
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.OFFERED,
        assignedProviderId: null,
        offeredAt: new Date(),
      },
    });
    return this.findOne(jobId);
  }

  /** Scheduled sweep: escalate auto/assisted offers that expired without acceptance. */
  async escalateExpiredOffers() {
    const now = new Date();
    const stale = await this.prisma.job.findMany({
      where: {
        status: { in: [JobStatus.OFFERED, JobStatus.ASSIGNED] },
        offers: {
          some: { status: JobOfferStatus.pending, expiresAt: { lt: now } },
        },
      },
      select: { id: true, dispatchMode: true },
    });
    for (const job of stale) {
      await this.prisma.jobOffer.updateMany({
        where: {
          jobId: job.id,
          status: JobOfferStatus.pending,
          expiresAt: { lt: now },
        },
        data: { status: JobOfferStatus.expired },
      });
      if (job.dispatchMode === DispatchMode.auto) {
        await this.broadcast(job.id);
      } else {
        this.logger.warn(
          `Assisted job ${job.id} offer expired — needs admin re-dispatch`,
        );
      }
    }
    return { escalated: stale.length };
  }

  /** Scheduled sweep: flag overdue jobs (past SLA deadline, not yet completed). */
  async detectSlaBreaches() {
    const now = new Date();
    const overdue = await this.prisma.job.findMany({
      where: {
        slaDeadline: { lt: now },
        status: {
          in: [
            JobStatus.CREATED,
            JobStatus.OFFERED,
            JobStatus.ASSIGNED,
            JobStatus.ACCEPTED,
            JobStatus.EN_ROUTE,
          ],
        },
      },
      select: { id: true },
    });
    for (const job of overdue) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.SLA_BREACHED },
      });
      this.logger.warn(`Job ${job.id} breached SLA — escalated`);
    }
    return { breached: overdue.length };
  }

  /**
   * Scheduled sweep: remind households whose approval is overdue and raise a one-time
   * monitoring flag to district officers + admin. Never auto-dispatches — the household must
   * always prepare first (see plan §A3).
   */
  async remindAndFlagOverdueApprovals() {
    const now = new Date();
    const overdue = await this.prisma.job.findMany({
      where: {
        status: JobStatus.PENDING_APPROVAL,
        approvalDeadline: { lt: now },
        overdueFlaggedAt: null,
      },
      include: { pit: true, household: { include: { user: true } } },
    });
    for (const job of overdue) {
      const recipient =
        job.household.user.whatsappNumber ?? job.household.user.phone;
      await this.notifications.notify(
        recipient,
        'job_approval_reminder',
        `SaniChain: your pit ${job.pit.code} is full and still needs your approval to send an operator. Please approve soon to avoid an overflow.`,
        job.id,
      );
      await this.notifyDistrictOfficers(
        job.pit.district,
        `SaniChain district alert: pit ${job.pit.code} approval is OVERDUE — household has not approved emptying within the window. Monitoring flag raised.`,
        job.id,
      );
      await this.prisma.job.update({
        where: { id: job.id },
        data: { overdueFlaggedAt: new Date() },
      });
    }
    if (overdue.length) {
      this.logger.warn(`${overdue.length} overdue approval(s) flagged`);
    }
    return { flagged: overdue.length };
  }

  // ─── Provider actions ────────────────────────────────────────────────────────

  async accept(jobId: string, providerUserId: string) {
    const providerId = await this.providerId(providerUserId);
    const job = await this.requireJob(jobId);
    this.assertTransition(job.status, JobStatus.ACCEPTED);

    const offer = await this.prisma.jobOffer.findUnique({
      where: { jobId_providerId: { jobId, providerId } },
    });
    if (!offer || offer.status === JobOfferStatus.expired) {
      throw new BadRequestException('No active offer for you on this job');
    }
    await this.assertCashAllowed(job.paymentMethod, providerId);

    await this.prisma.$transaction([
      this.prisma.jobOffer.update({
        where: { id: offer.id },
        data: { status: JobOfferStatus.accepted, respondedAt: new Date() },
      }),
      this.prisma.jobOffer.updateMany({
        where: {
          jobId,
          providerId: { not: providerId },
          status: JobOfferStatus.pending,
        },
        data: { status: JobOfferStatus.expired },
      }),
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.ACCEPTED,
          assignedProviderId: providerId,
          acceptedAt: new Date(),
        },
      }),
    ]);

    const job2 = await this.findOne(jobId);
    await this.notifications.notify(
      job2.household.user.whatsappNumber ?? job2.household.user.phone,
      'job_accepted',
      `SaniChain: a provider accepted your job ${jobId}. They will be on the way.`,
      jobId,
    );
    return job2;
  }

  async decline(jobId: string, providerUserId: string) {
    const providerId = await this.providerId(providerUserId);
    await this.prisma.jobOffer.updateMany({
      where: { jobId, providerId, status: JobOfferStatus.pending },
      data: { status: JobOfferStatus.declined, respondedAt: new Date() },
    });
    return this.findOne(jobId);
  }

  async markEnRoute(jobId: string, providerUserId: string) {
    const providerId = await this.providerId(providerUserId);
    const job = await this.requireOwnedByProvider(jobId, providerId);
    this.assertTransition(job.status, JobStatus.EN_ROUTE);
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.EN_ROUTE, enRouteAt: new Date() },
    });
    const j = await this.findOne(jobId);
    await this.notifications.notify(
      j.household.user.whatsappNumber ?? j.household.user.phone,
      'job_en_route',
      `SaniChain: your provider is en route for job ${jobId}.`,
      jobId,
    );
    return j;
  }

  /** Provider marks DONE → completion triggers payment (cash ledger or digital charge). */
  async markDone(jobId: string, providerUserId: string) {
    const providerId = await this.providerId(providerUserId);
    const job = await this.requireOwnedByProvider(jobId, providerId);
    this.assertTransition(job.status, JobStatus.COMPLETED);

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED, completedAt: new Date() },
    });

    if (job.paymentMethod === PaymentMethod.cash) {
      await this.payments.recordCashCompletion(jobId);
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.PAID_CASH, paidAt: new Date() },
      });
      const j = await this.findOne(jobId);
      await this.notifications.notify(
        j.household.user.whatsappNumber ?? j.household.user.phone,
        'job_paid_cash',
        `SaniChain: job ${jobId} completed and marked paid by cash. Receipt: GHS ${String(j.priceTotal)}.`,
        jobId,
      );
      return j;
    }

    // Digital: charge now (mock settles immediately; live returns a checkout URL + webhook).
    const result = await this.payments.chargeJobDigital(jobId);
    const j = await this.findOne(jobId);
    return { ...j, authorizationUrl: result.authorizationUrl };
  }

  async cancel(jobId: string, reason?: string) {
    const job = await this.requireJob(jobId);
    this.assertTransition(job.status, JobStatus.CANCELLED);
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.CANCELLED,
        cancelledReason: reason,
        closedAt: new Date(),
      },
    });
    return this.findOne(jobId);
  }

  async close(jobId: string) {
    const job = await this.requireJob(jobId);
    this.assertTransition(job.status, JobStatus.CLOSED);
    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CLOSED, closedAt: new Date() },
    });
    return this.findOne(jobId);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findAll(
    filters: { status?: JobStatus; limit?: number; offset?: number } = {},
  ) {
    const { status, limit = 50, offset = 0 } = filters;
    const where: Prisma.JobWhereInput = status ? { status } : {};
    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        include: JOB_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
      }),
    ]);
    return { total, jobs };
  }

  async findForProvider(providerUserId: string, status?: JobStatus) {
    const providerId = await this.providerId(providerUserId);
    const where: Prisma.JobWhereInput = {
      OR: [
        { assignedProviderId: providerId },
        { offers: { some: { providerId, status: JobOfferStatus.pending } } },
      ],
      ...(status ? { status } : {}),
    };
    return this.prisma.job.findMany({
      where,
      include: JOB_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: JOB_INCLUDE,
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async requireJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { pit: true },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }

  private async requireOwnedByProvider(jobId: string, providerId: string) {
    const job = await this.requireJob(jobId);
    if (job.assignedProviderId !== providerId) {
      throw new ForbiddenException('This job is not assigned to you');
    }
    return job;
  }

  private async requireOwnedByHousehold(jobId: string, userId: string) {
    const household = await this.prisma.household.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!household) throw new NotFoundException('Household profile not found');
    const job = await this.requireJob(jobId);
    if (job.householdId !== household.id) {
      throw new ForbiddenException('This job does not belong to you');
    }
    return job;
  }

  private async providerId(userId: string): Promise<string> {
    const provider = await this.prisma.provider.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!provider) throw new NotFoundException('Provider profile not found');
    return provider.id;
  }

  private assertTransition(from: JobStatus, to: JobStatus) {
    if (!canTransition(from, to)) {
      throw new BadRequestException(`Illegal job transition ${from} → ${to}`);
    }
  }

  private async assertCashAllowed(method: PaymentMethod, providerId: string) {
    if (method !== PaymentMethod.cash) return;
    const ok = await this.payments.canTakeCashJob(providerId);
    if (!ok) {
      throw new BadRequestException(
        'Provider has reached their cash credit limit; settle the commission ledger first',
      );
    }
  }
}
