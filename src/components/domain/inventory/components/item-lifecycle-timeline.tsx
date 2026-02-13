/**
 * Item Lifecycle Timeline Component
 *
 * Vertical timeline showing item lifecycle derived from movements data.
 * Displays key stages: Received, Allocated, Shipped, Sold with dates and order references.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md (Zone 5A: Main Content)
 */
import { memo, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ArrowDownToLine,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MovementRecord } from '../item-tabs';

// ============================================================================
// TYPES
// ============================================================================

export interface LifecycleEvent {
  id: string;
  stage: 'received' | 'allocated' | 'shipped' | 'sold' | 'damaged' | 'returned' | 'quarantined';
  label: string;
  date: Date;
  description?: string;
  orderId?: string;
  orderNumber?: string;
  location?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface ItemLifecycleTimelineProps {
  /** Current item status */
  currentStatus: string;
  /** Movement records to derive timeline from */
  movements?: MovementRecord[];
  /** Received date (from item record) */
  receivedAt?: Date | string;
  /** Location name where item was received */
  locationName?: string;
  className?: string;
}

// ============================================================================
// LIFECYCLE STAGE CONFIG
// ============================================================================

const STAGE_ICONS: Record<string, typeof ArrowDownToLine> = {
  received: ArrowDownToLine,
  allocated: Package,
  shipped: Truck,
  sold: CheckCircle2,
  damaged: AlertTriangle,
  returned: RotateCcw,
  quarantined: AlertTriangle,
};

const STAGE_COLORS: Record<string, string> = {
  received: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  allocated: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  shipped: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  sold: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  damaged: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  returned: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
  quarantined: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
};

/**
 * Derive lifecycle events from movements data
 */
function deriveLifecycleEvents(
  currentStatus: string,
  movements: MovementRecord[] = [],
  receivedAt?: Date | string,
  locationName?: string
): LifecycleEvent[] {
  const events: LifecycleEvent[] = [];
  const normalizedStatus = currentStatus.toLowerCase();

  // 1. Received event (always first)
  const receiveMovement = movements.find((m) => m.movementType === 'receive');
  const receivedDate = receiveMovement?.performedAt || receivedAt;
  if (receivedDate) {
    events.push({
      id: 'received',
      stage: 'received',
      label: 'Received',
      date: new Date(receivedDate),
      description: locationName ? `Received at ${locationName}` : 'Received into inventory',
      location: locationName,
      isCompleted: true,
      isCurrent: normalizedStatus === 'available',
    });
  }

  // 2. Allocated event (if allocated, shipped, or sold)
  const allocateMovement = movements.find((m) => m.movementType === 'allocate');
  if (
    allocateMovement ||
    ['allocated', 'shipped', 'sold', 'returned'].includes(normalizedStatus)
  ) {
    events.push({
      id: 'allocated',
      stage: 'allocated',
      label: 'Allocated',
      date: allocateMovement
        ? new Date(allocateMovement.performedAt)
        : new Date(),
      description: allocateMovement?.referenceNumber
        ? `Reserved for order ${allocateMovement.referenceNumber}`
        : 'Reserved for order',
      orderId: allocateMovement?.referenceId,
      orderNumber: allocateMovement?.referenceNumber,
      isCompleted: ['allocated', 'shipped', 'sold', 'returned'].includes(normalizedStatus),
      isCurrent: normalizedStatus === 'allocated',
    });
  }

  // 3. Shipped event (if shipped or sold)
  const shipMovement = movements.find((m) => m.movementType === 'ship');
  if (
    shipMovement ||
    ['shipped', 'sold'].includes(normalizedStatus)
  ) {
    events.push({
      id: 'shipped',
      stage: 'shipped',
      label: 'Shipped',
      date: shipMovement ? new Date(shipMovement.performedAt) : new Date(),
      description: shipMovement?.referenceNumber
        ? `Dispatched for order ${shipMovement.referenceNumber}`
        : 'Dispatched to customer',
      orderId: shipMovement?.referenceId,
      orderNumber: shipMovement?.referenceNumber,
      isCompleted: ['shipped', 'sold'].includes(normalizedStatus),
      isCurrent: normalizedStatus === 'shipped',
    });
  }

  // 4. Terminal state event
  if (['sold', 'damaged', 'returned', 'quarantined'].includes(normalizedStatus)) {
    const labelMap: Record<string, string> = {
      sold: 'Sold',
      damaged: 'Damaged',
      returned: 'Returned',
      quarantined: 'Quarantined',
    };
    const descriptionMap: Record<string, string> = {
      sold: 'Sale completed',
      damaged: 'Item marked as damaged',
      returned: 'Returned by customer',
      quarantined: 'Under quality hold',
    };

    // Find the most recent movement to get date
    const latestMovement = movements
      .filter((m) =>
        ['ship', 'return', 'adjust'].includes(m.movementType)
      )
      .sort(
        (a, b) =>
          new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      )[0];

    events.push({
      id: normalizedStatus,
      stage: normalizedStatus as LifecycleEvent['stage'],
      label: labelMap[normalizedStatus] || normalizedStatus,
      date: latestMovement ? new Date(latestMovement.performedAt) : new Date(),
      description: descriptionMap[normalizedStatus] || 'Current state',
      isCompleted: true,
      isCurrent: true,
    });
  }

  return events;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ItemLifecycleTimeline = memo(function ItemLifecycleTimeline({
  currentStatus,
  movements = [],
  receivedAt,
  locationName,
  className,
}: ItemLifecycleTimelineProps) {
  const events = useMemo(
    () => deriveLifecycleEvents(currentStatus, movements, receivedAt, locationName),
    [currentStatus, movements, receivedAt, locationName]
  );

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Lifecycle Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No lifecycle events recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Lifecycle Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = STAGE_ICONS[event.stage] || CheckCircle2;
              const colorClass = STAGE_COLORS[event.stage] || STAGE_COLORS.received;
              const isLast = index === events.length - 1;

              return (
                <div
                  key={event.id}
                  className={cn('relative flex gap-4', isLast && 'pb-0')}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'absolute -left-6 flex items-center justify-center w-6 h-6 rounded-full',
                      event.isCompleted ? colorClass : 'text-muted-foreground bg-muted',
                      event.isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'font-medium',
                          event.isCompleted ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {event.label}
                      </span>
                      {event.isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                      {event.orderNumber && event.orderId && (
                        <Link
                          to="/orders/$orderId"
                          params={{ orderId: event.orderId }}
                          className="inline-flex items-center"
                        >
                          <Badge
                            variant="outline"
                            className="text-xs hover:bg-accent transition-colors cursor-pointer"
                          >
                            {event.orderNumber}
                            <ExternalLink className="h-2.5 w-2.5 ml-1" />
                          </Badge>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {event.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(event.date, 'MMM d, yyyy · h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default ItemLifecycleTimeline;
