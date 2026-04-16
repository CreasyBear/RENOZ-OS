'use client';

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toastError } from '@/hooks';
import type { RmaResponse } from '@/lib/schemas/support/rma';

import { RMA_RECEIVE_CONDITION_OPTIONS } from './rma-options';

interface WarehouseLocationOption {
  id: string;
  name: string;
  code: string;
  isActive?: boolean | null;
}

interface RmaReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  rma: RmaResponse;
  locations: WarehouseLocationOption[];
  locationsLoading: boolean;
  onReceive: (inspection?: {
    condition?: string;
    notes?: string;
    locationId?: string;
  }) => Promise<void>;
}

const INITIAL_RECEIVE_FORM_STATE = {
  inspectionCondition: 'good',
  inspectionNotes: '',
  receivingLocationId: '',
};

export function RmaReceiveDialog({
  open,
  onOpenChange,
  isPending,
  rma,
  locations,
  locationsLoading,
  onReceive,
}: RmaReceiveDialogProps) {
  const [inspectionCondition, setInspectionCondition] = useState(
    INITIAL_RECEIVE_FORM_STATE.inspectionCondition
  );
  const [inspectionNotes, setInspectionNotes] = useState(
    INITIAL_RECEIVE_FORM_STATE.inspectionNotes
  );
  const [receivingLocationId, setReceivingLocationId] = useState(
    INITIAL_RECEIVE_FORM_STATE.receivingLocationId
  );

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isPending);
  const guardedOpenChange = createPendingDialogOpenChangeHandler(isPending, onOpenChange);

  const resetForm = () => {
    setInspectionCondition(INITIAL_RECEIVE_FORM_STATE.inspectionCondition);
    setInspectionNotes(INITIAL_RECEIVE_FORM_STATE.inspectionNotes);
    setReceivingLocationId(INITIAL_RECEIVE_FORM_STATE.receivingLocationId);
  };

  useEffect(() => {
    resetForm();
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    guardedOpenChange(nextOpen);
  };

  const handleReceive = async () => {
    if (!receivingLocationId) {
      toastError('Choose a receiving location before marking the RMA as received');
      return;
    }

    try {
      await onReceive({
        condition: inspectionCondition,
        notes: inspectionNotes || undefined,
        locationId: receivingLocationId,
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Failed to mark received');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Receive Items</DialogTitle>
          <DialogDescription>Log the receipt and inspection of returned items.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {rma.lineItems && rma.lineItems.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Items to receive</Label>
              <ul className="rounded-md border p-3 text-sm">
                {rma.lineItems.map((item) => (
                  <li key={item.id} className="flex justify-between py-1">
                    <span>{item.orderLineItem?.productName ?? 'Unknown Product'}</span>
                    <span className="text-muted-foreground">
                      {item.quantityReturned}
                      {item.serialNumber ? (
                        <>
                          {' · S/N: '}
                          <Link
                            to="/inventory/browser"
                            search={{
                              view: 'serialized',
                              serializedSearch: item.serialNumber,
                              page: 1,
                            }}
                            className="font-mono text-primary hover:underline"
                          >
                            {item.serialNumber}
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="receivingLocation">Receiving Location</Label>
            <Select value={receivingLocationId} onValueChange={setReceivingLocationId}>
              <SelectTrigger id="receivingLocation">
                <SelectValue
                  placeholder={
                    locationsLoading ? 'Loading locations...' : 'Select receiving location'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {locations
                  .filter((location) => location.isActive !== false)
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} ({location.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Item Condition</Label>
            <Select value={inspectionCondition} onValueChange={setInspectionCondition}>
              <SelectTrigger id="condition">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {RMA_RECEIVE_CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspectionNotes">Inspection Notes (optional)</Label>
            <Textarea
              id="inspectionNotes"
              placeholder="Note any observations about the returned items..."
              value={inspectionNotes}
              onChange={(event) => setInspectionNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleReceive} disabled={isPending}>
            {isPending ? 'Processing...' : 'Mark Received'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
