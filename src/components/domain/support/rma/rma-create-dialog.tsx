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
import { toast } from 'sonner';
import type { RmaReason, CreateRmaLineItemInput } from '@/lib/schemas/support/rma';
import { Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/pricing-utils';

// Reason options
const REASON_OPTIONS: { value: RmaReason; label: string; description: string }[] = [
  { value: 'defective', label: 'Defective', description: "Item doesn't work properly" },
  {
    value: 'damaged_in_shipping',
    label: 'Damaged in Shipping',
    description: 'Item arrived damaged',
  },
  { value: 'wrong_item', label: 'Wrong Item', description: 'Received different item than ordered' },
  {
    value: 'not_as_described',
    label: 'Not as Described',
    description: "Item doesn't match description",
  },
  {
    value: 'performance_issue',
    label: 'Performance Issue',
    description: 'Item underperforms expectations',
  },
  {
    value: 'installation_failure',
    label: 'Installation Failure',
    description: 'Unable to install properly',
  },
  { value: 'other', label: 'Other', description: 'Other reason' },
];

// Order line item type (simplified for selection)
interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  serialNumber?: string | null;
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
  serialNumber: string;
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

  // Toggle item selection
  const toggleItem = (item: OrderLineItem, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(item.id, {
          orderLineItemId: item.id,
          quantityReturned: 1,
          itemReason: '',
          serialNumber: item.serialNumber ?? '',
        });
      } else {
        next.delete(item.id);
      }
      return next;
    });
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, quantityReturned: quantity });
      }
      return next;
    });
  };

  // Update item serial number
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

  // Handle submit
  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to return.');
      return;
    }

    const lineItems: CreateRmaLineItemInput[] = Array.from(selectedItems.values()).map((item) => ({
      orderLineItemId: item.orderLineItemId,
      quantityReturned: item.quantityReturned,
      itemReason: item.itemReason || null,
      serialNumber: item.serialNumber || null,
    }));

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
      toast.error(error instanceof Error ? error.message : 'Failed to create RMA');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
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
            <Select
              value={reason}
              onValueChange={(v) => {
                const opt = REASON_OPTIONS.find((o) => o.value === v);
                if (opt) setReason(opt.value);
              }}
            >
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
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
            <Label>Items to Return</Label>
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

                      {/* Quantity and serial for selected items */}
                      {isSelected && (
                        <div className="ml-6 grid grid-cols-2 gap-3">
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
                                updateItemQuantity(item.id, parseInt(e.target.value) || 1)
                              }
                              className="h-8"
                            />
                          </div>
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.size === 0}
          >
            {isSubmitting ? 'Creating...' : 'Create RMA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
