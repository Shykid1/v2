import { cn } from '@/lib/utils';
import { ghs } from '@/lib/format';
import type { PriceQuote } from '@/lib/types';

/** Transparent fixed-zonal price. Money is first-class: show the breakdown, never bury it. */
export function PriceTag({
  quote,
  loading,
  className,
}: {
  quote: PriceQuote | undefined;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border bg-muted/40 p-4', className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">Fixed price</span>
        <span className="font-heading text-2xl font-semibold tabular-nums">
          {loading || !quote ? <span className="text-muted-foreground">…</span> : ghs(quote.total)}
        </span>
      </div>
      {quote && quote.accessSurcharge > 0 && (
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
          {ghs(quote.basePrice)} base + {ghs(quote.accessSurcharge)} remote access
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Set by pit size and distance zone. No surprises, no haggling.
      </p>
    </div>
  );
}
