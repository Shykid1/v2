'use client';

import { useMemo, useState } from 'react';
import { UserPlus, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminUsers, useCreateUser, useSetUserActive } from '@/hooks/queries';
import type { AdminUser, Role } from '@/lib/types';
import { dateTime, humanize } from '@/lib/format';
import { PageHeader } from '@/components/shells/page-header';
import { EmptyState, ErrorState, StatusBadge } from '@/components/domain';
import type { Tone } from '@/components/domain';
import { Field } from '@/components/form/field';
import { RegionDistrictSelect } from '@/components/form/region-district-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const ROLE_TONE: Record<Role, Tone> = {
  admin: 'brand',
  provider: 'warning',
  household: 'neutral',
  district_officer: 'success',
};
type Filter = 'all' | Role;

export default function AdminUsersPage() {
  const users = useAdminUsers();
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const all = users.data ?? [];
    return filter === 'all' ? all : all.filter((u) => u.role === filter);
  }, [users.data, filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone on the platform: households, providers, and operators."
        actions={<CreateUserDialog />}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="household">Households</TabsTrigger>
          <TabsTrigger value="provider">Providers</TabsTrigger>
          <TabsTrigger value="district_officer">District officers</TabsTrigger>
          <TabsTrigger value="admin">Admins</TabsTrigger>
        </TabsList>
      </Tabs>

      {users.isLoading ? (
        <Skeleton className="h-80" />
      ) : users.isError ? (
        <ErrorState message={(users.error as Error).message} onRetry={() => users.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={<UsersIcon className="size-5" />} title="No users" description="Nothing matches this filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Contact</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((u) => (
                <UserRow key={u.id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const setActive = useSetUserActive();
  const profile =
    user.provider?.businessName ??
    user.districtOfficer?.district ??
    (user.household ? humanize(user.household.tier) : null);

  function toggle() {
    setActive.mutate(
      { id: user.id, active: !user.active },
      {
        onSuccess: () => toast.success(user.active ? 'User deactivated.' : 'User reactivated.'),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  }

  return (
    <tr className={user.active ? 'hover:bg-muted/40' : 'bg-muted/20 hover:bg-muted/40'}>
      <td className="px-4 py-3">
        <div className="font-medium">{user.name}</div>
        {profile && <div className="text-xs text-muted-foreground">{profile}</div>}
      </td>
      <td className="hidden px-4 py-3 sm:table-cell">
        <div>{user.phone}</div>
        {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={ROLE_TONE[user.role]}>{humanize(user.role)}</StatusBadge>
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{dateTime(user.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <StatusBadge tone={user.active ? 'success' : 'neutral'}>
            {user.active ? 'Active' : 'Inactive'}
          </StatusBadge>
          <Button
            variant="ghost"
            size="sm"
            disabled={setActive.isPending}
            className={user.active ? 'text-destructive' : ''}
            onClick={toggle}
          >
            {user.active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CreateUserDialog() {
  const create = useCreateUser();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'admin' as Role,
    email: '',
    password: '',
    businessName: '',
    region: '',
    district: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        name: form.name,
        phone: form.phone,
        role: form.role,
        email: form.email || undefined,
        password: form.password,
        businessName: form.role === 'provider' ? form.businessName || form.name : undefined,
        region: form.role === 'district_officer' ? form.region || undefined : undefined,
        district: form.role === 'district_officer' ? form.district || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success('User created. They must change their password on first login.');
          setOpen(false);
          setForm({ name: '', phone: '', role: 'admin', email: '', password: '', businessName: '', region: '', district: '' });
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a user</DialogTitle>
          <DialogDescription>
            They sign in with this phone and temporary password, then must set their own.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (operations)</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="household">Household</SelectItem>
                <SelectItem value="district_officer">District officer (partner)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Full name" required>
            {(p) => <Input {...p} value={form.name} onChange={set('name')} required />}
          </Field>
          {form.role === 'provider' && (
            <Field label="Business name" hint="Defaults to the full name if left blank.">
              {(p) => <Input {...p} value={form.businessName} onChange={set('businessName')} />}
            </Field>
          )}
          {form.role === 'district_officer' && (
            <RegionDistrictSelect
              required
              value={{ region: form.region, district: form.district }}
              onChange={(v) => setForm((f) => ({ ...f, region: v.region, district: v.district }))}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" required>
              {(p) => <Input {...p} value={form.phone} onChange={set('phone')} placeholder="0241234567" required />}
            </Field>
            <Field label="Email">
              {(p) => <Input {...p} type="email" value={form.email} onChange={set('email')} />}
            </Field>
          </div>
          <Field label="Temporary password" hint="At least 8 characters." required>
            {(p) => <Input {...p} value={form.password} onChange={set('password')} required minLength={8} />}
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
