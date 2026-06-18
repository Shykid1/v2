import { Injectable } from '@nestjs/common';
import { JobStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SDG / JMP-aligned coverage + operations aggregates for UNICEF and platform admins.
 * Read-only rollups over the live operational data (WB-05).
 */
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** @param district optional filter; when set, aggregates only that district. */
  async summary(district?: string) {
    const pitWhere = district ? { active: true, district } : { active: true };
    const householdWhere = district ? { district } : {};
    const jobWhere = district ? { pit: { district } } : {};

    const [
      households,
      sensoredPits,
      totalPits,
      providersVerified,
      jobsTotal,
      jobsCompleted,
      jobsPreempt,
      cashJobs,
      digitalJobs,
    ] = await Promise.all([
      this.prisma.household.count({ where: householdWhere }),
      this.prisma.pit.count({ where: { ...pitWhere, sensored: true } }),
      this.prisma.pit.count({ where: pitWhere }),
      this.prisma.provider.count({ where: { verificationStatus: 'verified' } }),
      this.prisma.job.count({ where: jobWhere }),
      this.prisma.job.count({
        where: {
          ...jobWhere,
          status: {
            in: [JobStatus.PAID, JobStatus.PAID_CASH, JobStatus.CLOSED],
          },
        },
      }),
      this.prisma.job.count({
        where: { ...jobWhere, triggerSource: 'climate_preempt' },
      }),
      this.prisma.job.count({
        where: { ...jobWhere, paymentMethod: PaymentMethod.cash },
      }),
      this.prisma.job.count({
        where: { ...jobWhere, paymentMethod: PaymentMethod.paystack },
      }),
    ]);

    return {
      coverage: {
        households,
        totalPits,
        sensoredPits,
        sensoredPct: totalPits
          ? Math.round((sensoredPits / totalPits) * 100)
          : 0,
        providersVerified,
      },
      operations: {
        jobsTotal,
        jobsCompleted,
        completionRatePct: jobsTotal
          ? Math.round((jobsCompleted / jobsTotal) * 100)
          : 0,
        floodPreemptiveJobs: jobsPreempt,
        cashJobs,
        digitalJobs,
      },
    };
  }

  async byDistrict(district?: string) {
    const pitWhere = district ? { active: true, district } : { active: true };
    const [pitsAll, pitsSensored, households] = await Promise.all([
      this.prisma.pit.groupBy({
        by: ['district'],
        where: pitWhere,
        _count: { _all: true },
      }),
      this.prisma.pit.groupBy({
        by: ['district'],
        where: { ...pitWhere, sensored: true },
        _count: { _all: true },
      }),
      this.prisma.household.groupBy({
        by: ['district'],
        where: district ? { district } : {},
        _count: { _all: true },
      }),
    ]);

    const sensoredByDistrict = new Map(
      pitsSensored.map((p) => [p.district, p._count._all]),
    );
    const householdsByDistrict = new Map(
      households.map((h) => [h.district, h._count._all]),
    );

    return pitsAll.map((p) => {
      const totalPits = p._count._all;
      const sensoredPits = sensoredByDistrict.get(p.district) ?? 0;
      return {
        district: p.district ?? 'unknown',
        households: householdsByDistrict.get(p.district) ?? 0,
        totalPits,
        sensoredPits,
        sensoredPct: totalPits
          ? Math.round((sensoredPits / totalPits) * 100)
          : 0,
      };
    });
  }
}
