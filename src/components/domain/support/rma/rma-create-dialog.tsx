/**
 * RMA Create Dialog Component
 *
 * Dialog for creating a new RMA with order line item selection.
 *
 * @see src/hooks/use-rma.ts for mutations
 * @see src/lib/schemas/support/rma.ts for validation
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 */

'use client';

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toastError } from '@/hooks';
import type { RmaReason, CreateRmaLineItemInput } from '@/lib/schemas/support/rma';
import { Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/pricing-utils';
import { RMA_REASON_OPTIONS_WITH_DESCRIPTION } from './rma-options';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';

// Order line item type (simplified for selection)
interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  serialNumber?: string | null;
  isSerialized?: boolean;
}

interface RmaCreateDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Pre-selected order ID */
  orderId: string;
  /** Available order line items */
  orderLineItems: OrderLineItem[];
  /** Optional issue ID to link */
  issueId?: string;
  /** Optional customer ID */
  customerId?: string;
  /** Callback when RMA is created successfully */
  onSuccess?: (rmaId: string) => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    orderId: string;
    reason: RmaReason;
    lineItems: CreateRmaLineItemInput[];
    issueId: string | null;
    customerId: string | null;
    reasonDetails: string | null;
    customerNotes: string | null;
  }) => Promise<{ id: string }>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

interface SelectedItem {
  orderLineItemId: string;
  quantityReturned: number;
  itemReason: string;
  /** For serialized qty=1 */
  serialNumber: string;
  /** For serialized qty>1 — one serial per unit returned */
  serialNumbers?: string[];
  isSerialized?: boolean;
}

export function RmaCreateDialog({
  open,
  onOpenChange,
  orderId,
  orderLineItems,
  issueId,
  customerId,
  onSuccess,
  onSubmit,
  isSubmitting,
}: RmaCreateDialogProps) {
  const { formatPrice } = useCurrency();
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);

  // Form state
  const [reason, setReason] = useState<RmaReason>('defective');
  const [reasonDetails, setReasonDetails] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());

  // Reset form when dialog opens (event handler pattern - no useEffect)
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form state when opening
      setReason('defective');
      setReasonDetails('');
      setCustomerNotes('');
      setSelectedItems(new Map());
    }
    onOpenChange(newOpen);
  };
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, handleOpenChange);

  // Select all items
  const handleSelectAll = () => {
    const next = new Map<string, SelectedItem>();
    for (const item of orderLineItems) {
      const isSerialized = item.isSerialized ?? false;
      next.set(item.id, {
        orderLineItemId: item.id,
        quantityReturned: 1,
        itemReason: '',
        serialNumber: item.serialNumber ?? '',
        serialNumbers: undefined,
        isSerialized,
      });
    }
    setSelectedItems(next);
  };

  // Deselect all items
  const handleDeselectAll = () => {
    setSelectedItems(new Map());
  };

  // Toggle item selection
  const toggleItem = (item: OrderLineItem, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (checked) {
        const isSerialized = item.isSerialized ?? false;
        next.set(item.id, {
          orderLineItemId: item.id,
          quantityReturned: 1,
          itemReason: '',
          serialNumber: item.serialNumber ?? '',
          serialNumbers: undefined,
          isSerialized,
        });
      } else {
        next.delete(item.id);
      }
      return next;
    });
  };

  // Update item quantity (for serialized qty>1, resize serialNumbers array)
  const updateItemQuantity = (itemId: string, quantity: number, maxQty: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (!item) return next;
      const qty = Math.max(1, Math.min(quantity, maxQty));
      const isSerialized = item.isSerialized ?? false;
      let serialNumbers = item.serialNumbers;
      if (isSerialized && qty > 1) {
        const existing = serialNumbers ?? [];
        if (qty > existing.length) {
          serialNumbers = [...existing, ...Array(qty - existing.length).fill('')];
        } else {
          serialNumbers = existing.slice(0, qty);
        }
      } else {
        serialNumbers = undefined;
      }
      next.set(itemId, { ...item, quantityReturned: qty, serialNumbers });
      return next;
    });
  };

  // Update single serial (qty=1)
  const updateItemSerial = (itemId: string, serialNumber: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, serialNumber });
      }
      return next;
    });
  };

  // Update serial at index (qty>1)
  const updateItemSerialAt = (itemId: string, index: number, value: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (!item || !item.serialNumbers) return next;
      const arr = [...item.serialNumbers];
      arr[index] = value;
      next.set(itemId, { ...item, serialNumbers: arr });
      return next;
    });
  };

  // Handle submit
  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      toastError('Please select at least one item to return.');
      return;
    }

    // Validate serialized items have serial number(s)
    for (const item of selectedItems.values()) {
      if (!item.isSerialized) continue;
      if (item.quantityReturned > 1) {
        const serials = item.serialNumbers ?? [];
        const filled = serials.filter((s) => s?.trim()).length;
        if (filled !== item.quantityReturned) {
          toastError(
            `Serial number is required for each unit. Please enter ${item.quantityReturned} serial number${item.quantityReturned > 1 ? 's' : ''} for this item.`
          );
          return;
        }
      } else {
        if (!item.serialNumber?.trim()) {
          toastError('Serial number is required for serialized products.');
          return;
        }
      }
    }

    // Build line items: for serialized qty>1, emit one line item per serial
    const lineItems: CreateRmaLineItemInput[] = [];
    for (const item of selectedItems.values()) {
      if (item.isSerialized && item.quantityReturned > 1 && item.serialNumbers?.length) {
        for (const serial of item.serialNumbers) {
          if (serial?.trim()) {
            lineItems.push({
              orderLineItemId: item.orderLineItemId,
              quantityReturned: 1,
              itemReason: item.itemReason || null,
              serialNumber: serial.trim(),
            });
          }
        }
      } else {
        lineItems.push({
          orderLineItemId: item.orderLineItemId,
          quantityReturned: item.quantityReturned,
          itemReason: item.itemReason || null,
          serialNumber: item.isSerialized && item.serialNumber ? item.serialNumber.trim() : null,
        });
      }
    }

    try {
      const result = await onSubmit({
        orderId,
        reason,
        lineItems,
        issueId: issueId ?? null,
        customerId: customerId ?? null,
        reasonDetails: reasonDetails || null,
        customerNotes: customerNotes || null,
      });

      onOpenChange(false);
      onSuccess?.(result.id);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to create RMA');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Create Return Authorization
          </DialogTitle>
          <DialogDescription>
            Select items to return and provide a reason for the return.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reason selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Return Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RmaReason)}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {RMA_REASON_OPTIONS_WITH_DESCRIPTION.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-muted-foreground text-xs">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason details */}
          <div className="space-y-2">
            <Label htmlFor="reasonDetails">Details (optional)</Label>
            <Textarea
              id="reasonDetails"
              placeholder="Provide additional details about the return reason..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={3}
            />
          </div>

          {/* Item selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items to Return</Label>
              {orderLineItems.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-auto py-1"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="h-auto py-1"
                  >
                    Deselect All
                  </Button>
                </div>
              )}
            </div>
            {orderLineItems.length === 0 ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>No items available for this order.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                {orderLineItems.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  const selectedItem = selectedItems.get(item.id);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex flex-col gap-2 rounded-md border p-3 transition-colors',
                        isSelected && 'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleItem(item, checked === true)}
                        />
                        <label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-muted-foreground text-sm">
                            Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                          </div>
                        </label>
                      </div>
                      {item.serialNumber ? (
                        <div className="ml-7 text-muted-foreground text-xs">
                          Existing Serial:{' '}
                          <Link
                            to="/inventory/browser"
                            search={{ view: 'serialized', serializedSearch: item.serialNumber, page: 1 }}
                            className="font-mono text-primary hover:underline"
                          >
                            {item.serialNumber}
                          </Link>
                        </div>
                      ) : null}

                      {/* Quantity and serial for selected items */}
                      {isSelected && (
                        <div className="ml-6 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`qty-${item.id}`} className="text-xs">
                                Quantity to Return
                              </Label>
                              <Input
                                id={`qty-${item.id}`}
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={selectedItem?.quantityReturned ?? 1}
                                onChange={(e) =>
                                  updateItemQuantity(
                                    item.id,
                                    parseInt(e.target.value) || 1,
                                    item.quantity
                                  )
                                }
                                className="h-8"
                              />
                            </div>
                            {item.isSerialized && (selectedItem?.quantityReturned ?? 1) === 1 && (
                              <div className="space-y-1">
                                <Label htmlFor={`serial-${item.id}`} className="text-xs">
                                  Serial Number (required)
                                </Label>
                                <Input
                                  id={`serial-${item.id}`}
                                  placeholder="e.g., SN12345"
                                  value={selectedItem?.serialNumber ?? ''}
                                  onChange={(e) => updateItemSerial(item.id, e.target.value)}
                                  className="h-8"
                                />
                              </div>
                            )}
                            {!item.isSerialized && (
                              <div className="space-y-1">
                                <Label htmlFor={`serial-${item.id}`} className="text-xs">
                                  Serial Number (optional)
                                </Label>
                                <Input
                                  id={`serial-${item.id}`}
                                  placeholder="e.g., SN12345"
                                  value={selectedItem?.serialNumber ?? ''}
                                  onChange={(e) => updateItemSerial(item.id, e.target.value)}
                                  className="h-8"
                                />
                              </div>
                            )}
                          </div>
                          {/* Multiple serial inputs for serialized qty > 1 */}
                          {item.isSerialized &&
                            (selectedItem?.quantityReturned ?? 1) > 1 &&
                            Array.from(
                              { length: selectedItem?.quantityReturned ?? 1 },
                              (_, i) => i
                            ).map((idx) => (
                              <div key={idx} className="space-y-1">
                                <Label
                                  htmlFor={`serial-${item.id}-${idx}`}
                                  className="text-xs"
                                >
                                  Serial Number {idx + 1} (required)
                                </Label>
                                <Input
                                  id={`serial-${item.id}-${idx}`}
                                  placeholder={`e.g., SN${String(idx + 1).padStart(2, '0')}`}
                                  value={selectedItem?.serialNumbers?.[idx] ?? ''}
                                  onChange={(e) =>
                                    updateItemSerialAt(item.id, idx, e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer notes */}
          <div className="space-y-2">
            <Label htmlFor="customerNotes">Customer Notes (optional)</Label>
            <Textarea
              id="customerNotes"
              placeholder="Any notes from the customer..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedItems.size === 0}
          >
            {isPending ? 'Creating...' : 'Create RMA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
