/**
 * PO Items Tab
 *
 * Displays the line items table for a purchase order.
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
import type { PurchaseOrderItem } from '@/lib/schemas/purchase-orders';

// ============================================================================
// TYPES
// ============================================================================

export interface POItemsTabProps {
  items: PurchaseOrderItem[];
  currency?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POItemsTab = memo(function POItemsTab({ items, currency }: POItemsTabProps) {
  return (
    <div className="pt-6">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Discount</TableHead>
            <TableHead className="text-right">Tax Rate</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{item.lineNumber}</TableCell>
              <TableCell>
                {item.productId ? (
                  <Link
                    to="/products/$productId"
                    params={{ productId: item.productId }}
                    className="font-medium text-primary hover:underline"
                  >
                    {item.productName}
                  </Link>
                ) : (
                  <div className="font-medium">{item.productName}</div>
                )}
                {item.productSku && <div className="text-xs text-muted-foreground">SKU: {item.productSku}</div>}
                {item.description && <div className="text-xs text-muted-foreground mt-1">{item.description}</div>}
                {item.notes && <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity} {item.unitOfMeasure}</TableCell>
              <TableCell className="text-right tabular-nums"><FormatAmount amount={Number(item.unitPrice)} currency={currency} /></TableCell>
              <TableCell className="text-right tabular-nums">
                {Number(item.discountPercent) > 0 ? `${item.discountPercent}%` : '---'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.taxRate}%</TableCell>
              <TableCell className="text-right font-medium tabular-nums"><FormatAmount amount={Number(item.lineTotal)} currency={currency} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
});
