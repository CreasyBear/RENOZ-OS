/**
 * Credit Note Dialogs (Shared Components)
 *
 * Reusable dialog components for credit note operations.
 * Extracted from credit-notes-list.tsx to follow DRY principles.
 *
 * @see src/components/domain/financial/credit-notes-list.tsx
 * @see src/components/domain/invoices/detail/invoice-detail-container.tsx
 */

import { useState, useCallback, useEffect, startTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateCreditNoteInput } from '@/lib/schemas';
import { customerSchema } from '@/lib/schemas/customers';
import type { Customer } from '@/lib/schemas/customers';
import { CustomerCombobox, OrderCombobox, type OrderSummary } from '@/components/shared';
import { useCustomer } from '@/hooks/customers';
import { useOrderWithCustomer } from '@/hooks/orders/use-order-detail';

// ============================================================================
// CREATE CREDIT NOTE DIALOG
// ============================================================================

export interface CreateCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  orderId?: string; // Pre-fill order ID when creating from invoice
  onCreate: (data: CreateCreditNoteInput) => void;
  isPending: boolean;
}

export function CreateCreditNoteDialog({
  open,
  onOpenChange,
  customerId: initialCustomerId,
  orderId: initialOrderId,
  onCreate,
  isPending,
}: CreateCreditNoteDialogProps) {
  // Form state - using Customer/OrderSummary objects instead of UUIDs
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // Fetch order with customer if initialOrderId is provided
  const { data: orderData } = useOrderWithCustomer({
    orderId: initialOrderId ?? '',
    enabled: open && !!initialOrderId,
  });

  // Determine customerId to fetch (from prop or from order's customerId)
  const customerIdToFetch = initialCustomerId ?? orderData?.customerId;

  // Fetch customer if we have a customerId (from prop or order)
  const { data: customerData } = useCustomer({
    id: customerIdToFetch ?? '',
    enabled: open && !!customerIdToFetch,
  });

  // Populate customer when data loads
  useEffect(() => {
    if (customerData && open) {
      const result = customerSchema.safeParse(customerData);
      if (result.success) {
        startTransition(() => setSelectedCustomer(result.data));
      }
    }
  }, [customerData, open]);

  // Populate order when data loads (convert OrderWithCustomer to OrderSummary format)
  useEffect(() => {
    if (orderData && open) {
      const orderSummary: OrderSummary = {
        id: orderData.id,
        orderNumber: orderData.orderNumber ?? `Order ${orderData.id.slice(0, 8)}`,
        customerName: orderData.customer?.name ?? null,
        total: orderData.total ?? 0,
        status: orderData.status,
      };
      startTransition(() => setSelectedOrder(orderSummary));
      
      // If order has customerId but we don't have customer yet, use order's customerId
      // to also fetch customer (if initialCustomerId wasn't provided)
      if (orderData.customerId && !selectedCustomer && !initialCustomerId) {
        // Note: We could fetch customer here using orderData.customerId,
        // but since we already have useCustomer hook, we'll rely on initialCustomerId prop
        // being passed when opening from invoice detail view
      }
    }
  }, [orderData, open, selectedCustomer, initialCustomerId]);

  const handleClose = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSelectedCustomer(null);
      setSelectedOrder(null);
      setAmount('');
      setReason('');
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const handleSubmit = useCallback(() => {
    if (!amount || !selectedCustomer) return;

    // Validate amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    onCreate({
      customerId: selectedCustomer.id,
      orderId: selectedOrder?.id || undefined,
      amount: amountNum, // Amount is in dollars (STANDARDS.md compliance)
      reason: reason.trim(),
    });
    handleClose(false);
  }, [amount, selectedCustomer, selectedOrder, reason, onCreate, handleClose]);

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, handleClose);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        key={`${initialCustomerId}-${initialOrderId}`}
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customer">Customer *</Label>
            <CustomerCombobox
              value={selectedCustomer}
              onSelect={setSelectedCustomer}
              placeholder="Search customers..."
              disabled={!!initialCustomerId}
            />
            <p className="text-xs text-muted-foreground">
              Search by customer name or email
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="order">Related Order/Invoice (optional)</Label>
            <OrderCombobox
              value={selectedOrder}
              onSelect={setSelectedOrder}
              customerId={selectedCustomer?.id}
              placeholder="Search orders by number..."
              disabled={!!initialOrderId}
            />
            <p className="text-xs text-muted-foreground">
              {selectedCustomer
                ? 'Search orders for this customer'
                : 'Select a customer first to filter orders'}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (AUD) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Enter amount in Australian dollars (e.g., 1500.00 for $1,500.00)
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for credit note (e.g., Returned equipment, Price adjustment)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !amount || !selectedCustomer || !reason.trim()}
          >
            {isPending ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
