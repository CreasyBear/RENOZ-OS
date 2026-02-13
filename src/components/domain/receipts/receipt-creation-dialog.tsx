/**
 * Receipt Creation Dialog
 *
 * Dialog for creating a goods receipt for a purchase order.
 * Allows entering quantities received per line item.
 *
 * @see SUPP-GOODS-RECEIPT story
 */

import { useState, useCallback, useMemo } from 'react';
import { Loader2, Package, Plus, Minus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toastError, toastSuccess } from '@/hooks';
import { useReceiveGoods } from '@/hooks/suppliers';
import type {
  ReceiptCreationDialogProps,
  POItemForReceipt,
  CreateReceiptItemInput,
} from '@/lib/schemas/receipts';

// ============================================================================
// TYPES
// ============================================================================

interface ReceiptItemState {
  purchaseOrderItemId: string;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
}

// ============================================================================
// RECEIPT ITEM ROW
// ============================================================================

interface ReceiptItemRowProps {
  item: POItemForReceipt;
  state: ReceiptItemState;
  onChange: (state: ReceiptItemState) => void;
}

function ReceiptItemRow({ item, state, onChange }: ReceiptItemRowProps) {
  const handleQtyChange = (qty: number) => {
    const received = Math.max(0, Math.min(qty, item.quantityPending));
    onChange({
      ...state,
      quantityReceived: received,
      quantityAccepted: received, // Default to all accepted
      quantityRejected: 0,
    });
  };

  const increment = () => handleQtyChange(state.quantityReceived + 1);
  const decrement = () => handleQtyChange(state.quantityReceived - 1);
  const receiveAll = () => handleQtyChange(item.quantityPending);

  return (
    <div className="flex flex-col gap-2 border-b pb-3 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.productName}</p>
          {item.productSku && (
            <p className="text-muted-foreground text-sm">SKU: {item.productSku}</p>
          )}
          <p className="text-muted-foreground text-sm">
            Ordered: {item.quantityOrdered} | Received: {item.quantityAlreadyReceived} |{' '}
            <span className="text-foreground font-medium">Pending: {item.quantityPending}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={decrement}
            disabled={state.quantityReceived <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            min={0}
            max={item.quantityPending}
            value={state.quantityReceived}
            onChange={(e) => handleQtyChange(parseInt(e.target.value) || 0)}
            className="h-8 w-16 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={increment}
            disabled={state.quantityReceived >= item.quantityPending}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={receiveAll}
            disabled={state.quantityReceived === item.quantityPending}
          >
            <Check className="mr-1 h-3 w-3" />
            All
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReceiptCreationDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  poNumber,
  supplierName,
  items,
  onSuccess,
}: ReceiptCreationDialogProps) {
  const receiveGoods = useReceiveGoods();

  // State for receipt items
  const [itemStates, setItemStates] = useState<Record<string, ReceiptItemState>>(() => {
    const initial: Record<string, ReceiptItemState> = {};
    items.forEach((item) => {
      initial[item.id] = {
        purchaseOrderItemId: item.id,
        quantityReceived: 0,
        quantityAccepted: 0,
        quantityRejected: 0,
      };
    });
    return initial;
  });

  // Shipping details
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [notes, setNotes] = useState('');

  // Calculate summary
  const summary = useMemo(() => {
    let totalPending = 0;
    let totalReceiving = 0;

    items.forEach((item) => {
      totalPending += item.quantityPending;
      totalReceiving += itemStates[item.id]?.quantityReceived || 0;
    });

    return { totalPending, totalReceiving };
  }, [items, itemStates]);

  const handleItemChange = useCallback((state: ReceiptItemState) => {
    setItemStates((prev) => ({
      ...prev,
      [state.purchaseOrderItemId]: state,
    }));
  }, []);

  const handleReceiveAll = () => {
    const allReceived: Record<string, ReceiptItemState> = {};
    items.forEach((item) => {
      allReceived[item.id] = {
        purchaseOrderItemId: item.id,
        quantityReceived: item.quantityPending,
        quantityAccepted: item.quantityPending,
        quantityRejected: 0,
      };
    });
    setItemStates(allReceived);
  };

  const handleCreate = async () => {
    try {
      // Build receipt items
      const receiptItems: CreateReceiptItemInput[] = [];
      let lineNumber = 1;

      for (const item of items) {
        const state = itemStates[item.id];
        if (state && state.quantityReceived > 0) {
          receiptItems.push({
            purchaseOrderItemId: item.id,
            lineNumber: lineNumber++,
            quantityExpected: item.quantityPending,
            quantityReceived: state.quantityReceived,
            quantityAccepted: state.quantityAccepted,
            quantityRejected: state.quantityRejected,
          });
        }
      }

      if (receiptItems.length === 0) {
        toastError('Select at least one item to receive');
        return;
      }

      await receiveGoods.mutateAsync({
        purchaseOrderId,
        carrier: carrier || undefined,
        trackingNumber: trackingNumber || undefined,
        deliveryReference: deliveryReference || undefined,
        notes: notes || undefined,
        items: receiptItems.map((item) => ({
          poItemId: item.purchaseOrderItemId,
          quantityReceived: item.quantityReceived,
          quantityRejected: item.quantityRejected,
          condition: 'new',
        })),
      });

      toastSuccess('Receipt recorded successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch {
      toastError('Failed to record receipt');
    } finally {
      // Mutation handles pending state
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!receiveGoods.isPending) {
      if (!newOpen) {
        // Reset form on close
        const initial: Record<string, ReceiptItemState> = {};
        items.forEach((item) => {
          initial[item.id] = {
            purchaseOrderItemId: item.id,
            quantityReceived: 0,
            quantityAccepted: 0,
            quantityRejected: 0,
          };
        });
        setItemStates(initial);
        setCarrier('');
        setTrackingNumber('');
        setDeliveryReference('');
        setNotes('');
      }
      onOpenChange(newOpen);
    }
  };

  const canCreate = summary.totalReceiving > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Record Goods Receipt
          </DialogTitle>
          <DialogDescription>
            Record received items for {poNumber}
            {supplierName && ` from ${supplierName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shipping Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Shipping Details (Optional)</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  placeholder="e.g., DHL, FedEx"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking">Tracking Number</Label>
                <Input
                  id="tracking"
                  placeholder="Tracking #"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery-ref">Delivery Reference</Label>
                <Input
                  id="delivery-ref"
                  placeholder="Supplier DN #"
                  value={deliveryReference}
                  onChange={(e) => setDeliveryReference(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Items to Receive */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Items to Receive</h4>
              <Button type="button" variant="outline" size="sm" onClick={handleReceiveAll}>
                Receive All Pending
              </Button>
            </div>

            <Card>
              <CardContent className="space-y-3 pt-4">
                {items.length === 0 ? (
                  <p className="text-muted-foreground py-4 text-center text-sm">
                    No items pending receipt
                  </p>
                ) : (
                  items.map((item) => (
                    <ReceiptItemRow
                      key={item.id}
                      item={item}
                      state={itemStates[item.id]}
                      onChange={handleItemChange}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Total pending: {summary.totalPending} items
              </span>
              <span className="font-medium">Receiving: {summary.totalReceiving} items</span>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this receipt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={receiveGoods.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || receiveGoods.isPending}>
            {receiveGoods.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { ReceiptCreationDialogProps };
