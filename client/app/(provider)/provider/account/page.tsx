'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useProviderMe, useSubmitKyc, useUpdateProvider } from '@/hooks/queries';
import type { Provider } from '@/lib/types';
import { humanize } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, StatusBadge, VerificationBadge } from '@/components/domain';
import { Field } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const ZONES = [
  { value: 'near', label: 'In town' },
  { value: 'mid', label: 'Outside town' },
  { value: 'remote', label: 'Remote' },
];

export default function ProviderAccountPage() {
  const me = useProviderMe();

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Verification, payouts, and coverage." />

      {me.isLoading ? (
        <Skeleton className="h-96 max-w-2xl" />
      ) : me.isError ? (
        <ErrorState message={(me.error as Error).message} onRetry={() => me.refetch()} />
      ) : me.data ? (
        <div className="max-w-2xl space-y-6">
          <StatusSection provider={me.data} />
          {!me.data.paystackSubaccountCode && <KycSection />}
          <CoverageSection key={me.data.id} provider={me.data} />
        </div>
      ) : null}
    </div>
  );
}

function StatusSection({ provider }: { provider: Provider }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-heading text-sm font-semibold">Status</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Verification</dt>
          <dd className="mt-1">
            <VerificationBadge status={provider.verificationStatus} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Settlement (KYC)</dt>
          <dd className="mt-1">
            <StatusBadge tone={provider.paystackSubaccountCode ? 'success' : 'warning'}>
              {provider.paystackSubaccountCode ? 'Active' : humanize(provider.kycStatus)}
            </StatusBadge>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function KycSection() {
  const submit = useSubmitKyc();
  const [form, setForm] = useState({ settlementBank: 'MTN', accountNumber: '' });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate(
      { settlementBank: form.settlementBank, accountNumber: form.accountNumber, accountType: 'momo' },
      {
        onSuccess: () => toast.success('Settlement details submitted.'),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-heading text-sm font-semibold">Settlement details</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Where we send your payouts. Required before you can accept jobs.
      </p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
        <Field label="MoMo provider" required>
          {(p) => (
            <Input {...p} value={form.settlementBank} onChange={(e) => setForm({ ...form, settlementBank: e.target.value })} placeholder="MTN" required />
          )}
        </Field>
        <Field label="MoMo number" required>
          {(p) => (
            <Input {...p} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="0241234567" required />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting…' : 'Submit settlement details'}
          </Button>
        </div>
      </form>
    </section>
  );
}

function CoverageSection({ provider }: { provider: Provider }) {
  const update = useUpdateProvider();
  const [zones, setZones] = useState<string[]>(provider.coverageZones);
  const [capacity, setCapacity] = useState(String(provider.vehicleCapacityLiters ?? ''));

  function toggle(z: string, on: boolean) {
    setZones((prev) => (on ? [...new Set([...prev, z])] : prev.filter((x) => x !== z)));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      { coverageZones: zones, vehicleCapacityLiters: capacity ? Number(capacity) : undefined },
      {
        onSuccess: () => toast.success('Coverage updated.'),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="font-heading text-sm font-semibold">Coverage</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Zones you serve and your tank capacity.</p>
      <form className="mt-4 space-y-4" onSubmit={save} noValidate>
        <div className="space-y-2">
          <Label>Zones</Label>
          <div className="flex flex-wrap gap-2">
            {ZONES.map((z) => (
              <label
                key={z.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/8"
              >
                <Checkbox checked={zones.includes(z.value)} onCheckedChange={(c) => toggle(z.value, c === true)} />
                {z.label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Tank capacity (litres)" className="max-w-xs">
          {(p) => (
            <Input {...p} type="number" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="5000" />
          )}
        </Field>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save coverage'}
        </Button>
      </form>
    </section>
  );
}
