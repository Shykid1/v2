'use client';

import { useMemo, useState } from 'react';
import { Droplets, Plus, Radio, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import {
  useApproveJob,
  useCreatePit,
  useDeclineApproval,
  useHouseholdJobs,
  usePits,
  useRegisterSensor,
  useRequestJob,
  useSensorCheckout,
} from '@/hooks/queries';
import type { Job, JobStatus, Pit, PitSize } from '@/lib/types';
import { dateTime, ghs, sizeLabel, zoneLabel } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import {
  EmptyState,
  ErrorState,
  FillGauge,
  JobStatusBadge,
  StatCard,
  StatusBadge,
} from '@/components/domain';
import { Field } from '@/components/form/field';
import { RegionDistrictSelect } from '@/components/form/region-district-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SENSOR_PRICE = 350;
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

export default function HouseholdHomePage() {
  const pits = usePits();
  const jobs = useHouseholdJobs();
  const checkout = useSensorCheckout();

  const openByPit = useMemo(() => {
    const map = new Map<string, Job>();
    for (const j of jobs.data ?? []) {
      if (OPEN_STATUSES.has(j.status) && !map.has(j.pit.code)) map.set(j.pit.code, j);
    }
    return map;
  }, [jobs.data]);

  const list = pits.data ?? [];
  const sensored = list.filter((p) => p.sensored).length;

  function buySensor() {
    checkout.mutate(SENSOR_PRICE, {
      onSuccess: (res) => {
        if (res.authorizationUrl) window.location.assign(res.authorizationUrl);
        else toast.success('Sensor purchase recorded.');
      },
      onError: (e) => toast.error((e as Error).message),
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My pits"
        description="Monitor fill levels and request emptying before an overflow."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={buySensor} disabled={checkout.isPending}>
              <ShoppingCart /> Buy a sensor
            </Button>
            <AddPitDialog />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Pits" value={list.length} icon={<Droplets className="size-4" />} />
        <StatCard label="Sensored" value={sensored} sub={`of ${list.length}`} />
        <StatCard label="Open jobs" value={openByPit.size} />
      </div>

      {pits.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : pits.isError ? (
        <ErrorState message={(pits.error as Error).message} onRetry={() => pits.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Droplets className="size-5" />}
          title="No pits registered yet"
          description="Register your pit latrine to track it and request emptying."
          action={<AddPitDialog />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((pit) => (
            <PitCard key={pit.id} pit={pit} openJob={openByPit.get(pit.code)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PitCard({ pit, openJob }: { pit: Pit; openJob?: Job }) {
  const request = useRequestJob();
  const approve = useApproveJob();
  const decline = useDeclineApproval();
  const fill = pit.readings?.[0] ? Number(pit.readings[0].fillPct) : null;
  const pendingApproval = openJob?.status === 'PENDING_APPROVAL';

  function requestJob() {
    request.mutate(pit.id, {
      onSuccess: () => toast.success('Emptying requested. A provider is being assigned.'),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  function approveJob() {
    if (!openJob) return;
    approve.mutate(openJob.id, {
      onSuccess: () => toast.success('Approved. We are summoning an operator now.'),
      onError: (e) => toast.error((e as Error).message),
    });
  }

  function declineJob() {
    if (!openJob) return;
    decline.mutate(
      { id: openJob.id },
      {
        onSuccess: () => toast.success('Request declined.'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-semibold">{pit.name ?? pit.code}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{pit.code}</span> · {sizeLabel(pit.sizeClass)} ·{' '}
            {zoneLabel(pit.zone)}
          </p>
        </div>
        {pit.sensored ? (
          <StatusBadge tone="success">Sensored</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">No sensor</StatusBadge>
        )}
      </div>

      <div className="mt-5 flex-1">
        <FillGauge pct={fill} />
      </div>

      <div className="mt-5">
        {pendingApproval && openJob ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning-foreground">Your pit is full</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Approve to summon an operator — prepare access and {ghs(openJob.priceTotal)}{' '}
              before they arrive.
              {openJob.approvalDeadline
                ? ` Please respond by ${dateTime(openJob.approvalDeadline)}.`
                : ''}
            </p>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={approveJob} disabled={approve.isPending}>
                {approve.isPending ? 'Approving…' : 'Approve & summon'}
              </Button>
              <Button variant="outline" onClick={declineJob} disabled={decline.isPending}>
                Decline
              </Button>
            </div>
          </div>
        ) : openJob ? (
          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Job in progress</span>
            <JobStatusBadge status={openJob.status} />
          </div>
        ) : (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={requestJob} disabled={request.isPending}>
              {request.isPending ? 'Requesting…' : 'Request emptying'}
            </Button>
            {!pit.sensored && <RegisterSensorDialog pitId={pit.id} />}
          </div>
        )}
      </div>
    </div>
  );
}

function AddPitDialog() {
  const create = useCreatePit();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ghanaPostAddress: '',
    sizeClass: 'standard' as PitSize,
  });
  const [location, setLocation] = useState({ region: '', district: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        name: form.name || undefined,
        ghanaPostAddress: form.ghanaPostAddress,
        sizeClass: form.sizeClass,
        district: location.district || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Pit registered.');
          setOpen(false);
          setForm({ name: '', ghanaPostAddress: '', sizeClass: 'standard' });
          setLocation({ region: '', district: '' });
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Register pit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a pit</DialogTitle>
          <DialogDescription>We use the GhanaPost GPS address to locate and price it.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field label="Name" hint="A label you will recognize.">
            {(p) => <Input {...p} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Backyard pit" />}
          </Field>
          <Field label="GhanaPost GPS address" required>
            {(p) => (
              <Input {...p} value={form.ghanaPostAddress} onChange={(e) => setForm({ ...form, ghanaPostAddress: e.target.value })} placeholder="NM-0123-4567" required />
            )}
          </Field>
          <RegionDistrictSelect value={location} onChange={setLocation} />
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
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Register pit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RegisterSensorDialog({ pitId }: { pitId: string }) {
  const register = useRegisterSensor();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ deviceId: '', hmacKey: '', pitDepthCm: '' });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    register.mutate(
      {
        pitId,
        deviceId: form.deviceId,
        hmacKey: form.hmacKey,
        pitDepthCm: form.pitDepthCm ? Number(form.pitDepthCm) : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Sensor linked. This pit is now monitored.');
          setOpen(false);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Link a sensor">
          <Radio />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link a sensor</DialogTitle>
          <DialogDescription>
            Enter the device ID and key printed on your SaniChain sensor, plus the pit depth for
            calibration.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field label="Device ID" required>
            {(p) => <Input {...p} value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} placeholder="SANI-ESP32-001" required />}
          </Field>
          <Field label="Device key" required>
            {(p) => <Input {...p} value={form.hmacKey} onChange={(e) => setForm({ ...form, hmacKey: e.target.value })} required />}
          </Field>
          <Field label="Pit depth (cm)" hint="For calibrating the fill reading.">
            {(p) => (
              <Input {...p} type="number" inputMode="numeric" value={form.pitDepthCm} onChange={(e) => setForm({ ...form, pitDepthCm: e.target.value })} placeholder="200" />
            )}
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={register.isPending}>
              {register.isPending ? 'Linking…' : 'Link sensor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
