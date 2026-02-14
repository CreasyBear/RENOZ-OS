/**
 * Operations Section
 *
 * Displays operations KPIs: Orders to Ship, Active Projects, Inventory Health
 *
 * Uses shared MetricCard component per METRIC-CARD-STANDARDS.md
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useNavigate } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Package, Briefcase, Boxes, AlertTriangle } from 'lucide-react';
import { MetricCard } from '@/components/shared/metric-card';
import { MetricCardPopover, type RecentItem } from '@/components/shared/metric-card-popover';

// ============================================================================
// TYPES
// ============================================================================

export interface OperationsMetrics {
  ordersToShip: number;
  activeProjects: number;
  lowStockItems: number;
  totalInventoryValue?: number;
  // Contextual data for insights
  oldestOrderDays?: number;        // Days since oldest unshipped order
  projectsBehind?: number;         // Projects behind schedule
  criticalStockItems?: number;     // Items at zero stock
  // Recent items for popovers
  recentOrdersToShip?: RecentItem[];
}

export interface OperationsSectionProps {
  metrics?: OperationsMetrics | null;
  isLoading?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-AU').format(value);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OperationsSection({ metrics, isLoading }: OperationsSectionProps) {
  const navigate = useNavigate();

  // Build contextual subtitles
  const ordersSubtitle = metrics?.oldestOrderDays
    ? `Oldest: ${metrics.oldestOrderDays} days`
    : metrics?.ordersToShip === 0
      ? 'All shipped'
      : 'Ready to fulfill';

  const projectsSubtitle = metrics?.projectsBehind
    ? `${metrics.projectsBehind} behind schedule`
    : metrics?.activeProjects === 0
      ? 'No active projects'
      : 'All on track';

  const lowStockSubtitle = metrics?.criticalStockItems
    ? `${metrics.criticalStockItems} at zero stock`
    : metrics?.lowStockItems === 0
      ? 'Stock levels healthy'
      : 'Below reorder point';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Operations</CardTitle>
        <Link
          to="/orders"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View Details
        </Link>
      </CardHeader>
      <CardContent>
        {/* KPI Grid - Using shared MetricCard with contextual subtitles and popovers */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* "Orders to Fulfill" uses getRecentOrdersToShip (confirmed orders awaiting pick).
              Future: getRecentOrdersPicked for "Ready to Ship" metric if product wants it. */}
          <MetricCardPopover
            items={metrics?.recentOrdersToShip}
            viewAllHref="/orders/fulfillment"
            viewAllLabel="View fulfillment dashboard"
            emptyMessage="All orders fulfilled"
            disabled={isLoading}
          >
            <MetricCard
              title="Orders to Fulfill"
              value={formatNumber(metrics?.ordersToShip ?? 0)}
              subtitle={ordersSubtitle}
              icon={Package}
              onClick={() => navigate({ to: '/orders/fulfillment' })}
              isLoading={isLoading}
            />
          </MetricCardPopover>
          <MetricCard
            title="Active Projects"
            value={formatNumber(metrics?.activeProjects ?? 0)}
            subtitle={projectsSubtitle}
            icon={Briefcase}
            alert={!!metrics?.projectsBehind && metrics.projectsBehind > 0}
            onClick={() => navigate({ to: '/projects', search: { status: 'in_progress' } })}
            isLoading={isLoading}
          />
          <MetricCard
            title="Low Stock Items"
            value={formatNumber(metrics?.lowStockItems ?? 0)}
            subtitle={lowStockSubtitle}
            icon={metrics?.lowStockItems && metrics.lowStockItems > 0 ? AlertTriangle : Boxes}
            alert={!!metrics?.lowStockItems && metrics.lowStockItems > 0}
            onClick={() => navigate({ to: '/inventory/alerts' })}
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
