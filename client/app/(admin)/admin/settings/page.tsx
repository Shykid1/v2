'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useSettings, useUpdateSetting } from '@/hooks/queries';
import type { PlatformSettings } from '@/lib/types';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState } from '@/components/domain';
import { Field } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NUMERIC_KEYS = [
  { key: 'dispatch.offerTimeoutMinutes', label: 'Offer timeout (minutes)', hint: 'How long a provider has to accept before escalation.' },
  { key: 'job.slaHours', label: 'Job SLA (hours)', hint: 'Time to complete before a job breaches SLA.' },
  { key: 'sensor.priceGhs', label: 'Sensor price (GHS)', hint: 'Retail price of a SaniChain sensor.' },
  { key: 'commission.percent', label: 'Platform commission (%)', hint: 'Platform cut of every job; the provider keeps the rest. No tiers, no subscription.' },
  { key: 'sensor.fillThresholdPct', label: 'Fill threshold (%)', hint: 'Fill level that triggers an automatic job.' },
  { key: 'provider.defaultCreditLimitGhs', label: 'Provider credit limit (GHS)', hint: 'Cash commission a provider can owe before new cash jobs are blocked. 0 = none.' },
] as const;

export default function AdminSettingsPage() {
  const settings = useSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform rules for dispatch, SLAs, sensors, and credit." />
      {settings.isLoading ? (
        <Skeleton className="h-96 max-w-2xl" />
      ) : settings.isError ? (
        <ErrorState message={(settings.error as Error).message} onRetry={() => settings.refetch()} />
      ) : settings.data ? (
        <SettingsForm data={settings.data} />
      ) : null}
    </div>
  );
}

function SettingsForm({ data }: { data: PlatformSettings }) {
  const update = useUpdateSetting();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const { key } of NUMERIC_KEYS) next[key] = String(data[key] ?? '');
    return next;
  });

  function saveKey(key: string, value: unknown, label: string) {
    update.mutate(
      { key, value },
      { onSuccess: () => toast.success(`${label} saved.`), onError: (e) => toast.error((e as Error).message) },
    );
  }

  const dispatchMode = String(data['dispatch.mode'] ?? 'assisted');

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold">Dispatch</h2>
        <div className="mt-4 space-y-1.5">
          <Label>Dispatch mode</Label>
          <Select value={dispatchMode} onValueChange={(v) => saveKey('dispatch.mode', v, 'Dispatch mode')}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assisted">Assisted (Phase 0)</SelectItem>
              <SelectItem value="auto">Auto + broadcast (Phase 1)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold">Thresholds</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {NUMERIC_KEYS.map(({ key, label, hint }) => (
            <Field key={key} label={label} hint={hint}>
              {(p) => (
                <div className="flex gap-2">
                  <Input
                    {...p}
                    type="number"
                    inputMode="numeric"
                    value={values[key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={update.isPending || values[key] === String(data[key] ?? '')}
                    onClick={() => saveKey(key, Number(values[key]), label)}
                  >
                    Save
                  </Button>
                </div>
              )}
            </Field>
          ))}
        </div>
      </section>
    </div>
  );
}
