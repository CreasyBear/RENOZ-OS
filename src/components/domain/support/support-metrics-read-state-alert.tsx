import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SupportMetricsReadStateAlertProps {
  state: 'unavailable' | 'stale';
  onRetry?: () => void;
  className?: string;
}

export function SupportMetricsReadStateAlert({
  state,
  onRetry,
  className,
}: SupportMetricsReadStateAlertProps) {
  const isUnavailable = state === 'unavailable';

  return (
    <Alert variant={isUnavailable ? 'destructive' : 'default'} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isUnavailable ? 'Support metrics unavailable' : 'Support metrics refresh unavailable'}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <span className="block">
          {isUnavailable
            ? 'Support metrics are temporarily unavailable. Issue queues and support actions remain available.'
            : 'Showing the most recent support metrics while refresh is unavailable.'}
        </span>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
