import { format } from 'date-fns';
import { AlertTriangle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { QualityRecord } from '../item-tabs';

interface QualityTabContentProps {
  qualityRecords?: QualityRecord[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function QualityTabContent({
  qualityRecords = [],
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: QualityTabContentProps) {
  const showUnavailableState = !!isError && qualityRecords.length === 0;
  const showDegradedWarning = !!isError && qualityRecords.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (showUnavailableState) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
          <div className="space-y-3">
            <div>
              <p className="font-medium text-foreground">
                Quality inspection history is temporarily unavailable.
              </p>
              <p className="text-sm text-muted-foreground">
                {errorMessage ?? 'Please refresh and try again.'}
              </p>
            </div>
            {onRetry ? (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry Quality History
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (qualityRecords.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No quality inspections recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showDegradedWarning ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" aria-hidden="true" />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">
                  Showing the most recent quality history while refresh is unavailable.
                </p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage ?? 'Refresh failed. The inspection history below may be stale until the next successful reload.'}
                </p>
              </div>
              {onRetry ? (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry Quality History
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {qualityRecords.map((record) => (
        <div key={record.id} className="flex items-start gap-4 p-3 border rounded-lg">
          <div
            className={cn(
              'p-2 rounded',
              record.result === 'pass' && 'bg-green-100 text-green-600',
              record.result === 'fail' && 'bg-red-100 text-red-600',
              record.result === 'conditional' && 'bg-yellow-100 text-yellow-600'
            )}
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>

          <div className="flex-1">
            <div className="font-medium">{format(new Date(record.inspectionDate), 'PP')}</div>
            <div className="text-sm text-muted-foreground">
              Inspected by {record.inspectorName}
            </div>
            {record.notes && <div className="text-sm mt-1">{record.notes}</div>}
            {record.defects && record.defects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {record.defects.map((defect, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-red-600">
                    {defect}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Badge
            variant={
              record.result === 'pass'
                ? 'default'
                : record.result === 'fail'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {record.result.charAt(0).toUpperCase() + record.result.slice(1)}
          </Badge>
        </div>
      ))}
    </div>
  );
}
