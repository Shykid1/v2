'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PayReturnPage() {
  return (
    <Suspense>
      <PayReturn />
    </Suspense>
  );
}

function PayReturn() {
  const params = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const status = (params.get('status') ?? 'pending').toLowerCase();

  const state =
    status === 'success'
      ? {
          icon: CheckCircle2,
          tone: 'text-success bg-success/15',
          title: 'Payment received',
          body: 'Your payment has been confirmed. A receipt is on its way by SMS and WhatsApp.',
        }
      : status === 'failed'
        ? {
            icon: XCircle,
            tone: 'text-destructive bg-destructive/12',
            title: 'Payment not completed',
            body: 'We could not confirm this payment. You can try again, or pay cash on completion.',
          }
        : {
            icon: Clock,
            tone: 'text-warning-foreground bg-warning/25',
            title: 'Confirming your payment',
            body: 'This usually takes a moment. We will send a receipt by SMS and WhatsApp once it clears.',
          };

  const Icon = state.icon;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-20 text-center">
      <div className={`flex size-12 items-center justify-center rounded-full ${state.tone}`}>
        <Icon className="size-6" />
      </div>
      <h1 className="mt-5 font-heading text-2xl font-semibold tracking-tight">{state.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground text-balance">{state.body}</p>
      {reference && (
        <p className="mt-4 text-xs text-muted-foreground">
          Reference <span className="font-mono text-foreground">{reference}</span>
        </p>
      )}
      <div className="mt-8 flex gap-2">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
