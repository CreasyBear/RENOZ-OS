import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  CreateSerializedItemInput,
  SerializedItem,
  SerializedItemStatus,
  UpdateSerializedItemInput,
} from '@/lib/schemas/inventory';

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
}

interface SerializedItemFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  item?: SerializedItem | null;
  products: ProductOption[];
  isSubmitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateSerializedItemInput | UpdateSerializedItemInput) => Promise<void>;
}

const STATUS_OPTIONS: SerializedItemStatus[] = [
  'available',
  'allocated',
  'shipped',
  'returned',
  'quarantined',
  'scrapped',
];

export function SerializedItemFormDialog({
  open,
  mode,
  item,
  products,
  isSubmitting = false,
  onOpenChange,
  onSubmit,
}: SerializedItemFormDialogProps) {
  const defaultProductId = mode === 'edit' && item ? item.productId : '';
  const defaultSerialNumber = mode === 'edit' && item ? item.serialNumberRaw : '';
  const defaultStatus: SerializedItemStatus = mode === 'edit' && item ? item.status : 'available';

  const [productId, setProductId] = useState(defaultProductId);
  const [serialNumber, setSerialNumber] = useState(defaultSerialNumber);
  const [status, setStatus] = useState<SerializedItemStatus>(defaultStatus);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(
    () => productId.trim().length > 0 && serialNumber.trim().length > 0,
    [productId, serialNumber]
  );

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Product and serial number are required.');
      return;
    }

    setError(null);
    if (mode === 'edit' && item) {
      await onSubmit({
        id: item.id,
        productId,
        serialNumber,
        status,
        notes: notes.trim() || undefined,
      });
      return;
    }

    await onSubmit({
      productId,
      serialNumber,
      status,
      notes: notes.trim() || undefined,
    });
  };

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSubmitting);
  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) return;
    onOpenChange(nextOpen);
  };
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSubmitting, handleOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Serialized Item' : 'Edit Serialized Item'}</DialogTitle>
          <DialogDescription>
            Manage canonical serial identity and availability state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serialized-product">Product</Label>
            <Select value={productId} onValueChange={setProductId} disabled={isSubmitting}>
              <SelectTrigger id="serialized-product">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} {product.sku ? `(${product.sku})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialized-serial">Serial Number</Label>
            <Input
              id="serialized-serial"
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder="Enter serial number"
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialized-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as SerializedItemStatus)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="serialized-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serialized-notes">Note (optional)</Label>
            <Input
              id="serialized-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Context for this change"
              disabled={isSubmitting}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isValid}>
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
