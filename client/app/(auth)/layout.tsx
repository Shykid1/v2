import Link from 'next/link';
import { Droplets, ShieldCheck, Truck } from 'lucide-react';
import { Logo } from '@/components/brand/logo';

const POINTS = [
  { icon: Droplets, text: 'Pit status and flood alerts before an overflow happens.' },
  { icon: Truck, text: 'Vetted providers, fixed prices, no wasted trips.' },
  { icon: ShieldCheck, text: 'Paid on time. Notified at every step.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 22px)',
          }}
        />
        <Link href="/" className="relative">
          <Logo inverted />
        </Link>
        <div className="relative space-y-6">
          <h2 className="max-w-sm font-heading text-3xl leading-tight font-semibold text-balance">
            Sanitation that runs itself.
          </h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-primary-foreground/85">
                <Icon className="mt-0.5 size-4 shrink-0" />
                <span className="max-w-xs">{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-primary-foreground/60">
          Northern Ghana sanitation service coordination.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-flex lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
