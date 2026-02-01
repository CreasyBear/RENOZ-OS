/**
 * ShippingQueueTable Component
 *
 * Table displaying orders ready to ship (picked status).
 */

import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Truck, AlertTriangle, Eye } from 'lucide-react';
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

export interface ShippingQueueTableProps {
  orders: Array<{
    id: string;
    orderNumber: string;
    customerId: string;
    total: number;
    createdAt: Date;
    status: OrderStatus;
  }>;
  isLoading: boolean;
  onShipOrder?: (orderId: string) => void;
  onViewOrder?: (orderId: string) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ShippingQueueTable({
  orders,
  isLoading,
  onShipOrder,
  onViewOrder,
}: ShippingQueueTableProps) {
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
        <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No orders ready to ship</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order #</TableHead>
          <TableHead>Picked Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="w-[180px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const overdue = isOverdue(order.createdAt);

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
                <FormatAmount amount={order.total} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => onShipOrder?.(order.id)}>
                    <Truck className="mr-1 h-4 w-4" />
                    Ship
                  </Button>
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
