import { Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from '@/components/ui/dialog-pending-guards';
import type {
  PendingShipmentCompletionForm,
  PendingShipmentCompletionShipment,
} from '@/hooks/orders/use-pending-shipment-completion';

export interface PendingShipmentCompletionDialogProps {
  shipment: PendingShipmentCompletionShipment | null;
  form: PendingShipmentCompletionForm;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: (field: keyof PendingShipmentCompletionForm, value: string) => void;
}

export function PendingShipmentCompletionDialog({
  shipment,
  form,
  isPending,
  onClose,
  onSubmit,
  onFormChange,
}: PendingShipmentCompletionDialogProps) {
  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const handleOpenChange = createPendingDialogOpenChangeHandler(isPending, (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  });

  return (
    <Dialog open={!!shipment} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>
            {shipment ? `Complete ${shipment.shipmentNumber}` : 'Complete shipment'}
          </DialogTitle>
          <DialogDescription>
            Finalize this pending shipment draft without creating a new shipment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pending-shipment-carrier">Carrier</Label>
            <Input
              id="pending-shipment-carrier"
              value={form.carrier}
              onChange={(event) => onFormChange('carrier', event.target.value)}
              placeholder="Enter carrier name"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pending-shipment-service">Service</Label>
              <Input
                id="pending-shipment-service"
                value={form.carrierService}
                onChange={(event) => onFormChange('carrierService', event.target.value)}
                placeholder="Optional service"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending-shipment-tracking">Tracking Number</Label>
              <Input
                id="pending-shipment-tracking"
                value={form.trackingNumber}
                onChange={(event) => onFormChange('trackingNumber', event.target.value)}
                placeholder="Optional tracking number"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending-shipment-cost">Actual Shipping Cost ($)</Label>
            <Input
              id="pending-shipment-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.shippingCost}
              onChange={(event) => onFormChange('shippingCost', event.target.value)}
              placeholder="0.00"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Marking Shipped...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                Mark Shipped
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
