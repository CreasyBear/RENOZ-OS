/**
 * PO Receipts Tab
 *
 * Displays receipt history for a purchase order as a timeline
 * with expandable receipt details.
 *
 * @see docs/design-system/WORKFLOW-CONTINUITY-STANDARDS.md - P3 Cross-Entity Navigation
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { Package, ChevronDown, ChevronUp, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePurchaseOrderReceipts } from '@/hooks/suppliers';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface POReceiptsTabProps {
  poId: string;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  refurbished: 'Refurbished',
  used: 'Used',
  damaged: 'Damaged',
};

const REJECTION_LABELS: Record<string, string> = {
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  quality_issue: 'Quality Issue',
  short_shipment: 'Short Shipment',
  other: 'Other',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function POReceiptsTab({ poId }: POReceiptsTabProps) {
  const { data, isLoading } = usePurchaseOrderReceipts(poId);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  const receipts = data?.receipts ?? [];

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No receipts recorded yet</p>
        <p className="text-xs mt-1">Receipts will appear here when goods are received against this PO</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} recorded
      </div>

      {/* Receipt Timeline */}
      <div className="space-y-3">
        {receipts.map((receipt) => {
          const isExpanded = expandedReceipt === receipt.id;
          const receivedAt = receipt.receivedAt
            ? format(new Date(receipt.receivedAt), 'PPp')
            : 'Unknown';

          return (
            <div key={receipt.id} className="border rounded-lg overflow-hidden">
              {/* Receipt Header */}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left cursor-pointer"
                onClick={() => setExpandedReceipt(isExpanded ? null : receipt.id)}
                aria-expanded={isExpanded}
                aria-controls={`receipt-details-${receipt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {receipt.receiptNumber ?? 'Receipt'}
                    </div>
                    <div className="text-xs text-muted-foreground">{receivedAt}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm tabular-nums">
                      {receipt.totalItemsReceived ?? 0} received
                    </div>
                    {(receipt.totalItemsRejected ?? 0) > 0 && (
                      <div className="text-xs text-destructive tabular-nums">
                        {receipt.totalItemsRejected} rejected
                      </div>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Receipt Details (Expanded) */}
              {isExpanded && (
                <div id={`receipt-details-${receipt.id}`} className="border-t p-4 space-y-4">
                  {/* Receipt metadata */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {receipt.carrier && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Carrier: {receipt.carrier}
                      </div>
                    )}
                    {receipt.trackingNumber && (
                      <div>Tracking: {receipt.trackingNumber}</div>
                    )}
                    {receipt.deliveryReference && (
                      <div>Delivery Ref: {receipt.deliveryReference}</div>
                    )}
                  </div>

                  {receipt.notes && (
                    <div className="text-sm bg-muted/50 p-3 rounded-md">{receipt.notes}</div>
                  )}

                  {/* Receipt Line Items */}
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Received</TableHead>
                        <TableHead className="text-center">Accepted</TableHead>
                        <TableHead className="text-center">Rejected</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Lot #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipt.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.productId ? (
                              <Link
                                to="/products/$productId"
                                params={{ productId: item.productId }}
                                className="text-sm font-medium hover:underline text-foreground"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <div className="text-sm font-medium">{item.productName}</div>
                            )}
                            {item.productSku && (
                              <div className="text-xs text-muted-foreground">
                                SKU: {item.productSku}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">
                            {item.quantityReceived}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-green-600">
                            {item.quantityAccepted}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-center tabular-nums',
                              (item.quantityRejected ?? 0) > 0 && 'text-destructive'
                            )}
                          >
                            {item.quantityRejected || 0}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {CONDITION_LABELS[item.condition ?? 'new'] ?? 'New'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.lotNumber || '---'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Rejection details */}
                  {receipt.items.some((item) => (item.quantityRejected ?? 0) > 0) && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Rejection reasons: </span>
                      {receipt.items
                        .filter((item) => (item.quantityRejected ?? 0) > 0)
                        .map(
                          (item) =>
                            `${item.productName}: ${REJECTION_LABELS[item.rejectionReason ?? ''] ?? item.rejectionReason ?? 'Unknown'}`
                        )
                        .join('; ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
