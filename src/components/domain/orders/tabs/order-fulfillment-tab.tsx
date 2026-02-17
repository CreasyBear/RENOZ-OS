/**
 * Order Fulfillment Tab
 *
 * Displays fulfillment status per line item with action buttons.
 * Shows picking, shipping, and delivery quantities plus serial numbers.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { PackageCheck, Truck, Info } from 'lucide-react';
import { ShipmentList } from '../fulfillment/shipment-list';
import { OrderLineItemSerialsCell } from '../components/order-line-item-serials-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useUserLookup } from '@/hooks/users';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';

// ============================================================================
// TYPES
// ============================================================================

export interface FulfillmentActions {
  onPickItems?: () => void;
  onShipOrder?: () => void;
  /** Opens confirm delivery dialog for the given shipment */
  onConfirmDelivery?: (shipmentId: string) => void;
}

export interface OrderFulfillmentTabProps {
  lineItems: OrderWithCustomer['lineItems'];
  orderId?: string;
  orderStatus?: string;
  fulfillmentActions?: FulfillmentActions;
}

function computeFulfillmentProgress(lineItems: OrderWithCustomer['lineItems'] | undefined) {
  if (!lineItems?.length) return { totalOrdered: 0, totalShipped: 0, totalDelivered: 0 };
  return lineItems.reduce(
    (acc, item) => ({
      totalOrdered: acc.totalOrdered + item.quantity,
      totalShipped: acc.totalShipped + (item.qtyShipped ?? 0),
      totalDelivered: acc.totalDelivered + (item.qtyDelivered ?? 0),
    }),
    { totalOrdered: 0, totalShipped: 0, totalDelivered: 0 }
  );
}

// ============================================================================
// CONFIGURATIONS
// ============================================================================

const PICK_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_picked: { label: 'Not Picked', color: 'bg-secondary text-muted-foreground' },
  picking: { label: 'Picking', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  picked: { label: 'Picked', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
};

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">No line items to track.</p>
    </div>
  );
}

// ============================================================================
// ACTION BAR
// ============================================================================

function FulfillmentActionBar({
  orderStatus,
  fulfillmentActions,
  lineItems,
  orderId,
}: {
  orderStatus?: string;
  fulfillmentActions?: FulfillmentActions;
  lineItems?: OrderWithCustomer['lineItems'];
  orderId?: string;
}) {
  if (!fulfillmentActions || !orderStatus) return null;

  const { onPickItems, onShipOrder, onConfirmDelivery } = fulfillmentActions;
  const progress = computeFulfillmentProgress(lineItems);

  if ((orderStatus === 'confirmed' || orderStatus === 'picking') && onPickItems) {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <PackageCheck className="h-4 w-4" />
          <span>
            {orderStatus === 'confirmed'
              ? 'Order confirmed. Ready to start picking.'
              : 'Picking in progress. Continue picking remaining items.'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {orderId && (
            <Link
              to="/mobile/picking/$orderId"
              params={{ orderId }}
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium',
                'h-9 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              )}
            >
              Pick on device
            </Link>
          )}
          <Button size="sm" onClick={onPickItems}>
            <PackageCheck className="h-4 w-4 mr-2" />
            Pick Items
          </Button>
        </div>
      </div>
    );
  }

  if (orderStatus === 'picked' && onShipOrder) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
          <Truck className="h-4 w-4" />
          <span>All items picked. Ready to create a shipment.</span>
        </div>
        <Button size="sm" onClick={onShipOrder}>
          <Truck className="h-4 w-4 mr-2" />
          Ship Order
        </Button>
      </div>
    );
  }

  if (orderStatus === 'partially_shipped' && onShipOrder) {
    const remaining = progress.totalOrdered - progress.totalShipped;
    return (
      <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Truck className="h-4 w-4" />
          <span>
            {progress.totalShipped}/{progress.totalOrdered} units shipped.{' '}
            {remaining} remaining.
          </span>
        </div>
        <Button size="sm" onClick={onShipOrder}>
          <Truck className="h-4 w-4 mr-2" />
          Ship Remaining
        </Button>
      </div>
    );
  }

  if ((orderStatus === 'shipped' || orderStatus === 'partially_shipped') && onConfirmDelivery && orderId) {
    return (
      <div className="mb-4">
        <ShipmentList orderId={orderId} onConfirmDelivery={onConfirmDelivery} />
      </div>
    );
  }

  if (orderStatus === 'shipped') {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg mb-4 text-sm text-muted-foreground">
        <Info className="h-4 w-4" />
        <span>
          All {progress.totalOrdered} units shipped. Awaiting delivery confirmation.
        </span>
      </div>
    );
  }

  return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderFulfillmentTab = memo(function OrderFulfillmentTab({
  lineItems,
  orderId,
  orderStatus,
  fulfillmentActions,
}: OrderFulfillmentTabProps) {
  const { getUser } = useUserLookup({
    enabled: lineItems.some((i) => i.pickedBy),
  });

  if (!lineItems?.length) {
    return (
      <div className="pt-6">
        <EmptyState />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="pt-6">
      <FulfillmentActionBar
        orderStatus={orderStatus}
        fulfillmentActions={fulfillmentActions}
        lineItems={lineItems}
        orderId={orderId}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Ordered</TableHead>
            <TableHead className="text-center">Picked</TableHead>
            <TableHead className="text-center">Shipped</TableHead>
            <TableHead className="text-center">Delivered</TableHead>
            <TableHead className="text-center">Serials</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => {
            const pickStatus = item.pickStatus || 'not_picked';
            const pickConfig = PICK_STATUS_CONFIG[pickStatus] || PICK_STATUS_CONFIG.not_picked;
            const hasPickedInfo = item.pickedAt || item.pickedBy;
            const pickedTooltipContent = hasPickedInfo
              ? [
                  item.pickedAt && `Picked on ${format(new Date(item.pickedAt), 'PPp')}`,
                  item.pickedBy && `by ${getUser(item.pickedBy)?.name ?? 'Unknown'}`,
                ]
                  .filter(Boolean)
                  .join(' ')
              : null;

            const statusBadge = (
              <Badge className={cn('text-[10px]', pickConfig.color)}>
                {pickConfig.label}
              </Badge>
            );

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.product && item.productId ? (
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="hover:underline"
                    >
                      {item.product.name}
                    </Link>
                  ) : (
                    <span>{item.description}</span>
                  )}
                </TableCell>
                <TableCell>
                  {pickedTooltipContent ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help inline-block">{statusBadge}</span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs">{pickedTooltipContent}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    statusBadge
                  )}
                </TableCell>
                <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                <TableCell
                  className={cn(
                    'text-center tabular-nums',
                    Number(item.qtyPicked) >= Number(item.quantity)
                      ? 'text-green-600'
                      : Number(item.qtyPicked) > 0
                        ? 'text-amber-600'
                        : ''
                  )}
                >
                  {item.qtyPicked || 0}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center tabular-nums',
                    Number(item.qtyShipped) >= Number(item.quantity)
                      ? 'text-green-600'
                      : Number(item.qtyShipped) > 0
                        ? 'text-amber-600'
                        : ''
                  )}
                >
                  {item.qtyShipped || 0}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center tabular-nums',
                    Number(item.qtyDelivered) >= Number(item.quantity)
                      ? 'text-green-600'
                      : Number(item.qtyDelivered) > 0
                        ? 'text-amber-600'
                        : ''
                  )}
                >
                  {item.qtyDelivered || 0}
                </TableCell>
                <TableCell className="text-center">
                  <OrderLineItemSerialsCell allocatedSerialNumbers={item.allocatedSerialNumbers} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
});

export default OrderFulfillmentTab;
