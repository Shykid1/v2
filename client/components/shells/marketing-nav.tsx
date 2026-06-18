'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { ROLE_HOME } from './nav';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export function MarketingNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="SaniChain home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5">
          {user ? (
            <Button asChild size="sm">
              <Link href={ROLE_HOME[user.role]}>Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
