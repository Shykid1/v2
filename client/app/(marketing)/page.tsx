import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  Bell,
  CloudRain,
  Phone,
  Radio,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { GuestRequest } from '@/components/marketing/guest-request';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            Northern Ghana pilot
          </span>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Never think about your pit latrine again.
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            SaniChain spots a full or at-risk pit, by sensor, flood forecast, or a quick call, and
            sends a vetted provider to empty it before it overflows. Dispatch, payment, and alerts
            run end to end.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">
                Get a sensor, go premium <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register">Run a truck? Join as a provider</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t pt-6">
            {[
              ['< 30 min', 'to a provider'],
              ['Fixed', 'zonal prices'],
              ['SMS + WhatsApp', 'every step'],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-heading text-lg font-semibold">{k}</dt>
                <dd className="text-xs text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex items-center">
          <div className="w-full">
            <GuestRequest />
          </div>
        </div>
      </section>

      {/* Two ways in */}
      <section className="border-t bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-0 sm:grid-cols-2">
          <div className="bg-primary px-6 py-10 text-primary-foreground sm:px-10">
            <span className="text-xs font-medium tracking-wide uppercase opacity-70">Premium</span>
            <h2 className="mt-2 font-heading text-2xl font-semibold">Sensored households</h2>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/85">
              A SaniChain sensor watches the fill level and the weather. Your pit is emptied before
              it overflows, and before the September floods cut your road. Set and forget.
            </p>
            <Button asChild variant="secondary" className="mt-6">
              <Link href="/register">Set up a sensor</Link>
            </Button>
          </div>
          <div className="bg-card px-6 py-10 sm:px-10">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Self-serve
            </span>
            <h2 className="mt-2 font-heading text-2xl font-semibold">No sensor, no problem</h2>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Pit is full now? One short request, by web or a USSD code on any phone, summons a
              vetted provider at a clear fixed price. No haggling, no waiting around.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/register">Request emptying</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How a job runs */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">How a job runs</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Every request becomes a tracked job. You always know where it stands.
        </p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: '01', icon: Radio, t: 'Detected', d: 'Sensor fill, flood forecast, USSD call, or a tap requests the job.' },
            { n: '02', icon: Truck, t: 'Dispatched', d: 'The nearest vetted provider is offered the job and accepts.' },
            { n: '03', icon: ShieldCheck, t: 'Emptied', d: 'The provider arrives, empties the pit, and marks it done.' },
            { n: '04', icon: Banknote, t: 'Paid', d: 'Cash or Mobile Money settles. Everyone gets a receipt.' },
          ].map((s) => (
            <li key={s.n} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4.5" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Triggers */}
      <section className="border-t bg-card/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Three ways demand starts</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              { icon: Bell, t: 'Sensor fill', d: 'An ultrasonic sensor reports the pit level on a schedule. Past the threshold, a job is created automatically.' },
              { icon: CloudRain, t: 'Flood forecast', d: 'Climate data flags a flood window. Sensored pits above the line are emptied pre-emptively.' },
              { icon: Phone, t: 'USSD call', d: 'No smartphone needed. A short code on any phone reports a full or broken latrine and prices it.' },
            ].map((t) => (
              <div key={t.t} className="border-t pt-5">
                <t.icon className="size-5 text-primary" />
                <h3 className="mt-3 font-heading text-base font-semibold">{t.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Provider CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl border bg-card p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-xl font-semibold">Run a desludging truck?</h2>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
              Get a steady stream of verified full-pit jobs, best-route navigation, and reliable
              next-day payouts. No wasted trips.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/register">
              Apply as a provider <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
