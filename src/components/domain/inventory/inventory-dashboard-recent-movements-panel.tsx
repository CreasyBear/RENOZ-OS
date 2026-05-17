import { Link } from '@tanstack/react-router';
import { ArrowRight, Clock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  InventoryDashboardMovementsSkeleton,
  InventoryDashboardMovementsTimeline,
} from './inventory-dashboard-movements-timeline';
import { InventoryDashboardReadWarning } from './inventory-dashboard-read-warning';
import type { RecentMovement } from '@/hooks/inventory';

interface InventoryDashboardRecentMovementsPanelProps {
  movements: RecentMovement[];
  isLoading: boolean;
  showUnavailable: boolean;
  showDegraded: boolean;
  readErrorMessage: string;
}

export function InventoryDashboardRecentMovementsPanel({
  movements,
  isLoading,
  showUnavailable,
  showDegraded,
  readErrorMessage,
}: InventoryDashboardRecentMovementsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Movements
          </CardTitle>
          <CardDescription className="mt-1">Last 24 hours</CardDescription>
        </div>
        <Link
          to="/inventory/analytics"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs h-7')}
        >
          View All
          <ArrowRight className="h-3 w-3 ml-1" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <InventoryDashboardMovementsSkeleton />
        ) : showUnavailable ? (
          <InventoryDashboardReadWarning
            title="Recent movements are temporarily unavailable."
            message={readErrorMessage}
          />
        ) : (
          <div className="space-y-4">
            {showDegraded ? (
              <InventoryDashboardReadWarning
                title="Recent movements may be stale."
                message={readErrorMessage}
              />
            ) : null}
            <InventoryDashboardMovementsTimeline movements={movements} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
