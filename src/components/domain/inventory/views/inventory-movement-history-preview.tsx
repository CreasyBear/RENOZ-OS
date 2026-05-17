import { format } from 'date-fns';
import { ArrowLeftRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPE_CONFIG } from '../inventory-status-config';
import type { MovementRecord } from '../item-tabs';

interface MovementHistoryPreviewProps {
  movements?: MovementRecord[];
  isLoading?: boolean;
}

export function MovementHistoryPreview({
  movements = [],
  isLoading,
}: MovementHistoryPreviewProps) {
  const displayMovements = movements.slice(0, 5);
  const hasMore = movements.length > 5;

  if (isLoading) {
    return (
      <section>
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Movements</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-2">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (movements.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-foreground">Recent Movements</h2>
        <span className="text-sm text-muted-foreground">{movements.length} total</span>
      </div>
      <div className="space-y-2">
        {displayMovements.map((movement) => {
          const movementConfig = MOVEMENT_TYPE_CONFIG[movement.movementType];
          const Icon = movementConfig?.icon || ArrowLeftRight;
          const isPositive = movement.quantity > 0;

          return (
            <div
              key={movement.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center',
                    isPositive
                      ? 'bg-green-100 text-green-600'
                      : 'bg-red-100 text-red-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium capitalize">
                    {movement.movementType}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(movement.performedAt), 'PP')}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'text-sm font-medium tabular-nums',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? '+' : ''}
                {movement.quantity}
              </div>
            </div>
          );
        })}
        {hasMore && (
          <div className="text-sm text-muted-foreground text-center py-2">
            +{movements.length - 5} more movements
          </div>
        )}
      </div>
    </section>
  );
}
