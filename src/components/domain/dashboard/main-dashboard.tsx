/**
 * Main Dashboard Component
 *
 * ARCHITECTURE: Presentational component - receives all data via props from route.
 *
 * This is the main dashboard view showing key metrics, recent activity, and alerts.
 * All data is passed down from the container (route) component.
 *
 * @example
 * ```tsx
 * // In route:
 * const { data: customerAnalytics } = useDashboardAnalytics('30d');
 * const { data: ordersData } = useOrders({ pageSize: 5 });
 *
 * return (
 *   <MainDashboard
 *     customerMetrics={{ total: customerAnalytics.kpis.totalCustomers, newThisMonth: 42 }}
 *     recentOrders={ordersData.items}
 *     isLoading={isLoading}
 *   />
 * );
 * ```
 */

import { TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard } from '@/components/shared';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerMetrics {
  totalCustomers: number;
  newThisMonth?: number;
}

export interface PipelineMetrics {
  totalValue: string;
  dealCount: number;
  hotLeads?: number;
  changePercent?: number;
}

export interface LowStockItem {
  id: string;
  product?: {
    name: string;
  };
  quantityOnHand: number;
  threshold?: number;
}

/**
 * Order list item as returned by listOrders server function.
 * This includes the customer relation which is joined in the query.
 */
export interface OrderListItem {
  id: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  orderDate: string | null;
  dueDate: string | null;
  total: number | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
  } | null;
  itemCount: number;
}

export interface MainDashboardProps {
  /** Customer metrics from useDashboardAnalytics('30d').kpis */
  customerMetrics?: CustomerMetrics;
  /** Pipeline metrics (placeholder data until pipeline hooks created) */
  pipelineMetrics?: PipelineMetrics;
  /** Recent orders from useOrders({ pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' }) */
  recentOrders?: OrderListItem[];
  /** Low stock items from useInventoryLowStock() */
  lowStockItems?: LowStockItem[];
  /** Combined loading state */
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// ORDER STATUS BADGE SUB-COMPONENT
// ============================================================================

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-green-100 text-green-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status] || 'bg-gray-100 text-gray-800'
      )}
    >
      {status}
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MainDashboard({
  customerMetrics,
  pipelineMetrics,
  recentOrders,
  lowStockItems,
  isLoading = false,
  className,
}: MainDashboardProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Metric Cards Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Pipeline Summary */}
        <MetricCard
          title="Pipeline Value"
          value={pipelineMetrics?.totalValue || '$0'}
          subtitle={`${pipelineMetrics?.dealCount || 0} active deals`}
          icon={TrendingUp}
          delta={pipelineMetrics?.changePercent}
          isLoading={isLoading}
        />

        {/* Customer Count */}
        <MetricCard
          title="Total Customers"
          value={customerMetrics?.totalCustomers?.toString() || '0'}
          subtitle="Active customers"
          icon={Users}
          delta={customerMetrics?.newThisMonth}
          isLoading={isLoading}
        />

        {/* Recent Orders */}
        <MetricCard
          title="Recent Orders"
          value={recentOrders?.length?.toString() || '0'}
          subtitle="Latest orders"
          icon={ShoppingCart}
          isLoading={isLoading}
        />
      </div>

      {/* Widgets Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Widget */}
        <RecentOrdersWidget orders={recentOrders} isLoading={isLoading} />

        {/* Low Stock Alerts Widget */}
        <LowStockWidget items={lowStockItems} isLoading={isLoading} />
      </div>
    </div>
  );
}

// ============================================================================
// RECENT ORDERS WIDGET
// ============================================================================

interface RecentOrdersWidgetProps {
  orders?: OrderListItem[];
  isLoading?: boolean;
}

function RecentOrdersWidget({ orders, isLoading }: RecentOrdersWidgetProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="font-medium text-gray-900">Recent Orders</h3>
      </div>
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        ) : orders?.length ? (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {order.customer?.name || 'Unknown Customer'}
                  </p>
                  <p className="text-sm text-gray-500">${order.total?.toLocaleString() || '0'}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">No recent orders</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// LOW STOCK WIDGET
// ============================================================================

interface LowStockWidgetProps {
  items?: LowStockItem[];
  isLoading?: boolean;
}

function LowStockWidget({ items, isLoading }: LowStockWidgetProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h3 className="font-medium text-gray-900">Low Stock Alerts</h3>
      </div>
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-amber-50 p-3">
                <div className="h-5 w-5 animate-pulse rounded bg-amber-200" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        ) : items?.length ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-amber-50 p-3">
                <svg
                  className="h-5 w-5 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.product?.name || 'Unknown Product'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantityOnHand || 0} in stock (threshold: {item.threshold || 10})
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">No low stock alerts</p>
        )}
      </div>
    </div>
  );
}
