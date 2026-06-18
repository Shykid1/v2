'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, ChevronRight, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useProviderMe, useSubmitKyc, useUpdateProvider } from '@/hooks/queries';
import type { Provider } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, VerificationBadge } from '@/components/domain';
import { Field } from '@/components/form/field';
import { RegionDistrictSelect } from '@/components/form/region-district-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const STEPS = ['Coverage', 'Settlement', 'Review'] as const;
const ZONES = [
  { value: 'near', label: 'In town' },
  { value: 'mid', label: 'Outside town' },
  { value: 'remote', label: 'Remote' },
];

export default function ProviderOnboardingPage() {
  const me = useProviderMe();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Finish setting up" description="A few steps before you can accept jobs." />
      {me.isLoading ? (
        <Skeleton className="h-96" />
      ) : me.isError ? (
        <ErrorState message={(me.error as Error).message} onRetry={() => me.refetch()} />
      ) : me.data ? (
        <Wizard provider={me.data} />
      ) : null}
    </div>
  );
}

function Wizard({ provider }: { provider: Provider }) {
  const router = useRouter();
  // Resume at the first incomplete step.
  const [step, setStep] = useState(() => (provider.paystackSubaccountCode ? 2 : 0));

  return (
    <div className="space-y-6">
      <Stepper current={step} />
      <div className="rounded-xl border bg-card p-5">
        {step === 0 && <CoverageStep provider={provider} onNext={() => setStep(1)} />}
        {step === 1 && (
          <SettlementStep
            provider={provider}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && <ReviewStep provider={provider} onGoToDashboard={() => router.replace('/provider')} />}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done
                  ? 'bg-primary text-primary-foreground'
                  : active
                    ? 'bg-primary/12 text-primary ring-2 ring-primary/25'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function CoverageStep({ provider, onNext }: { provider: Provider; onNext: () => void }) {
  const update = useUpdateProvider();
  const [zones, setZones] = useState<string[]>(provider.coverageZones.length ? provider.coverageZones : ['near']);
  const [capacity, setCapacity] = useState(String(provider.vehicleCapacityLiters ?? ''));
  const [location, setLocation] = useState({
    region: provider.region ?? '',
    district: provider.district ?? '',
  });

  function toggle(z: string, on: boolean) {
    setZones((prev) => (on ? [...new Set([...prev, z])] : prev.filter((x) => x !== z)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        coverageZones: zones,
        region: location.region || undefined,
        district: location.district || undefined,
        vehicleCapacityLiters: capacity ? Number(capacity) : undefined,
      },
      { onSuccess: onNext, onError: (err) => toast.error((err as Error).message) },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <h2 className="font-heading font-semibold">Where do you work?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">We only send jobs in the zones you cover.</p>
      </div>
      <div className="space-y-2">
        <Label>Coverage zones</Label>
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
      <RegionDistrictSelect value={location} onChange={setLocation} />
      <Field label="Tank capacity (litres)" className="max-w-xs">
        {(p) => (
          <Input {...p} type="number" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="5000" />
        )}
      </Field>
      <Button type="submit" disabled={update.isPending || zones.length === 0}>
        {update.isPending ? 'Saving…' : 'Continue'} <ChevronRight />
      </Button>
    </form>
  );
}

function SettlementStep({
  provider,
  onNext,
  onBack,
}: {
  provider: Provider;
  onNext: () => void;
  onBack: () => void;
}) {
  const submit = useSubmitKyc();
  const [form, setForm] = useState({ settlementBank: 'MTN', accountNumber: '' });

  if (provider.paystackSubaccountCode) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Settlement details are already on file.</p>
        <Button onClick={onNext}>
          Continue <ChevronRight />
        </Button>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit.mutate(
      { settlementBank: form.settlementBank, accountNumber: form.accountNumber, accountType: 'momo' },
      {
        onSuccess: () => {
          toast.success('Settlement details submitted.');
          onNext();
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h2 className="font-heading font-semibold">How should we pay you?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Job payouts settle to this Mobile Money account, next business day.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={submit.isPending}>
          {submit.isPending ? 'Submitting…' : 'Submit'} <ChevronRight />
        </Button>
      </div>
    </form>
  );
}

function ReviewStep({
  provider,
  onGoToDashboard,
}: {
  provider: Provider;
  onGoToDashboard: () => void;
}) {
  const verified = provider.verificationStatus === 'verified';
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div
        className={cn(
          'flex size-12 items-center justify-center rounded-full',
          verified ? 'bg-success/15 text-success' : 'bg-warning/25 text-warning-foreground',
        )}
      >
        {verified ? <ShieldCheck className="size-6" /> : <Clock className="size-6" />}
      </div>
      <h2 className="mt-4 font-heading text-lg font-semibold">
        {verified ? 'You are verified' : 'Application under review'}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-balance text-muted-foreground">
        {verified
          ? 'Your account is active. You can start accepting jobs now.'
          : 'Thanks. Our team is reviewing your details. We will notify you on WhatsApp once you are approved.'}
      </p>
      <div className="mt-3">
        <VerificationBadge status={provider.verificationStatus} />
      </div>
      <Button className="mt-6" onClick={onGoToDashboard}>
        Go to dashboard
      </Button>
    </div>
  );
}
