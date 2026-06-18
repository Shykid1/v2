'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Logo, LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NAV, ROLE_HOME, type NavItem } from './nav';

function isActive(pathname: string, href: string, roleRoot: string) {
  if (pathname === href) return true;
  // The role root (e.g. /household) must not light up on its own sub-routes.
  return href !== roleRoot && pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  roleRoot,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  roleRoot: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href, roleRoot);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
            )}
          >
            <Icon className={cn('size-4', active && 'text-primary')} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (user.role !== role) router.replace(ROLE_HOME[user.role]);
  }, [user, loading, role, router]);

  if (loading || !user || user.role !== role) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        <LogoMark className="size-5 animate-pulse" />
      </div>
    );
  }

  const items = NAV[role];
  const roleRoot = `/${role}`;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-svh flex-col border-r bg-sidebar px-3 py-4 lg:flex">
        <Link href={`/${role}`} className="px-2 py-1">
          <Logo />
        </Link>
        <span className="mt-1 mb-4 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {role}
        </span>
        <NavLinks items={items} pathname={pathname} roleRoot={roleRoot} />
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur-sm lg:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="px-3 py-4">
                  <div className="px-2 py-1">
                    <Logo />
                  </div>
                  <span className="mt-1 mb-4 block px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {role}
                  </span>
                  <NavLinks
                    items={items}
                    pathname={pathname}
                    roleRoot={roleRoot}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <Link href={`/${role}`} className="lg:hidden">
              <LogoMark />
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <span className="block text-sm font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">{user.phone}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/account/password')}>
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={logout}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
