/**
 * PickingQueueTable Component
 *
 * Table displaying orders in the picking queue (confirmed status).
 */

import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Package, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FormatAmount } from '@/components/shared/format';
import { getOrderStatusBadge, isOverdue } from '../utils';
import type { OrderStatus } from '@/lib/schemas/orders';

// ============================================================================
// TYPES
// ============================================================================

export interface PickingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onStartPicking: (orderId: string) => void;
  onCompletePicking: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PickingQueueTable({
  orders,
  isLoading,
  onStartPicking,
  onCompletePicking,
  onViewOrder,
}: PickingQueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No orders waiting to be picked</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdue(order.createdAt);
          const isPicking = order.status === 'picking';

          return (
            <TableRow key={order.id} className={cn(overdue && 'bg-orange-50')}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="font-medium hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                  {overdue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Order is overdue (3+ days)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(order.createdAt), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
              <TableCell className="text-right font-medium">
                <FormatAmount amount={order.total} cents={false} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {isPicking ? (
                    <Button size="sm" onClick={() => onCompletePicking(order.id)}>
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Done
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onStartPicking(order.id)}>
                      <Package className="mr-1 h-4 w-4" />
                      Pick
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onViewOrder?.(order.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
