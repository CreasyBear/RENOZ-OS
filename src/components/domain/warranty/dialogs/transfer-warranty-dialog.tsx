/**
 * Transfer Warranty Dialog Component
 *
 * Dialog for transferring a warranty to a new customer.
 * Includes customer selection and reason input.
 *
 * Features:
 * - Customer selection with search
 * - Reason/notes field
 * - Warranty information display
 * - Form validation
 *
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowRightLeft, User } from 'lucide-react';
import { CustomerSelectorContainer } from '@/components/domain/orders/creation/customer-selector-container';
import type { SelectedCustomer } from '@/components/domain/orders/creation/customer-selector';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';

// ============================================================================
// TYPES
// ============================================================================

export interface TransferWarrantyDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** The warranty to transfer */
  warranty: {
    id: string;
    warrantyNumber: string;
    productName?: string;
    customerName?: string;
    customerId: string;
  };
  /** Callback after successful transfer */
  onSuccess?: () => void;
  /** From route container (mutation). */
  onSubmit: (payload: {
    id: string;
    newCustomerId: string;
    reason?: string;
  }) => Promise<void>;
  /** From route container (mutation). */
  isSubmitting?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TransferWarrantyDialog({
  open,
  onOpenChange,
  warranty,
  onSuccess,
  onSubmit,
  isSubmitting,
}: TransferWarrantyDialogProps) {
  const isPending = isSubmitting ?? false;
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState('');

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedCustomerId(null);
      setReason('');
    }
  }, [open]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      return;
    }

    // Prevent transferring to the same customer
    if (selectedCustomerId === warranty.customerId) {
      return;
    }

    try {
      await onSubmit({
        id: warranty.id,
        newCustomerId: selectedCustomerId,
        reason: reason.trim() || undefined,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled by mutation
    }
  };

  const isValid = selectedCustomerId !== null && selectedCustomerId !== warranty.customerId;

  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5" />
            Transfer Warranty
          </DialogTitle>
          <DialogDescription>
            Transfer warranty {warranty.warrantyNumber} to a new customer
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Warranty Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid gap-1">
                <p className="text-sm font-medium">{warranty.warrantyNumber}</p>
                {warranty.productName && (
                  <p className="text-muted-foreground text-sm">{warranty.productName}</p>
                )}
                {warranty.customerName && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <User className="text-muted-foreground size-4" />
                    <span className="text-muted-foreground">Current Customer:</span>
                    <span className="font-medium">{warranty.customerName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Select New Customer *</Label>
            <CustomerSelectorContainer
              selectedCustomerId={selectedCustomerId}
              onSelect={(customer: SelectedCustomer | null) =>
                setSelectedCustomerId(customer?.id ?? null)
              }
            />
            {selectedCustomerId === warranty.customerId && (
              <p className="text-destructive text-sm">
                Cannot transfer warranty to the same customer
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for transferring this warranty..."
              maxLength={2000}
              rows={3}
            />
            <p className="text-muted-foreground text-right text-xs">{reason.length}/2000</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Transferring...
                </>
              ) : (
                'Transfer Warranty'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
