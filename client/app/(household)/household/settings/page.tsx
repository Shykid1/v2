'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useHousehold, useUpdateHousehold } from '@/hooks/queries';
import type { HouseholdProfile, PaymentMethod } from '@/lib/types';
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

export default function HouseholdSettingsPage() {
  const household = useHousehold();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="How we reach you and how you pay." />
      {household.isLoading ? (
        <Skeleton className="h-80 max-w-xl" />
      ) : household.isError ? (
        <ErrorState message={(household.error as Error).message} onRetry={() => household.refetch()} />
      ) : household.data ? (
        <SettingsForm data={household.data} />
      ) : null}
    </div>
  );
}

function SettingsForm({ data }: { data: HouseholdProfile }) {
  const update = useUpdateHousehold();
  const [form, setForm] = useState({
    whatsappNumber: data.user.whatsappNumber ?? '',
    defaultPaymentMethod: data.defaultPaymentMethod ?? ('cash' as PaymentMethod),
    district: '',
    community: '',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate(
      {
        whatsappNumber: form.whatsappNumber || undefined,
        defaultPaymentMethod: form.defaultPaymentMethod,
        district: form.district || undefined,
        community: form.community || undefined,
      },
      {
        onSuccess: () => toast.success('Settings saved.'),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <form className="max-w-xl space-y-6" onSubmit={submit} noValidate>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold">Notifications</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Job updates go to WhatsApp first, with SMS as a fallback.
        </p>
        <div className="mt-4">
          <Field label="WhatsApp number" hint="Leave blank to use your phone number.">
            {(p) => (
              <Input
                {...p}
                value={form.whatsappNumber}
                onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                placeholder="0241234567"
              />
            )}
          </Field>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold">Payment</h2>
        <div className="mt-4 space-y-1.5">
          <Label>Default payment method</Label>
          <Select
            value={form.defaultPaymentMethod}
            onValueChange={(v) => setForm({ ...form, defaultPaymentMethod: v as PaymentMethod })}
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
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-sm font-semibold">Location</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="District">
            {(p) => <Input {...p} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />}
          </Field>
          <Field label="Community">
            {(p) => <Input {...p} value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} />}
          </Field>
        </div>
      </section>

      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
