/**
 * Orders Table (Dashboard Overview)
 *
 * Compact table showing recent orders for dashboard overview.
 * Links to full order detail view.
 *
 * Uses shared StatusCell with ORDER_STATUS_CONFIG per BADGE-STATUS-STANDARDS.md
 */

import { Link } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusCell } from '@/components/shared/data-table/cells/status-cell';
import { ORDER_STATUS_CONFIG } from '@/components/domain/orders/order-status-config';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { format } from 'date-fns';
import type { OrderStatus } from '@/lib/schemas/orders';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string | Date;
}

export interface OrdersTableProps {
  orders?: OrderSummary[] | null;
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function OrdersTableSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function OrdersTableEmpty({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <ShoppingCart className="size-5 text-muted-foreground" />
          Recent Orders
        </CardTitle>
        <Link
          to="/orders"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
        No recent orders
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OrdersTable({ orders, isLoading, maxItems = 5, className }: OrdersTableProps) {
  if (isLoading) {
    return <OrdersTableSkeleton className={className} />;
  }

  if (!orders || orders.length === 0) {
    return <OrdersTableEmpty className={className} />;
  }

  const displayOrders = orders.slice(0, maxItems);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <ShoppingCart className="size-5 text-muted-foreground" />
          <span className="text-muted-foreground">Recent Orders</span>
        </CardTitle>
        <Link
          to="/orders"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-medium">Order</TableHead>
              <TableHead className="font-medium hidden sm:table-cell">Date</TableHead>
              <TableHead className="font-medium text-right">Amount</TableHead>
              <TableHead className="font-medium">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayOrders.map((order) => (
              <TableRow key={order.id} className="group">
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium font-mono text-sm">{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {order.customerName}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {format(new Date(order.createdAt), 'MMM d')}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <FormatAmount amount={order.total} currency="AUD" />
                </TableCell>
                <TableCell>
                  <StatusCell
                    status={order.status}
                    statusConfig={ORDER_STATUS_CONFIG}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ExternalLink className="size-4 text-muted-foreground hover:text-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {orders.length > maxItems && (
          <div className="border-t p-2 text-center">
            <Link
              to="/orders"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              +{orders.length - maxItems} more orders
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
