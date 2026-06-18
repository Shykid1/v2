'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME } from '@/components/shells/nav';
import { Field } from '@/components/form/field';
import { RegionDistrictSelect } from '@/components/form/region-district-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ZONES = [
  { value: 'near', label: 'In town' },
  { value: 'mid', label: 'Outside town' },
  { value: 'remote', label: 'Remote' },
];

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Already have one?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <Tabs defaultValue="household" className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="household" className="flex-1">
            Household
          </TabsTrigger>
          <TabsTrigger value="provider" className="flex-1">
            Provider
          </TabsTrigger>
        </TabsList>
        <TabsContent value="household">
          <HouseholdForm />
        </TabsContent>
        <TabsContent value="provider">
          <ProviderForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HouseholdForm() {
  const { registerHousehold } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', whatsappNumber: '', password: '' });
  const [location, setLocation] = useState({ region: '', district: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await registerHousehold({
        name: form.name,
        phone: form.phone,
        whatsappNumber: form.whatsappNumber || undefined,
        password: form.password,
        district: location.district || undefined,
      });
      router.replace(ROLE_HOME[user.role]);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
      <Field label="Full name" required>
        {(p) => <Input {...p} value={form.name} onChange={set('name')} required />}
      </Field>
      <Field label="Phone" hint="Used for sign in and SMS confirmations." required>
        {(p) => (
          <Input {...p} value={form.phone} onChange={set('phone')} placeholder="0241234567" required />
        )}
      </Field>
      <Field label="WhatsApp number" hint="Optional. We send job updates here first.">
        {(p) => <Input {...p} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="0241234567" />}
      </Field>
      <RegionDistrictSelect value={location} onChange={setLocation} />
      <Field label="Password" hint="At least 8 characters." error={error} required>
        {(p) => (
          <Input
            {...p}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            required
            minLength={8}
          />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Creating account…' : 'Create household account'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You can register a sensor later, or request a one-off emptying anytime.
      </p>
    </form>
  );
}

function ProviderForm() {
  const { registerProvider } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: '',
    name: '',
    phone: '',
    whatsappNumber: '',
    password: '',
    vehicleCapacityLiters: '',
  });
  const [zones, setZones] = useState<string[]>(['near']);
  const [location, setLocation] = useState({ region: '', district: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleZone(z: string, on: boolean) {
    setZones((prev) => (on ? [...new Set([...prev, z])] : prev.filter((x) => x !== z)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await registerProvider({
        businessName: form.businessName,
        name: form.name,
        phone: form.phone,
        whatsappNumber: form.whatsappNumber || undefined,
        password: form.password,
        coverageZones: zones,
        region: location.region || undefined,
        district: location.district || undefined,
        vehicleCapacityLiters: form.vehicleCapacityLiters ? Number(form.vehicleCapacityLiters) : undefined,
      });
      // New providers go straight into the onboarding wizard (settlement + review).
      router.replace(user.role === 'provider' ? '/provider/onboarding' : ROLE_HOME[user.role]);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
      <Field label="Business name" required>
        {(p) => (
          <Input {...p} value={form.businessName} onChange={set('businessName')} placeholder="Kwame Desludging Services" required />
        )}
      </Field>
      <Field label="Your name" required>
        {(p) => <Input {...p} value={form.name} onChange={set('name')} required />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone" required>
          {(p) => <Input {...p} value={form.phone} onChange={set('phone')} placeholder="0207654321" required />}
        </Field>
        <Field label="Tank capacity (L)">
          {(p) => (
            <Input {...p} type="number" inputMode="numeric" value={form.vehicleCapacityLiters} onChange={set('vehicleCapacityLiters')} placeholder="5000" />
          )}
        </Field>
      </div>
      <Field label="WhatsApp number" hint="Job offers arrive here first.">
        {(p) => <Input {...p} value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="0207654321" />}
      </Field>
      <RegionDistrictSelect value={location} onChange={setLocation} />
      <div className="space-y-2">
        <Label>Coverage zones</Label>
        <div className="flex flex-wrap gap-2">
          {ZONES.map((z) => {
            const on = zones.includes(z.value);
            return (
              <label
                key={z.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-primary/8"
              >
                <Checkbox checked={on} onCheckedChange={(c) => toggleZone(z.value, c === true)} />
                {z.label}
              </label>
            );
          })}
        </div>
      </div>
      <Field label="Password" hint="At least 8 characters." error={error} required>
        {(p) => (
          <Input {...p} type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Submitting…' : 'Apply as a provider'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Applications are reviewed by our team before you can accept jobs.
      </p>
    </form>
  );
}
