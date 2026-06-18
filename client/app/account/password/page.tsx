'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME } from '@/components/shells/nav';
import { Logo } from '@/components/brand/logo';
import { Field } from '@/components/form/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AuthResponse } from '@/lib/types';

export default function ChangePasswordPage() {
  const { user, loading, setSession } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.put<AuthResponse>('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSession(res);
      toast.success('Password updated.');
      router.replace(ROLE_HOME[res.user.role]);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Change password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <Field label="Current password" required>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            )}
          </Field>
          <Field label="New password" hint="At least 8 characters." required>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={8}
              />
            )}
          </Field>
          <Field label="Confirm new password" error={error} required>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
                minLength={8}
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Update password'}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => router.push(ROLE_HOME[user.role])}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
