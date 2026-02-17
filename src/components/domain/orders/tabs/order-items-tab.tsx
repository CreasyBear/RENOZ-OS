/**
 * Order Items Tab
 *
 * Displays the line items table for an order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo, useState, useMemo, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FormatAmount } from '@/components/shared/format';
import { OrderLineItemSerialsCell } from '../components/order-line-item-serials-cell';
import { getTaxTypeLabel } from '@/lib/schemas/products/products';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 25;

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
// LINE ITEM DETAIL TOOLTIP CONTENT
// ============================================================================

function LineItemDetailTooltipContent({ item }: { item: OrderWithCustomer['lineItems'][number] }) {
  const hasDiscount =
    Number(item.discountAmount) > 0 || (item.discountPercent != null && Number(item.discountPercent) > 0);
  const hasTax = Number(item.taxAmount) > 0;
  const hasNotes = !!item.notes?.trim();

  if (!hasDiscount && !hasTax && !hasNotes) return null;

  return (
    <div className="space-y-1 text-left">
      {hasDiscount && (
        <p className="text-xs">
          Discount:{' '}
          {item.discountPercent != null && Number(item.discountPercent) > 0
            ? `${item.discountPercent}%`
            : ''}{' '}
          {Number(item.discountAmount) > 0 && (
            <span className="text-destructive">
              -<FormatAmount amount={Number(item.discountAmount)} />
            </span>
          )}
        </p>
      )}
      {hasTax && (
        <p className="text-xs">
          Tax ({getTaxTypeLabel(item.taxType)}): <FormatAmount amount={Number(item.taxAmount)} />
        </p>
      )}
      {hasNotes && (
        <p className="text-xs">
          Notes: {item.notes}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// PAGINATION
// ============================================================================

function TablePagination({
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  page: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-4">
      <span className="text-sm text-muted-foreground">
        Page {page + 1} of {pageCount}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onPrev}
          disabled={page <= 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onNext}
          disabled={page >= pageCount - 1}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderItemsTab = memo(function OrderItemsTab({
  lineItems,
}: OrderItemsTabProps) {
  const [page, setPage] = useState(0);

  const paginatedItems = useMemo(() => {
    if (lineItems.length <= PAGE_SIZE) return lineItems;
    const start = page * PAGE_SIZE;
    return lineItems.slice(start, start + PAGE_SIZE);
  }, [lineItems, page]);

  const pageCount = Math.max(1, Math.ceil(lineItems.length / PAGE_SIZE));
  const showPagination = lineItems.length > PAGE_SIZE;

  // Clamp page when pageCount changes (e.g. switched to order with fewer items)
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  if (!lineItems?.length) {
    return (
      <div className="pt-6">
        <EmptyState />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="pt-6 space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Serials</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.map((item) => {
            const hasDetailTooltip =
              Number(item.discountAmount) > 0 ||
              (item.discountPercent != null && Number(item.discountPercent) > 0) ||
              Number(item.taxAmount) > 0 ||
              !!item.notes?.trim();

            const totalCellContent = (
              <span className="tabular-nums font-medium">
                <FormatAmount amount={Number(item.lineTotal)} />
              </span>
            );

            return (
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
                  {item.product?.isSerialized && (
                    <Badge variant="outline" className="text-[10px] ml-1 mt-0.5">
                      Serial
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <FormatAmount amount={Number(item.unitPrice)} />
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {hasDetailTooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          {totalCellContent}
                          <Info className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <LineItemDetailTooltipContent item={item} />
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    totalCellContent
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <OrderLineItemSerialsCell allocatedSerialNumbers={item.allocatedSerialNumbers} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {showPagination && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        />
      )}
    </div>
    </TooltipProvider>
  );
});

export default OrderItemsTab;
