import { Fragment } from 'react';
import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { RecentMovement } from '@/hooks/inventory';

const movementIcons = {
  receipt: ArrowDownToLine,
  receive: ArrowDownToLine,
  transfer: ArrowRightLeft,
  allocation: ArrowUpFromLine,
  allocate: ArrowUpFromLine,
  pick: ArrowUpFromLine,
  ship: ArrowUpFromLine,
  adjust: ArrowRightLeft,
  return: ArrowDownToLine,
  deallocate: ArrowRightLeft,
};

interface AggregatedActivity {
  id: string;
  type: string;
  reference: string | null;
  timestamp: Date;
  totalQuantity: number;
  skuCount: number;
  skus: string[];
  location: string;
  toLocation: string | null;
}

interface InventoryDashboardMovementsTimelineProps {
  movements: RecentMovement[];
}

function aggregateMovementsIntoActivities(movements: RecentMovement[]): AggregatedActivity[] {
  const activityMap = new Map<string, AggregatedActivity>();

  for (const movement of movements) {
    const timestamp = new Date(movement.timestamp);
    const hourKey = format(timestamp, 'yyyy-MM-dd-HH');
    const groupKey = movement.reference
      ? `${movement.type}-${movement.reference}`
      : `${movement.type}-${movement.location}-${hourKey}`;

    const existing = activityMap.get(groupKey);
    if (existing) {
      existing.totalQuantity += movement.quantity;
      if (!existing.skus.includes(movement.productSku)) {
        existing.skus.push(movement.productSku);
        existing.skuCount = existing.skus.length;
      }
      if (timestamp > existing.timestamp) {
        existing.timestamp = timestamp;
      }
    } else {
      activityMap.set(groupKey, {
        id: groupKey,
        type: movement.type,
        reference: movement.reference,
        timestamp,
        totalQuantity: movement.quantity,
        skuCount: 1,
        skus: [movement.productSku],
        location: movement.location,
        toLocation: movement.toLocation,
      });
    }
  }

  return Array.from(activityMap.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

function formatActivityDescription(activity: AggregatedActivity): string {
  const { type, reference, totalQuantity, skuCount, location, toLocation } = activity;
  const skuText = skuCount === 1 ? '1 SKU' : `${skuCount} SKUs`;
  const qtyText = `${totalQuantity} unit${totalQuantity !== 1 ? 's' : ''}`;

  switch (type) {
    case 'receipt':
    case 'receive':
      return reference
        ? `Received ${reference}: ${qtyText} (${skuText})`
        : `Received ${qtyText} (${skuText}) at ${location}`;
    case 'transfer':
      return toLocation
        ? `Transferred ${qtyText} (${skuText}): ${location} → ${toLocation}`
        : `Transferred ${qtyText} (${skuText}) at ${location}`;
    case 'allocation':
    case 'allocate':
      return reference
        ? `Allocated for ${reference}: ${qtyText} (${skuText})`
        : `Allocated ${qtyText} (${skuText}) at ${location}`;
    case 'pick':
    case 'ship':
      return reference
        ? `Shipped ${reference}: ${qtyText} (${skuText})`
        : `Shipped ${qtyText} (${skuText}) from ${location}`;
    case 'adjust':
      return `Adjusted ${qtyText} (${skuText}) at ${location}`;
    case 'return':
      return reference
        ? `Returned from ${reference}: ${qtyText} (${skuText})`
        : `Returned ${qtyText} (${skuText}) at ${location}`;
    default:
      return `${type}: ${qtyText} (${skuText}) at ${location}`;
  }
}

export function InventoryDashboardMovementsTimeline({
  movements,
}: InventoryDashboardMovementsTimelineProps) {
  const activities = aggregateMovementsIntoActivities(movements);

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  const activitiesByDate = new Map<string, AggregatedActivity[]>();
  for (const activity of activities) {
    let dateLabel: string;
    if (isToday(activity.timestamp)) {
      dateLabel = 'Today';
    } else if (isYesterday(activity.timestamp)) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = format(activity.timestamp, 'MMM d');
    }
    const existing = activitiesByDate.get(dateLabel) ?? [];
    existing.push(activity);
    activitiesByDate.set(dateLabel, existing);
  }

  return (
    <div className="space-y-1 max-h-[320px] overflow-y-auto">
      {Array.from(activitiesByDate.entries()).map(([dateLabel, dateActivities]) => (
        <Fragment key={dateLabel}>
          {dateLabel !== 'Today' && (
            <p className="text-xs font-medium text-muted-foreground pt-3 pb-1 sticky top-0 bg-card z-10">
              {dateLabel}
            </p>
          )}
          {dateActivities.map((activity) => {
            const Icon = (activity.type in movementIcons
              ? movementIcons[activity.type as keyof typeof movementIcons]
              : ArrowRightLeft);
            const isOutbound = ['allocation', 'allocate', 'pick', 'ship'].includes(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
              >
                <div
                  className={cn(
                    'mt-0.5 p-1.5 rounded-full shrink-0',
                    isOutbound
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isOutbound
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {formatActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(activity.timestamp, 'h:mm a')}
                    {activity.skuCount <= 3 && activity.skus.length > 0 && (
                      <span className="ml-2 text-muted-foreground/70">
                        {activity.skus.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    'shrink-0 tabular-nums text-xs',
                    isOutbound
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-green-100 text-green-700 dark:text-green-400'
                  )}
                >
                  {isOutbound ? '-' : '+'}
                  {activity.totalQuantity}
                </Badge>
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

export function InventoryDashboardMovementsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  );
}
