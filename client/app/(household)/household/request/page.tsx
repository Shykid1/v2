'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreatePit,
  useHouseholdJobs,
  usePits,
  usePriceQuote,
  useRequestJob,
} from '@/hooks/queries';
import type {
  DistanceZone,
  Job,
  JobStatus,
  PaymentMethod,
  Pit,
  PitSize,
} from '@/lib/types';
import { ghs, sizeLabel, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { ErrorState, PriceTag } from '@/components/domain';
import { Field } from '@/components/form/field';
import { RegionDistrictSelect } from '@/components/form/region-district-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NEW_PIT = '__new__';
const OPEN_STATUSES = new Set<JobStatus>([
  'PENDING_APPROVAL',
  'CREATED',
  'OFFERED',
  'ASSIGNED',
  'ACCEPTED',
  'EN_ROUTE',
  'COMPLETED',
  'PAID',
  'PAID_CASH',
]);

export default function HouseholdRequestPage() {
  const pits = usePits();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request desludging"
        description="Summon a vetted operator to empty your pit — no sensor required."
      />
      {pits.isLoading ? (
        <Skeleton className="h-96 max-w-2xl" />
      ) : pits.isError ? (
        <ErrorState message={(pits.error as Error).message} onRetry={() => pits.refetch()} />
      ) : (
        <RequestForm pits={pits.data ?? []} />
      )}
    </div>
  );
}

function RequestForm({ pits }: { pits: Pit[] }) {
  const jobs = useHouseholdJobs();
  const create = useCreatePit();
  const request = useRequestJob();

  const openPitCodes = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs.data ?? []) if (OPEN_STATUSES.has(j.status)) set.add(j.pit.code);
    return set;
  }, [jobs.data]);

  const hasPits = pits.length > 0;
  // Default to picking an existing pit when the household has one; otherwise
  // register a new pit inline.
  const [pitId, setPitId] = useState<string>(hasPits ? pits[0].id : NEW_PIT);
  const isNew = pitId === NEW_PIT;

  const [form, setForm] = useState({
    name: '',
    ghanaPostAddress: '',
    sizeClass: 'standard' as PitSize,
    zone: 'near' as DistanceZone,
    paymentMethod: 'cash' as PaymentMethod,
    notes: '',
  });
  const [location, setLocation] = useState({ region: '', district: '' });

  const [result, setResult] = useState<{ job: Job; price: string | null } | null>(null);

  const selectedPit = useMemo(
    () => (isNew ? null : pits.find((p) => p.id === pitId) ?? null),
    [isNew, pitId, pits],
  );

  // Quote uses the selected pit's attributes, or the new-pit form inputs.
  const size = selectedPit?.sizeClass ?? form.sizeClass;
  const zone = selectedPit?.zone ?? form.zone;
  const quote = usePriceQuote(size, zone, zone === 'remote');

  const pitHasOpenJob = selectedPit ? openPitCodes.has(selectedPit.code) : false;
  const busy = create.isPending || request.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let targetPitId = pitId;
      if (isNew) {
        const pit = await create.mutateAsync({
          name: form.name || undefined,
          ghanaPostAddress: form.ghanaPostAddress,
          sizeClass: form.sizeClass,
          zone: form.zone,
          district: location.district || undefined,
        });
        targetPitId = pit.id;
      }
      const job = await request.mutateAsync({
        pitId: targetPitId,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
      });
      setResult({ job, price: job.priceTotal });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (result) {
    return (
      <div className="max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-5" />
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold">Desludging requested</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference <span className="font-mono text-foreground">{result.job.id.slice(0, 8)}</span>. Price{' '}
          <strong className="text-foreground">{ghs(result.price)}</strong>. We are assigning a vetted
          provider and will confirm by SMS and WhatsApp.
        </p>
        <div className="mt-5 flex gap-2">
          <Button asChild>
            <Link href="/household/jobs">Track job</Link>
          </Button>
          <Button variant="outline" onClick={() => setResult(null)}>
            Make another request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form className="max-w-2xl space-y-5 rounded-xl border bg-card p-6" onSubmit={submit} noValidate>
      <div className="space-y-1.5">
        <Label>Pit</Label>
        <Select value={pitId} onValueChange={setPitId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a pit" />
          </SelectTrigger>
          <SelectContent>
            {pits.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {(p.name ?? p.code) + ` · ${sizeLabel(p.sizeClass)} · ${zoneLabel(p.zone)}`}
                {p.sensored ? '' : ' · no sensor'}
              </SelectItem>
            ))}
            <SelectItem value={NEW_PIT}>+ Register a new pit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isNew && (
        <div className="space-y-4 rounded-lg border border-dashed p-4">
          <Field label="Name" hint="A label you will recognize.">
            {(p) => (
              <Input
                {...p}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Backyard pit"
              />
            )}
          </Field>
          <Field label="GhanaPost GPS address" required>
            {(p) => (
              <Input
                {...p}
                value={form.ghanaPostAddress}
                onChange={(e) => setForm({ ...form, ghanaPostAddress: e.target.value })}
                placeholder="NM-0123-4567"
                required
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pit size</Label>
              <Select value={form.sizeClass} onValueChange={(v) => setForm({ ...form, sizeClass: v as PitSize })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard pit</SelectItem>
                  <SelectItem value="large_shared">Large / shared pit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={form.zone} onValueChange={(v) => setForm({ ...form, zone: v as DistanceZone })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="near">In town</SelectItem>
                  <SelectItem value="mid">Outside town</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <RegionDistrictSelect value={location} onChange={setLocation} />
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Payment</Label>
        <Select
          value={form.paymentMethod}
          onValueChange={(v) => setForm({ ...form, paymentMethod: v as PaymentMethod })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash on completion</SelectItem>
            <SelectItem value="paystack">Mobile Money</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Field label="Notes" hint="Anything the operator should know (access, gate code, timing).">
        {(p) => (
          <Textarea
            {...p}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional"
            rows={3}
          />
        )}
      </Field>

      <PriceTag quote={quote.data} loading={quote.isLoading} />

      {pitHasOpenJob && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-muted-foreground">
          This pit already has an open job. Track it from{' '}
          <Link href="/household/jobs" className="font-medium text-foreground underline">
            Jobs
          </Link>
          .
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={busy || pitHasOpenJob}>
        {busy ? 'Submitting…' : 'Request desludging'}
      </Button>
    </form>
  );
}
