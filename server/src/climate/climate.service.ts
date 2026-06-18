import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TriggerSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

interface ClimateData {
  chirpsMm72h: number;
  glofasProbability: number;
  speiValue: number;
}

// Flood pre-emption tuning (pilot defaults).
const FLOOD_SIGNAL_THRESHOLD = 0.6; // GloFAS-derived
const PREEMPT_FILL_PCT = 60; // empty sensored pits this full ahead of a flood

@Injectable()
export class ClimateService {
  private readonly logger = new Logger(ClimateService.name);
  private readonly mockMode: boolean;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jobs: JobsService,
  ) {
    this.mockMode = config.get<boolean>('CLIMATE_MOCK_MODE', true);
  }

  districts(): string[] {
    const raw = this.config.get<string>('DISTRICTS', 'East Mamprusi');
    return raw
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }

  /** Poll one district, store a snapshot, and run the flood pre-emption rule. */
  async pollDistrict(district: string, forceFlood = false) {
    const data = this.mockMode
      ? this.mockData(forceFlood)
      : await this.fetchRealData(district);

    const floodSignal = Math.min(data.glofasProbability / 0.3, 1.0);
    const droughtSignal = Math.min(
      Math.abs(Math.min(data.speiValue, 0)) / 2.0,
      1.0,
    );
    const riskScore = Number(
      (floodSignal * 0.45 + droughtSignal * 0.25).toFixed(3),
    );

    const snapshotTs = new Date();
    snapshotTs.setMinutes(0, 0, 0);

    const snapshot = await this.prisma.climateSnapshot.upsert({
      where: { district_snapshotTs: { district, snapshotTs } },
      create: {
        district,
        snapshotTs,
        chirpsMm72h: data.chirpsMm72h,
        glofasProbability: data.glofasProbability,
        speiValue: data.speiValue,
        floodSignal,
        droughtSignal,
        riskScore,
      },
      update: {
        chirpsMm72h: data.chirpsMm72h,
        glofasProbability: data.glofasProbability,
        speiValue: data.speiValue,
        floodSignal,
        droughtSignal,
        riskScore,
      },
    });

    let preempted = 0;
    if (floodSignal >= FLOOD_SIGNAL_THRESHOLD) {
      preempted = await this.preemptSensoredPits(district, snapshot.id);
    }

    return { snapshot, preempted };
  }

  async pollAll(forceFlood = false) {
    const results = await Promise.allSettled(
      this.districts().map((d) => this.pollDistrict(d, forceFlood)),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed)
      this.logger.warn(`Climate poll failed for ${failed} district(s)`);
    return { districts: this.districts().length, failed };
  }

  /**
   * For a flood-forecast district, create pre-emptive jobs for sensored pits whose
   * latest reading is above the pre-empt fill threshold (CL-02). Each job is linked to
   * the climate snapshot that triggered it.
   */
  private async preemptSensoredPits(district: string, snapshotId: string) {
    const pits = await this.prisma.pit.findMany({
      where: { district, sensored: true, active: true },
      include: { readings: { orderBy: { sensorTs: 'desc' }, take: 1 } },
    });

    let created = 0;
    for (const pit of pits) {
      const latest = pit.readings[0];
      if (!latest) continue;
      if (Number(latest.fillPct) < PREEMPT_FILL_PCT) continue;

      await this.jobs.createForPit(pit.id, TriggerSource.climate_preempt, {
        climateSnapshotId: snapshotId,
        notes: `Flood pre-emption (${district})`,
      });
      created += 1;
    }
    if (created) {
      this.logger.log(
        `Flood pre-emption: ${created} job(s) created in ${district}`,
      );
    }
    return created;
  }

  async latest() {
    const out: Array<{
      district: string;
      snapshot: Awaited<
        ReturnType<PrismaService['climateSnapshot']['findFirst']>
      >;
    }> = [];
    for (const district of this.districts()) {
      const snap = await this.prisma.climateSnapshot.findFirst({
        where: { district },
        orderBy: { snapshotTs: 'desc' },
      });
      out.push({ district, snapshot: snap });
    }
    return out;
  }

  private mockData(forceFlood: boolean): ClimateData {
    if (forceFlood) {
      return { chirpsMm72h: 95, glofasProbability: 0.28, speiValue: 1.2 };
    }
    return { chirpsMm72h: 20, glofasProbability: 0.15, speiValue: -0.3 };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async fetchRealData(district: string): Promise<ClimateData> {
    // TODO: CHIRPS + GloFAS + SPEI fetch for `district`. Neutral data until wired.
    this.logger.debug(`fetchRealData(${district}) not yet implemented`);
    return { chirpsMm72h: 0, glofasProbability: 0, speiValue: 0 };
  }
}
