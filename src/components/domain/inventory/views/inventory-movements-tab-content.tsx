import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { ArrowLeftRight, ExternalLink, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MOVEMENT_TYPE_CONFIG } from '../inventory-status-config';
import { getMovementReferenceLink } from '../movement-reference-links';
import type { MovementRecord } from '../item-tabs';

interface MovementsTabContentProps {
  movements?: MovementRecord[];
  isLoading?: boolean;
}

export function MovementsTabContent({
  movements = [],
  isLoading,
}: MovementsTabContentProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-3 border rounded">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No movement history</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-2">
        {movements.map((movement) => {
          const movementConfig = MOVEMENT_TYPE_CONFIG[movement.movementType];
          const Icon = movementConfig?.icon || ArrowLeftRight;
          const isPositive = movement.quantity > 0;

          return (
            <div
              key={movement.id}
              className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
            >
              <div
                className={cn(
                  'p-2 rounded',
                  isPositive
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium capitalize">{movement.movementType}</span>
                  {movement.referenceType && (
                    (() => {
                      const referenceLink = getMovementReferenceLink(
                        movement.referenceType,
                        movement.referenceId
                      );
                      const displayLabel = movement.referenceNumber
                        ? movement.referenceNumber
                        : movement.referenceType.replace(/_/g, ' ');
                      return referenceLink ? (
                        <Link
                          {...referenceLink}
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Badge variant="outline" className="text-xs hover:bg-accent transition-colors cursor-pointer">
                            {displayLabel}
                            <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </Badge>
                        </Link>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {displayLabel}
                        </Badge>
                      );
                    })()
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {movement.performedBy} • {format(new Date(movement.performedAt), 'PPp')}
                </div>
                {movement.reason && (
                  <div className="text-sm text-muted-foreground mt-1">{movement.reason}</div>
                )}
              </div>

              <div className="text-right tabular-nums">
                <div
                  className={cn(
                    'font-semibold',
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {movement.quantity}
                </div>
                <div className="text-xs text-muted-foreground">
                  {movement.previousQuantity} - {movement.newQuantity}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
