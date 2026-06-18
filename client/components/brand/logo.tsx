import { cn } from '@/lib/utils';

/** SaniChain mark: a pit cross-section with a rising fill line. Abstract, not a water droplet. */
export function LogoMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const square = inverted ? 'var(--primary-foreground)' : 'var(--primary)';
  const line = inverted ? 'var(--primary)' : 'var(--primary-foreground)';
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('size-6', className)} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill={square} />
      <path d="M7 15.5h10" stroke={line} strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M7 12h10" stroke={line} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M7 8.5h6" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  inverted = false,
}: {
  className?: string;
  showWordmark?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark inverted={inverted} />
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight">SaniChain</span>
      )}
    </span>
  );
}
