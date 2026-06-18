'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useGuestRequest } from '@/hooks/queries';
import { usePriceQuote } from '@/hooks/queries';
import type { DistanceZone, Job, PaymentMethod, PitSize } from '@/lib/types';
import { ghs } from '@/lib/format';
import { Field } from '@/components/form/field';
import { PriceTag } from '@/components/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function GuestRequest() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    ghanaPostAddress: '',
    sizeClass: 'standard' as PitSize,
    zone: 'near' as DistanceZone,
    paymentMethod: 'cash' as PaymentMethod,
  });
  const [result, setResult] = useState<Job | null>(null);

  const quote = usePriceQuote(form.sizeClass, form.zone, form.zone === 'remote');
  const request = useGuestRequest();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const job = await request.mutateAsync({
      name: form.name || undefined,
      phone: form.phone,
      ghanaPostAddress: form.ghanaPostAddress,
      sizeClass: form.sizeClass,
      zone: form.zone,
      paymentMethod: form.paymentMethod,
    });
    setResult(job);
  }

  if (result) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-5" />
        </div>
        <h3 className="mt-4 font-heading text-lg font-semibold">Request received</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference <span className="font-mono text-foreground">{result.id.slice(0, 8)}</span>. Price{' '}
          <strong className="text-foreground">{ghs(result.priceTotal)}</strong>. We are assigning a
          vetted provider and will confirm by SMS and WhatsApp.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => setResult(null)}>
          Make another request
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="font-heading text-lg font-semibold">Request emptying, no account needed</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Give your GhanaPost GPS address so we can locate the pit and price the job.
      </p>

      <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            {(p) => (
              <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Optional" />
            )}
          </Field>
          <Field label="Phone" required>
            {(p) => (
              <Input
                {...p}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0241234567"
                required
              />
            )}
          </Field>
        </div>

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

        <PriceTag quote={quote.data} loading={quote.isLoading} />

        {request.isError && (
          <p className="text-sm text-destructive">{(request.error as Error).message}</p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={request.isPending}>
          {request.isPending ? 'Submitting…' : 'Request a provider'}
        </Button>
      </form>
    </div>
  );
}
