/**
 * Order Items Tab
 *
 * Displays the line items table for an order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FormatAmount } from '@/components/shared/format';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';

// ============================================================================
// TYPES
// ============================================================================

export interface OrderItemsTabProps {
  lineItems: OrderWithCustomer['lineItems'];
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">No line items in this order.</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderItemsTab = memo(function OrderItemsTab({
  lineItems,
}: OrderItemsTabProps) {
  if (!lineItems?.length) {
    return (
      <div className="pt-6">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="pt-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{item.lineNumber}</TableCell>
              <TableCell>
                {item.product?.id && item.product?.name ? (
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.product.id }}
                    className="font-medium hover:underline"
                  >
                    {item.product.name}
                  </Link>
                ) : (
                  <div className="font-medium">{item.description}</div>
                )}
                {item.sku && (
                  <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                <FormatAmount amount={Number(item.unitPrice)} />
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                <FormatAmount amount={Number(item.lineTotal)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

export default OrderItemsTab;
