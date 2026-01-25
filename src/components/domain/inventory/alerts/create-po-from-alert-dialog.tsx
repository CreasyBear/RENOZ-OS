/**
 * Create Purchase Order from Alert Dialog
 *
 * Simplified dialog for creating a PO directly from a low-stock/out-of-stock alert.
 * Dialog owns its form internally (per Kieran's review - no form prop drilling).
 *
 * @see INV-001c Create PO from Alert
 */
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Truck, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSuppliers } from '@/hooks/suppliers';
import { useCreatePurchaseOrder } from '@/hooks/suppliers';
import type { InventoryAlert } from './alerts-panel';

// ============================================================================
// TYPES & SCHEMA
// ============================================================================

interface CreatePOFromAlertDialogProps {
  alert: InventoryAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Inline schema per reviewer guidance (dialog owns its form)
const createPOFromAlertSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().positive('Price must be positive'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof createPOFromAlertSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function CreatePOFromAlertDialog({
  alert,
  open,
  onOpenChange,
  onSuccess,
}: CreatePOFromAlertDialogProps) {
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers for dropdown
  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({
    enabled: open,
  });
  const suppliers = suppliersData?.items ?? [];

  // PO creation mutation
  const createPO = useCreatePurchaseOrder();

  // Calculate suggested reorder quantity based on threshold vs current
  const suggestedQuantity =
    alert?.threshold && alert?.value
      ? Math.max(1, alert.threshold * 2 - (alert.value ?? 0))
      : 10;

  const form = useForm<FormValues>({
    resolver: zodResolver(createPOFromAlertSchema),
    defaultValues: {
      supplierId: '',
      quantity: suggestedQuantity,
      unitPrice: 0,
      notes: '',
    },
  });

  // Reset form when alert changes
  useEffect(() => {
    if (alert && open) {
      form.reset({
        supplierId: '',
        quantity: suggestedQuantity,
        unitPrice: 0,
        notes: '',
      });
    }
  }, [alert, open, form, suggestedQuantity]);

  const onSubmit = async (data: FormValues) => {
    if (!alert?.productId || !alert?.productName) {
      setError('Product information is missing');
      return;
    }

    setError(null);

    try {
      await createPO.mutateAsync({
        supplierId: data.supplierId,
        items: [
          {
            productId: alert.productId,
            productName: alert.productName,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
            notes: data.notes || undefined,
          },
        ],
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create purchase order');
    }
  };

  const handleClose = () => {
    form.reset();
    setError(null);
    onOpenChange(false);
  };

  if (!alert) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Order Stock
          </DialogTitle>
          <DialogDescription>Create a purchase order for low-stock item</DialogDescription>
        </DialogHeader>

        {/* Product Info Banner */}
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <Package className="h-8 w-8 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{alert.productName}</p>
            <p className="text-sm text-muted-foreground">
              Current stock: {alert.value ?? 0}
              {alert.threshold && <span className="ml-2 text-orange-600">(min: {alert.threshold})</span>}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Supplier Select */}
          <div className="space-y-2">
            <Label htmlFor="supplierId">Supplier *</Label>
            <Select
              value={form.watch('supplierId')}
              onValueChange={(value) => form.setValue('supplierId', value)}
              disabled={loadingSuppliers}
            >
              <SelectTrigger id="supplierId">
                <SelectValue placeholder={loadingSuppliers ? 'Loading...' : 'Select supplier'} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.supplierId && (
              <p className="text-sm text-destructive">{form.formState.errors.supplierId.message}</p>
            )}
          </div>

          {/* Quantity and Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                {...form.register('quantity', { valueAsNumber: true })}
                placeholder="10"
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-destructive">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                step={0.01}
                {...form.register('unitPrice', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.unitPrice && (
                <p className="text-sm text-destructive">{form.formState.errors.unitPrice.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Special instructions or notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPO.isPending}>
              {createPO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePOFromAlertDialog;
