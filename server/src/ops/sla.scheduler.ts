import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../jobs/jobs.service';

/**
 * Periodic operations sweep: escalate expired dispatch offers (auto → broadcast) and
 * flag SLA breaches for admin attention (JB-07).
 */
@Injectable()
export class SlaScheduler {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(private readonly jobs: JobsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    const offers = await this.jobs.escalateExpiredOffers();
    const sla = await this.jobs.detectSlaBreaches();
    const approvals = await this.jobs.remindAndFlagOverdueApprovals();
    if (offers.escalated || sla.breached || approvals.flagged) {
      this.logger.log(
        `Ops sweep: ${offers.escalated} offer(s) escalated, ${sla.breached} SLA breach(es), ${approvals.flagged} overdue approval(s)`,
      );
    }
  }
}
