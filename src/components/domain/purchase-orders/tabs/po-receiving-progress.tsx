/**
 * PO Receiving Progress
 *
 * Shared component for overview and receiving tabs.
 * Displays receiving percentage and ordered/received/pending/rejected counts.
 */

import { Progress } from '@/components/ui/progress';
import { DetailSection } from '@/components/shared';
import type { PurchaseOrderItem } from '@/lib/schemas/purchase-orders';

function calculateReceivingPercent(items: PurchaseOrderItem[]): number {
  if (!items?.length) return 0;
  const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const receivedQty = items.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0);
  return totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
}

export interface POReceivingProgressProps {
  items: PurchaseOrderItem[];
}

export function POReceivingProgress({ items }: POReceivingProgressProps) {
  const receivingPercent = calculateReceivingPercent(items);

  const totalOrdered = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalReceived = items.reduce((sum, item) => sum + Number(item.quantityReceived || 0), 0);
  const totalPending = items.reduce((sum, item) => sum + Number(item.quantityPending || 0), 0);
  const totalRejected = items.reduce((sum, item) => sum + Number(item.quantityRejected || 0), 0);

  return (
    <DetailSection id="receiving" title={`Receiving Progress (${receivingPercent}% Received)`} defaultOpen>
      <div className="space-y-4">
        <Progress value={receivingPercent} className="h-2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-md">
            <div className="text-2xl font-semibold tabular-nums">{totalOrdered}</div>
            <div className="text-xs text-muted-foreground">Ordered</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">{totalReceived}</div>
            <div className="text-xs text-muted-foreground">Received</div>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
            <div className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">{totalPending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          {totalRejected > 0 && (
            <div className="text-center p-3 bg-destructive/10 rounded-md">
              <div className="text-2xl font-semibold tabular-nums text-destructive">{totalRejected}</div>
              <div className="text-xs text-muted-foreground">Rejected</div>
            </div>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
