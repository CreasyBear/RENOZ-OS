/**
 * PO Receiving Tab
 *
 * Displays receiving progress and item-level receiving status table.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo } from 'react';
import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { POReceivingProgress } from './po-receiving-progress';
import type { PurchaseOrderItem } from '@/lib/schemas/purchase-orders';

const RECEIVING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-secondary text-secondary-foreground' },
  partial: { label: 'Partial', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' },
  complete: { label: 'Complete', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' },
};

function getItemReceivingStatus(item: PurchaseOrderItem): string {
  if (item.quantityReceived >= item.quantity) return 'complete';
  if (item.quantityReceived > 0) return 'partial';
  return 'pending';
}

// ============================================================================
// TYPES
// ============================================================================

export interface POReceivingTabProps {
  items: PurchaseOrderItem[];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const POReceivingTab = memo(function POReceivingTab({ items }: POReceivingTabProps) {
  return (
    <div className="space-y-6 pt-6">
      <POReceivingProgress items={items} />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Ordered</TableHead>
            <TableHead className="text-center">Received</TableHead>
            <TableHead className="text-center">Pending</TableHead>
            <TableHead className="text-center">Rejected</TableHead>
            <TableHead>Expected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item) => {
            const receivingStatus = getItemReceivingStatus(item);
            const statusConfig = RECEIVING_STATUS_CONFIG[receivingStatus] || RECEIVING_STATUS_CONFIG.pending;

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.productId ? (
                    <Link
                      to="/products/$productId"
                      params={{ productId: item.productId }}
                      className="text-primary hover:underline"
                    >
                      {item.productName}
                    </Link>
                  ) : (
                    item.productName
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-[10px]', statusConfig.color)}>{statusConfig.label}</Badge>
                </TableCell>
                <TableCell className="text-center tabular-nums">{item.quantity}</TableCell>
                <TableCell className={cn('text-center tabular-nums', Number(item.quantityReceived) >= Number(item.quantity) ? 'text-green-600' : Number(item.quantityReceived) > 0 ? 'text-amber-600' : '')}>
                  {item.quantityReceived || 0}
                </TableCell>
                <TableCell className={cn('text-center tabular-nums', Number(item.quantityPending) > 0 && 'text-amber-600')}>
                  {item.quantityPending || 0}
                </TableCell>
                <TableCell className={cn('text-center tabular-nums', Number(item.quantityRejected) > 0 && 'text-destructive')}>
                  {item.quantityRejected || 0}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.expectedDeliveryDate && format(new Date(item.expectedDeliveryDate), 'PP')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});
