/**
 * Procurement Dashboard Component (Presenter)
 *
 * Main dashboard view combining widgets, alerts, and spend trends.
 * Receives all data via props from the container route.
 *
 * @see SUPP-PROCUREMENT-DASHBOARD story
 * @see src/routes/_authenticated/procurement/dashboard.tsx (Container)
 */

import { Link } from '@tanstack/react-router';
import { RefreshCw, Calendar, Package } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FilterDateRange } from '@/components/shared/filters';
import { ActivityFeedWidget } from '@/components/domain/dashboard/widgets/activity-feed-widget';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardWidgets } from './dashboard-widgets';
import { ProcurementAlerts } from './procurement-alerts';
import type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
  ProcurementAlert,
} from '@/lib/schemas/procurement';
import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import type { ActivityWithUser } from '@/lib/schemas/activities';
import type { CursorPaginatedResponse } from '@/lib/db/pagination';

// ============================================================================
// TYPES
// ============================================================================

interface ProcurementDashboardProps {
  /** @source useSpendMetrics hook in container */
  spendMetrics?: SpendMetrics;
  /** @source useOrderMetrics hook in container */
  orderMetrics?: OrderMetrics;
  /** @source useSupplierMetrics hook in container */
  supplierMetrics?: SupplierMetrics;
  /** @source usePendingApprovals hook in container */
  pendingApprovals?: ApprovalItem[];
  /** @source useProcurementAlerts hook in container */
  alerts?: ProcurementAlert[];
  /** @source Combined loading state from all hooks in container */
  isLoading?: boolean;
  /** @source Individual widget errors from container */
  errors?: {
    spend?: Error | null;
    orders?: Error | null;
    suppliers?: Error | null;
    approvals?: Error | null;
    alerts?: Error | null;
  };
  /** @source refetch from useProcurementDashboard in container */
  onRefresh?: () => void;
  /** @source Individual widget retry functions */
  onRefreshSpend?: () => void;
  onRefreshOrders?: () => void;
  onRefreshSuppliers?: () => void;
  onRefreshApprovals?: () => void;
  /** @source Mutation handler in container */
  onDismissAlert?: (id: string) => void;
  /** @source useState in container */
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  /** @source setState handler in container */
  onDateRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  /** @source custom date range state in container */
  customDateFrom?: Date | null;
  /** @source custom date range state in container */
  customDateTo?: Date | null;
  /** @source handler in container */
  onCustomDateRangeChange?: (from: Date | null, to: Date | null) => void;
  /** @source useActivityFeed hook in container */
  activityFeed?: UseInfiniteQueryResult<InfiniteData<CursorPaginatedResponse<ActivityWithUser>>>;
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Recent Activity Widget
 */
function RecentActivity({
  activityFeed,
}: {
  activityFeed?: UseInfiniteQueryResult<InfiniteData<CursorPaginatedResponse<ActivityWithUser>>>;
}) {
  const activities = activityFeed?.data?.pages.flatMap((page) => page.items) ?? [];
  return (
      <ActivityFeedWidget
        activities={activities}
        isLoading={activityFeed?.isLoading}
        error={activityFeed?.error instanceof Error ? activityFeed.error : null}
        hasMore={activityFeed?.hasNextPage}
        isFetchingMore={activityFeed?.isFetchingNextPage}
        onLoadMore={() => activityFeed?.fetchNextPage()}
        maxItems={8}
        compact
      />
  );
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

interface QuickActionsProps {
  awaitingDeliveryCount?: number;
}

function QuickActions({ awaitingDeliveryCount }: QuickActionsProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <Link
            to="/purchase-orders/create"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
          >
            Create Purchase Order
          </Link>
          {awaitingDeliveryCount !== undefined && awaitingDeliveryCount > 0 && (
            <Link
              to="/procurement/receiving"
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
            >
              <Package className="mr-2 h-4 w-4" />
              Receive Goods ({awaitingDeliveryCount})
            </Link>
          )}
          <Link
            to="/suppliers"
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
          >
            Manage Suppliers
          </Link>
          <Link
            to="/purchase-orders"
            search={{ status: 'pending_approval' }}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full justify-start')}
          >
            Review Approvals
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Procurement Dashboard Presenter
 * Pure UI component - all data received via props from container.
 * Shows loading states and empty states when data is not available.
 */
function ProcurementDashboard({
  spendMetrics,
  orderMetrics,
  supplierMetrics,
  pendingApprovals,
  alerts,
  isLoading = false,
  errors = {},
  onRefresh,
  onRefreshSpend,
  onRefreshOrders,
  onRefreshSuppliers,
  onRefreshApprovals,
  onDismissAlert,
  dateRange = 'month',
  onDateRangeChange,
  customDateFrom = null,
  customDateTo = null,
  onCustomDateRangeChange,
  activityFeed,
}: ProcurementDashboardProps) {
  // Type guard for date range
  const isValidDateRange = (value: string): value is 'week' | 'month' | 'quarter' | 'year' => {
    return ['week', 'month', 'quarter', 'year'].includes(value);
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <Select
              value={dateRange}
              onValueChange={(v) => {
                if (isValidDateRange(v)) {
                  onDateRangeChange?.(v);
                }
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px]">
            <FilterDateRange
              from={customDateFrom}
              to={customDateTo}
              onChange={(from, to) => onCustomDateRangeChange?.(from, to)}
              label="Custom Range"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard widgets */}
      <DashboardWidgets
        spendMetrics={spendMetrics}
        orderMetrics={orderMetrics}
        supplierMetrics={supplierMetrics}
        pendingApprovals={pendingApprovals}
        isLoading={isLoading}
        errors={errors}
        onRefresh={onRefresh}
        onRefreshSpend={onRefreshSpend}
        onRefreshOrders={onRefreshOrders}
        onRefreshSuppliers={onRefreshSuppliers}
        onRefreshApprovals={onRefreshApprovals}
      />

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <RecentActivity activityFeed={activityFeed} />
            </div>
            <div>
              <QuickActions awaitingDeliveryCount={orderMetrics?.awaitingDelivery} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <ProcurementAlerts
            alerts={alerts ?? []}
            isLoading={isLoading}
            onDismiss={onDismissAlert}
            maxVisible={10}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ProcurementDashboard };
export type { ProcurementDashboardProps };
