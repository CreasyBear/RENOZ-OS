/**
 * Order Items Tab
 *
 * Displays the line items table for an order.
 * Extracted for lazy loading per DETAIL-VIEW-STANDARDS.md.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md
 */

import { memo, useState, useMemo, useCallback, Fragment, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Info, RefreshCw, Save, Trash2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FormatAmount } from '@/components/shared/format';
import { OrderLineItemSerialsCell, SerialNumbersList } from '../components';
import { getTaxTypeLabel } from '@/lib/schemas/products/products';
import type { OrderWithCustomer } from '@/hooks/orders/use-order-detail';
import { ProductSelector, type OrderLineItemDraft } from '../creation/product-selector';
import {
  useAddOrderLineItem,
  useDeleteOrderLineItem,
  useUpdateOrderLineItem,
} from '@/hooks/orders/use-orders';
import { toastSuccess, toastError } from '@/hooks';

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 25;

// ============================================================================
// TYPES
// ============================================================================

export interface OrderItemsTabProps {
  lineItems: OrderWithCustomer['lineItems'];
  orderId?: string;
  orderStatus?: string;
  orderVersion?: number;
  onOrderUpdated?: () => void;
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

interface DraftLineItemFormState {
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  discountAmount: string;
  notes: string;
}

function getDraftLineItemFormState(item: OrderWithCustomer['lineItems'][number]): DraftLineItemFormState {
  return {
    quantity: String(item.quantity ?? 0),
    unitPrice: String(item.unitPrice ?? 0),
    discountPercent:
      item.discountPercent != null ? String(item.discountPercent) : '',
    discountAmount:
      item.discountAmount != null ? String(item.discountAmount) : '',
    notes: item.notes ?? '',
  };
}

function parseCurrencyInput(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateDraftLineItem(values: DraftLineItemFormState, label: string) {
  const quantity = Number(values.quantity);
  const unitPrice = Number(values.unitPrice);
  const discountPercent = parseCurrencyInput(values.discountPercent) ?? 0;
  const discountAmount = parseCurrencyInput(values.discountAmount) ?? 0;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error(`"${label}" must have a quantity greater than 0.`);
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error(`"${label}" must have a valid unit price.`);
  }

  if (discountPercent > 0 && discountAmount > 0) {
    throw new Error(`"${label}" cannot use both discount percent and discount amount.`);
  }

  const lineTotal = quantity * unitPrice;
  const computedDiscount = discountAmount + (lineTotal * discountPercent) / 100;
  if (computedDiscount > lineTotal) {
    throw new Error(`"${label}" discount cannot exceed the line total.`);
  }
}

function DraftEditConflictAlert({
  message,
  onRefresh,
}: {
  message: string | null;
  onRefresh?: () => void;
}) {
  if (!message) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {onRefresh ? (
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Order
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function DraftOrderAddItemsCard({
  orderId,
  orderVersion,
  lineItems,
  onOrderUpdated,
  onConflict,
}: {
  orderId: string;
  orderVersion?: number;
  lineItems: NonNullable<OrderItemsTabProps['lineItems']>;
  onOrderUpdated?: () => void;
  onConflict: (message: string | null) => void;
}) {
  const addLineItemMutation = useAddOrderLineItem();
  const updateLineItemMutation = useUpdateOrderLineItem();
  const [selectedProducts, setSelectedProducts] = useState<OrderLineItemDraft[]>([]);

  const handleApplySelectedProducts = useCallback(async () => {
    if (selectedProducts.length === 0) return;
    if (!orderVersion) {
      toastError('Order version is unavailable. Refresh and try again.');
      return;
    }

    let expectedVersion = orderVersion;
    let appliedCount = 0;
    let remainingProducts = [...selectedProducts];
    try {
      onConflict(null);
      for (const item of selectedProducts) {
        const existingLine = lineItems.find(
          (lineItem) => lineItem.productId === item.productId
        );

        if (existingLine) {
          await updateLineItemMutation.mutateAsync({
            orderId,
            itemId: existingLine.id,
            expectedOrderVersion: expectedVersion,
            data: {
              quantity: Number(existingLine.quantity) + Number(item.quantity),
            },
          });
        } else {
          await addLineItemMutation.mutateAsync({
            orderId,
            expectedOrderVersion: expectedVersion,
            item,
          });
        }

        appliedCount += 1;
        remainingProducts = remainingProducts.filter(
          (product) => product.productId !== item.productId
        );
        expectedVersion += 1;
      }

      setSelectedProducts([]);
      toastSuccess(
        selectedProducts.length === 1
          ? 'Item added to draft order'
          : 'Items added to draft order'
      );
      onOrderUpdated?.();
    } catch (error) {
      setSelectedProducts(remainingProducts);
      const message = error instanceof Error ? error.message : 'Unable to add items to draft order.';
      if (message.toLowerCase().includes('modified by another user')) {
        onConflict(message);
      }
      if (appliedCount > 0) {
        onOrderUpdated?.();
      }
      toastError(message);
    }
  }, [
    addLineItemMutation,
    lineItems,
    onConflict,
    onOrderUpdated,
    orderId,
    orderVersion,
    selectedProducts,
    updateLineItemMutation,
  ]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Add Products</CardTitle>
        <CardDescription>
          Reuse the same product selection flow as order creation, then apply the selected items to this draft.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProductSelector
          selectedProducts={selectedProducts}
          onProductsChange={setSelectedProducts}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleApplySelectedProducts()}
            disabled={
              selectedProducts.length === 0 ||
              addLineItemMutation.isPending ||
              updateLineItemMutation.isPending
            }
          >
            {addLineItemMutation.isPending || updateLineItemMutation.isPending
              ? 'Applying…'
              : 'Apply Selected Products'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableDraftLineItemRow({
  item,
  orderId,
  orderVersion,
  onOrderUpdated,
  onConflict,
}: {
  item: NonNullable<OrderItemsTabProps['lineItems']>[number];
  orderId: string;
  orderVersion?: number;
  onOrderUpdated?: () => void;
  onConflict: (message: string | null) => void;
}) {
  const updateLineItemMutation = useUpdateOrderLineItem();
  const deleteLineItemMutation = useDeleteOrderLineItem();
  const [formState, setFormState] = useState<DraftLineItemFormState>(() => getDraftLineItemFormState(item));

  useEffect(() => {
    setFormState(getDraftLineItemFormState(item));
  }, [item]);

  const hasChanges =
    formState.quantity !== String(item.quantity ?? 0) ||
    formState.unitPrice !== String(item.unitPrice ?? 0) ||
    formState.discountPercent !== (item.discountPercent != null ? String(item.discountPercent) : '') ||
    formState.discountAmount !== (item.discountAmount != null ? String(item.discountAmount) : '') ||
    formState.notes !== (item.notes ?? '');

  const handleSave = useCallback(async () => {
    if (!orderVersion) {
      toastError('Order version is unavailable. Refresh and try again.');
      return;
    }

    try {
      onConflict(null);
      validateDraftLineItem(formState, item.description);
      await updateLineItemMutation.mutateAsync({
        orderId,
        itemId: item.id,
        expectedOrderVersion: orderVersion,
        data: {
          quantity: Number(formState.quantity),
          unitPrice: Number(formState.unitPrice),
          discountPercent: parseCurrencyInput(formState.discountPercent),
          discountAmount: parseCurrencyInput(formState.discountAmount),
          notes: formState.notes.trim() || undefined,
        },
      });
      toastSuccess(`Updated "${item.description}"`);
      onOrderUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update draft line item.';
      if (message.toLowerCase().includes('modified by another user')) {
        onConflict(message);
      }
      toastError(message);
    }
  }, [formState, item.description, item.id, onConflict, onOrderUpdated, orderId, orderVersion, updateLineItemMutation]);

  const handleDelete = useCallback(async () => {
    if (!orderVersion) {
      toastError('Order version is unavailable. Refresh and try again.');
      return;
    }

    try {
      onConflict(null);
      await deleteLineItemMutation.mutateAsync({
        orderId,
        itemId: item.id,
        expectedOrderVersion: orderVersion,
      });
      toastSuccess(`Removed "${item.description}"`);
      onOrderUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove draft line item.';
      if (message.toLowerCase().includes('modified by another user')) {
        onConflict(message);
      }
      toastError(message);
    }
  }, [deleteLineItemMutation, item.description, item.id, onConflict, onOrderUpdated, orderId, orderVersion]);

  return (
    <TableRow className="align-top">
      <TableCell className="text-muted-foreground">{item.lineNumber}</TableCell>
      <TableCell>
        <div className="space-y-1">
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
          {item.sku ? (
            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
          ) : null}
          <Input
            value={formState.notes}
            onChange={(event) =>
              setFormState((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="Internal line item notes"
            className="mt-2"
          />
        </div>
      </TableCell>
      <TableCell className="w-24">
        <Input
          type="number"
          min={0.01}
          step={0.01}
          value={formState.quantity}
          onChange={(event) =>
            setFormState((current) => ({ ...current, quantity: event.target.value }))
          }
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={formState.unitPrice}
          onChange={(event) =>
            setFormState((current) => ({ ...current, unitPrice: event.target.value }))
          }
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={formState.discountPercent}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              discountPercent: event.target.value,
            }))
          }
          placeholder="%"
        />
      </TableCell>
      <TableCell className="w-28">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={formState.discountAmount}
          onChange={(event) =>
            setFormState((current) => ({
              ...current,
              discountAmount: event.target.value,
            }))
          }
          placeholder="$"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormState(getDraftLineItemFormState(item))}
            disabled={!hasChanges}
          >
            Reset
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={!hasChanges || updateLineItemMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleteLineItemMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OrderItemsTab = memo(function OrderItemsTab({
  lineItems,
  orderId,
  orderStatus,
  orderVersion,
  onOrderUpdated,
}: OrderItemsTabProps) {
  const pageCount = Math.max(1, Math.ceil((lineItems?.length ?? 0) / PAGE_SIZE));
  const showPagination = (lineItems?.length ?? 0) > PAGE_SIZE;
  const [draftConflictMessage, setDraftConflictMessage] = useState<string | null>(null);
  const isDraft = orderStatus === 'draft' && !!orderId;

  if (!lineItems?.length) {
    return (
      <div className="pt-6 space-y-4">
        {isDraft && orderId ? (
          <>
            <DraftEditConflictAlert
              message={draftConflictMessage}
              onRefresh={onOrderUpdated}
            />
            <DraftOrderAddItemsCard
              orderId={orderId}
              orderVersion={orderVersion}
              lineItems={lineItems}
              onOrderUpdated={onOrderUpdated}
              onConflict={setDraftConflictMessage}
            />
          </>
        ) : null}
        <EmptyState />
      </div>
    );
  }

  return (
    <OrderItemsTableContent
      key={pageCount}
      lineItems={lineItems}
      pageCount={pageCount}
      showPagination={showPagination}
      orderId={orderId}
      orderStatus={orderStatus}
      orderVersion={orderVersion}
      onOrderUpdated={onOrderUpdated}
      draftConflictMessage={draftConflictMessage}
      onConflict={setDraftConflictMessage}
    />
  );
});

function OrderItemsTableContent({
  lineItems,
  pageCount,
  showPagination,
  orderId,
  orderStatus,
  orderVersion,
  onOrderUpdated,
  draftConflictMessage,
  onConflict,
}: {
  lineItems: NonNullable<OrderItemsTabProps['lineItems']>;
  pageCount: number;
  showPagination: boolean;
  orderId?: string;
  orderStatus?: string;
  orderVersion?: number;
  onOrderUpdated?: () => void;
  draftConflictMessage: string | null;
  onConflict: (message: string | null) => void;
}) {
  const [page, setPage] = useState(0);
  const [expandedSerialsRowId, setExpandedSerialsRowId] = useState<string | null>(null);
  const isDraft = orderStatus === 'draft' && !!orderId;
  const handleToggleSerials = useCallback((lineItemId: string) => {
    setExpandedSerialsRowId((prev) => (prev === lineItemId ? null : lineItemId));
  }, []);

  const paginatedItems = useMemo(() => {
    if (lineItems.length <= PAGE_SIZE) return lineItems;
    const start = page * PAGE_SIZE;
    return lineItems.slice(start, start + PAGE_SIZE);
  }, [lineItems, page]);

  return (
    <TooltipProvider>
    <div className="pt-6 space-y-4">
      {isDraft && orderId ? (
        <>
          <DraftEditConflictAlert
            message={draftConflictMessage}
            onRefresh={onOrderUpdated}
          />
          <DraftOrderAddItemsCard
            orderId={orderId}
            orderVersion={orderVersion}
            lineItems={lineItems}
            onOrderUpdated={onOrderUpdated}
            onConflict={onConflict}
          />
        </>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            {isDraft ? (
              <>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Discount %</TableHead>
                <TableHead className="text-right">Discount $</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </>
            ) : (
              <>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Serials</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedItems.map((item) => {
            if (isDraft && orderId) {
              return (
                <EditableDraftLineItemRow
                  key={item.id}
                  item={item}
                  orderId={orderId}
                  orderVersion={orderVersion}
                  onOrderUpdated={onOrderUpdated}
                  onConflict={onConflict}
                />
              );
            }

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

            const serials = (item.allocatedSerialNumbers as string[] | null) ?? [];
            const hasExpandableSerials = serials.length > 2;
            const isExpanded = expandedSerialsRowId === item.id;

            return (
              <Fragment key={item.id}>
                <TableRow>
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
                    <OrderLineItemSerialsCell
                      allocatedSerialNumbers={item.allocatedSerialNumbers}
                      lineItemId={hasExpandableSerials ? item.id : undefined}
                      isExpanded={hasExpandableSerials ? isExpanded : undefined}
                      onToggle={hasExpandableSerials ? handleToggleSerials : undefined}
                    />
                  </TableCell>
                </TableRow>
                {hasExpandableSerials && isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 py-2 pl-8">
                      <SerialNumbersList serials={serials} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
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
}

export default OrderItemsTab;
