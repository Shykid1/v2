import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/12 text-destructive">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="mt-1 max-w-sm text-sm text-balance text-muted-foreground">
        {message ?? 'We could not load this. Check your connection and try again.'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
