import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminService } from '../admin/admin.service';
import { ReportsService } from '../reports/reports.service';

const DISTRICT_JOB_INCLUDE = {
  pit: {
    select: { code: true, name: true, district: true, community: true, zone: true },
  },
  household: { include: { user: { select: { name: true, phone: true } } } },
} satisfies Prisma.JobInclude;

/** Sentinel that matches no job, used to return an empty scope. */
const MATCH_NONE: Prisma.JobWhereInput = { id: '__none__' };

/**
 * District officer (regulator) views. Read-only monitoring strictly scoped to the
 * officer's own district, plus a regulatory "escalate" action. Admins are unscoped
 * and see every district. Aggregation is reused from AdminService and ReportsService —
 * this layer only scopes and assembles.
 */
@Injectable()
export class DistrictService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private admin: AdminService,
    private reports: ReportsService,
  ) {}

  /**
   * Resolve the data scope for a caller.
   * - admin → unscoped (sees every district).
   * - district officer → scoped to their district; an officer with no district set
   *   sees nothing (district === null while scoped === true).
   */
  private async scopeFor(
    userId: string,
  ): Promise<{ scoped: boolean; district: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, districtOfficer: { select: { district: true } } },
    });
    if (!user || user.role === UserRole.admin) {
      return { scoped: false, district: null };
    }
    return { scoped: true, district: user.districtOfficer?.district ?? null };
  }

  private jobWhere(scope: {
    scoped: boolean;
    district: string | null;
  }): Prisma.JobWhereInput {
    if (!scope.scoped) return {};
    if (!scope.district) return MATCH_NONE;
    return { pit: { district: scope.district } };
  }

  private scopeFacilities<T extends { district: string | null }>(
    facilities: T[],
    scope: { scoped: boolean; district: string | null },
  ): T[] {
    if (!scope.scoped) return facilities;
    if (!scope.district) return [];
    return facilities.filter((f) => f.district === scope.district);
  }

  async overview(userId: string) {
    const scope = await this.scopeFor(userId);
    const facilities = this.scopeFacilities(await this.admin.facilities(), scope);
    const now = new Date();
    const base = this.jobWhere(scope);

    const [pendingApprovals, overdueApprovals, slaBreaches, jobsTotal, jobsCompleted] =
      await Promise.all([
        this.prisma.job.count({
          where: { ...base, status: JobStatus.PENDING_APPROVAL },
        }),
        this.prisma.job.count({
          where: {
            ...base,
            status: JobStatus.PENDING_APPROVAL,
            approvalDeadline: { lt: now },
          },
        }),
        this.prisma.job.count({
          where: { ...base, status: JobStatus.SLA_BREACHED },
        }),
        this.prisma.job.count({ where: base }),
        this.prisma.job.count({
          where: {
            ...base,
            status: { in: [JobStatus.PAID, JobStatus.PAID_CASH, JobStatus.CLOSED] },
          },
        }),
      ]);

    return {
      district: scope.district,
      totalPits: facilities.length,
      monitoredPits: facilities.filter((f) => f.sensored).length,
      criticalPits: facilities.filter((f) => f.status === 'critical').length,
      warningPits: facilities.filter((f) => f.status === 'warning').length,
      offlineSensors: facilities.filter((f) => f.device && !f.device.online).length,
      pendingApprovals,
      overdueApprovals,
      slaBreaches,
      jobsTotal,
      jobsCompleted,
      completionRatePct: jobsTotal
        ? Math.round((jobsCompleted / jobsTotal) * 100)
        : 0,
    };
  }

  async facilities(userId: string) {
    const scope = await this.scopeFor(userId);
    return this.scopeFacilities(await this.admin.facilities(), scope);
  }

  /** Actionable regulatory queue: overdue/pending approvals, SLA breaches, critical pits. */
  async alerts(userId: string) {
    const scope = await this.scopeFor(userId);
    const now = new Date();
    const base = this.jobWhere(scope);

    const [pendingApprovals, slaBreaches, facilities] = await Promise.all([
      this.prisma.job.findMany({
        where: { ...base, status: JobStatus.PENDING_APPROVAL },
        include: DISTRICT_JOB_INCLUDE,
        orderBy: { approvalDeadline: 'asc' },
      }),
      this.prisma.job.findMany({
        where: { ...base, status: JobStatus.SLA_BREACHED },
        include: DISTRICT_JOB_INCLUDE,
        orderBy: { slaDeadline: 'asc' },
      }),
      this.facilities(userId),
    ]);

    return {
      pendingApprovals: pendingApprovals.map((j) => ({
        ...j,
        overdue: j.approvalDeadline != null && j.approvalDeadline < now,
      })),
      slaBreaches,
      criticalPits: facilities.filter((f) => f.status === 'critical'),
    };
  }

  async reportSummary(userId: string) {
    const scope = await this.scopeFor(userId);
    // A scoped officer with no district set gets an empty report.
    const district = scope.scoped ? scope.district ?? '__none__' : undefined;
    const [summary, byDistrict] = await Promise.all([
      this.reports.summary(district),
      this.reports.byDistrict(district),
    ]);
    return { summary, byDistrict };
  }

  /** Regulatory action: append a compliance note to a job and alert admins. */
  async escalate(jobId: string, userId: string, note?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { pit: { select: { code: true } } },
    });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);

    const officer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const stamp = `[District escalation by ${officer?.name ?? 'officer'} @ ${new Date().toISOString()}] ${note ?? 'Flagged for review'}`;
    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { notes: job.notes ? `${job.notes}\n${stamp}` : stamp },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.admin, active: true },
      select: { phone: true, whatsappNumber: true },
    });
    for (const a of admins) {
      await this.notifications.notify(
        a.whatsappNumber ?? a.phone,
        'district_escalation',
        `SaniChain: a district officer flagged job ${jobId} (${job.pit.code}) for review.${note ? ` Note: ${note}` : ''}`,
        jobId,
      );
    }
    return updated;
  }
}
