import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const SETTING_DEFAULTS = {
  'dispatch.mode': 'assisted', // 'assisted' | 'auto'
  'dispatch.offerTimeoutMinutes': 10,
  'job.slaHours': 48,
  'sensor.priceGhs': 350,
  'sensor.fillThresholdPct': 80,
  'provider.defaultCreditLimitGhs': 0,
  'commission.percent': 15, // flat platform commission % of every job (provider keeps the rest)
  'approval.windowHours': 12, // household must approve a sensor job within this window
  'approval.reminderHours': 4, // remind the household after this long without a response
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get<T = unknown>(key: SettingKey): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    if (row) return row.value as T;
    return SETTING_DEFAULTS[key] as unknown as T;
  }

  async set(key: SettingKey, value: unknown) {
    return this.prisma.setting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  }

  async all() {
    const rows = await this.prisma.setting.findMany();
    const map: Record<string, unknown> = { ...SETTING_DEFAULTS };
    for (const r of rows) map[r.key] = r.value;
    return map;
  }
}
