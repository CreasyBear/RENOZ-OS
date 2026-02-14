/**
 * Customer Orders Tab
 *
 * Displays the order history for a customer.
 * Uses order summary data from customer detail to avoid extra API calls.
 * Links to individual order detail pages.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { Package, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { formatDate } from '@/lib/formatters';
import type { CustomerDetailData } from '@/lib/schemas/customers';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerOrdersTabProps {
  orderSummary: CustomerDetailData['orderSummary'];
  totalOrders: number;
  /** Customer ID for "Create Order" links to pre-select customer */
  customerId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

// Hardcoded status colors (no dynamic classes)
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    case 'picking':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200';
    case 'picked':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
    case 'shipped':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200';
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
    case 'cancelled':
      return 'bg-destructive/10 text-destructive';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ customerId }: { customerId?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No orders yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This customer hasn&apos;t placed any orders.
      </p>
      <Link
        to="/orders/create"
        search={customerId ? { customerId } : undefined}
        className={cn(buttonVariants({ variant: 'default' }))}
      >
        Create First Order
      </Link>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CustomerOrdersTab = memo(function CustomerOrdersTab({
  orderSummary,
  totalOrders,
  customerId,
}: CustomerOrdersTabProps) {
  const orders = orderSummary?.recentOrders ?? [];

  if (orders.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState customerId={customerId} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Order History ({totalOrders})
        </h3>
        <Link
          to="/orders/create"
          search={customerId ? { customerId } : undefined}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          New Order
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="hover:underline text-primary"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.orderDate, { locale: 'en-AU' })}
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-[10px]', getStatusColor(order.status))}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  <FormatAmount amount={order.total ?? 0} />
                </TableCell>
                <TableCell>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">View order</span>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalOrders > orders.length && (
        <div className="text-center">
          <Link
            to="/orders"
            className="text-sm text-primary hover:underline"
          >
            View all {totalOrders} orders in Orders module →
          </Link>
        </div>
      )}
    </div>
  );
});

export default CustomerOrdersTab;
