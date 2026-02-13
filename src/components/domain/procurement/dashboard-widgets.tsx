/**
 * Procurement Dashboard Widgets
 *
 * Metric cards and summary widgets for procurement operations dashboard.
 * Displays spend overview, order status, supplier performance, and approval queue.
 *
 * @see SUPP-PROCUREMENT-DASHBOARD story
 */

import { Link } from '@tanstack/react-router';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  DollarSign,
  Building2,
  ShoppingCart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { FormatAmount } from '@/components/shared/format';
import { ErrorState } from '@/components/shared/error-state';
import type {
  SpendMetrics,
  OrderMetrics,
  SupplierMetrics,
  ApprovalItem,
} from '@/lib/schemas/procurement';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardWidgetsProps {
  spendMetrics?: SpendMetrics;
  orderMetrics?: OrderMetrics;
  supplierMetrics?: SupplierMetrics;
  pendingApprovals?: ApprovalItem[];
  isLoading?: boolean;
  errors?: {
    spend?: Error | null;
    orders?: Error | null;
    suppliers?: Error | null;
    approvals?: Error | null;
    alerts?: Error | null;
  };
  onRefresh?: () => void;
  onRefreshSpend?: () => void;
  onRefreshOrders?: () => void;
  onRefreshSuppliers?: () => void;
  onRefreshApprovals?: () => void;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function WidgetSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SPEND OVERVIEW WIDGET
// ============================================================================

interface SpendWidgetProps {
  metrics: SpendMetrics;
  error?: Error | null;
  onRetry?: () => void;
}

function SpendOverviewWidget({ metrics, error, onRetry }: SpendWidgetProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Failed to load spend metrics"
            message={error.message || 'Unable to load spend data.'}
            onRetry={onRetry}
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }
  // Calculate budget percentage, handling zero budget (budget tracking not implemented)
  const budgetPercent = metrics.budgetTotal > 0 
    ? (metrics.budgetUsed / metrics.budgetTotal) * 100 
    : 0;
  const isTrendUp = metrics.trendDirection === 'up';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
        <DollarSign className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <FormatAmount amount={metrics.totalSpend} />
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {isTrendUp ? (
            <TrendingUp className="h-3 w-3 text-red-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-green-500" />
          )}
          <span className={isTrendUp ? 'text-red-500' : 'text-green-500'}>
            {metrics.trendPercent}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Budget Used</span>
            <span className="font-medium">{budgetPercent.toFixed(0)}%</span>
          </div>
          <Progress value={budgetPercent} className="h-2" />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span><FormatAmount amount={metrics.budgetUsed} size="sm" /></span>
            <span><FormatAmount amount={metrics.budgetTotal} size="sm" /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ORDER STATUS WIDGET
// ============================================================================

interface OrderWidgetProps {
  metrics: OrderMetrics;
  error?: Error | null;
  onRetry?: () => void;
}

function OrderStatusWidget({ metrics, error, onRetry }: OrderWidgetProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Failed to load order metrics"
            message={error.message || 'Unable to load order status data.'}
            onRetry={onRetry}
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Order Status</CardTitle>
        <ShoppingCart className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metrics.totalOrders}</div>
        <p className="text-muted-foreground text-xs">Total orders this month</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Link
            to="/purchase-orders"
            search={{ status: 'pending_approval' }}
            className="rounded-lg bg-yellow-50 p-2 transition-colors hover:bg-yellow-100 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/40"
          >
            <div className="text-lg font-bold text-yellow-600">{metrics.pendingApproval}</div>
            <div className="text-muted-foreground text-[10px]">Pending</div>
          </Link>
          <Link
            to="/purchase-orders"
            search={{ status: 'ordered' }}
            className="rounded-lg bg-blue-50 p-2 transition-colors hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 cursor-pointer"
          >
            <div className="text-lg font-bold text-blue-600">{metrics.awaitingDelivery}</div>
            <div className="text-muted-foreground text-[10px]">Ordered</div>
          </Link>
          <Link
            to="/purchase-orders"
            search={{ status: 'received' }}
            className="rounded-lg bg-green-50 p-2 transition-colors hover:bg-green-100 dark:bg-green-950/20 dark:hover:bg-green-950/40"
          >
            <div className="text-lg font-bold text-green-600">{metrics.completedThisMonth}</div>
            <div className="text-muted-foreground text-[10px]">Received</div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUPPLIER PERFORMANCE WIDGET
// ============================================================================

interface SupplierWidgetProps {
  metrics: SupplierMetrics;
  error?: Error | null;
  onRetry?: () => void;
}

function SupplierPerformanceWidget({ metrics, error, onRetry }: SupplierWidgetProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Failed to load supplier metrics"
            message={error.message || 'Unable to load supplier performance data.'}
            onRetry={onRetry}
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Supplier Performance</CardTitle>
        <Building2 className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{metrics.avgRating.toFixed(1)}</span>
          <span className="text-muted-foreground text-sm">/ 5.0 avg rating</span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {metrics.activeSuppliers} active of {metrics.totalSuppliers} suppliers
        </p>
        {metrics.topPerformers.length > 0 && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium">Top Performers</p>
            <div className="space-y-2">
              {metrics.topPerformers.slice(0, 3).map((supplier, idx) => (
                <Link
                  key={supplier.id}
                  to="/suppliers/$supplierId"
                  params={{ supplierId: supplier.id }}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">#{idx + 1}</span>
                    <span>{supplier.name}</span>
                  </span>
                  <Badge variant="outline">{supplier.rating.toFixed(1)}</Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// APPROVAL QUEUE WIDGET
// ============================================================================

interface ApprovalWidgetProps {
  items: ApprovalItem[];
  error?: Error | null;
  onRetry?: () => void;
}

function ApprovalQueueWidget({ items, error, onRetry }: ApprovalWidgetProps) {
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            title="Failed to load approvals"
            message={error.message || 'Unable to load pending approvals.'}
            onRetry={onRetry}
            className="py-4"
          />
        </CardContent>
      </Card>
    );
  }
  const priorityConfig = {
    normal: { label: 'Normal', variant: 'secondary' as const },
    high: { label: 'High', variant: 'default' as const },
    urgent: { label: 'Urgent', variant: 'destructive' as const },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
        <Badge variant="secondary">{items.length}</Badge>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle className="mb-2 h-8 w-8 text-green-500" />
            <p className="text-muted-foreground text-sm">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to="/purchase-orders/$poId"
                params={{ poId: item.id }}
                className="hover:bg-muted/50 block rounded-lg border p-3 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.poNumber}</p>
                    <p className="text-muted-foreground text-xs">{item.supplierName}</p>
                  </div>
                  <Badge variant={priorityConfig[item.priority].variant}>
                    {priorityConfig[item.priority].label}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    <FormatAmount amount={item.amount} currency={item.currency} />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(item.submittedAt).toLocaleDateString('en-AU')}
                  </span>
                </div>
              </Link>
            ))}
            {items.length > 5 && (
              <Link
                to="/purchase-orders"
                search={{ status: 'pending_approval' }}
                className="text-primary block text-center text-sm hover:underline"
              >
                View all {items.length} pending approvals
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DashboardWidgets({
  spendMetrics,
  orderMetrics,
  supplierMetrics,
  pendingApprovals = [],
  isLoading = false,
  errors = {},
  onRefresh,
  onRefreshSpend,
  onRefreshOrders,
  onRefreshSuppliers,
  onRefreshApprovals,
}: DashboardWidgetsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <WidgetSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {spendMetrics ? (
        <SpendOverviewWidget 
          metrics={spendMetrics}
          error={errors.spend}
          onRetry={onRefreshSpend ?? onRefresh}
        />
      ) : errors.spend ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Failed to load spend metrics"
              message={errors.spend.message || 'Unable to load spend data.'}
              onRetry={onRefreshSpend ?? onRefresh}
              className="py-4"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <DollarSign className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No spend data</p>
          </CardContent>
        </Card>
      )}

      {orderMetrics ? (
        <OrderStatusWidget 
          metrics={orderMetrics}
          error={errors.orders}
          onRetry={onRefreshOrders ?? onRefresh}
        />
      ) : errors.orders ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Failed to load order metrics"
              message={errors.orders.message || 'Unable to load order data.'}
              onRetry={onRefreshOrders ?? onRefresh}
              className="py-4"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <ShoppingCart className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No order data</p>
          </CardContent>
        </Card>
      )}

      {supplierMetrics ? (
        <SupplierPerformanceWidget 
          metrics={supplierMetrics}
          error={errors.suppliers}
          onRetry={onRefreshSuppliers ?? onRefresh}
        />
      ) : errors.suppliers ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              title="Failed to load supplier metrics"
              message={errors.suppliers.message || 'Unable to load supplier data.'}
              onRetry={onRefreshSuppliers ?? onRefresh}
              className="py-4"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="text-muted-foreground mb-2 h-8 w-8" />
            <p className="text-muted-foreground text-sm">No supplier data</p>
          </CardContent>
        </Card>
      )}

      <ApprovalQueueWidget 
        items={pendingApprovals}
        error={errors.approvals}
        onRetry={onRefreshApprovals ?? onRefresh}
      />
    </div>
  );
}

export {
  DashboardWidgets,
  SpendOverviewWidget,
  OrderStatusWidget,
  SupplierPerformanceWidget,
  ApprovalQueueWidget,
};
export type { DashboardWidgetsProps };
