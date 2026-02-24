/**
 * Create Purchase Order from Alert Dialog
 *
 * Simplified dialog for creating a PO directly from a low-stock/out-of-stock alert.
 * Dialog owns its form internally (per Kieran's review - no form prop drilling).
 *
 * @see INV-001c Create PO from Alert
 */
import { useState, useEffect } from "react";
import { Package, Truck } from "lucide-react";
import { useSuppliers, useCreatePurchaseOrder } from "@/hooks/suppliers";
import type { InventoryAlert } from "./alerts-panel";
import {
  createPOFromAlertFormSchema,
  type CreatePOFromAlertFormValues,
} from "@/lib/schemas/inventory";
import { toast } from "sonner";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  SelectField,
  NumberField,
  TextareaField,
} from "@/components/shared/forms";

// ============================================================================
// TYPES & SCHEMA
// ============================================================================

interface CreatePOFromAlertDialogProps {
  alert: InventoryAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormValues = CreatePOFromAlertFormValues;

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

  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({
    enabled: open,
  });
  const suppliers = suppliersData?.items ?? [];

  const createPO = useCreatePurchaseOrder();

  const form = useTanStackForm<FormValues>({
    schema: createPOFromAlertFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      supplierId: "",
      quantity: 10,
      unitPrice: 0,
      notes: "",
    },
    onSubmit: async (values) => {
      if (!alert?.productId || !alert?.productName) {
        setError("Product information is missing");
        return;
      }

      setError(null);

      try {
        await createPO.mutateAsync({
          supplierId: values.supplierId,
          items: [
            {
              productId: alert.productId,
              productName: alert.productName,
              quantity: values.quantity,
              unitPrice: values.unitPrice,
              notes: values.notes || undefined,
            },
          ],
        });

        onOpenChange(false);
        onSuccess?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create purchase order"
        );
      }
    },
  });

  useEffect(() => {
    if (alert && open) {
      const suggestedQuantity =
        alert.threshold != null && alert.value != null
          ? Math.max(1, alert.threshold * 2 - (alert.value ?? 0))
          : 10;
      form.reset({
        supplierId: "",
        quantity: suggestedQuantity,
        unitPrice: 0,
        notes: "",
      });
    }
  }, [alert, open, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (createPO.isPending) return;
      form.reset();
      setError(null);
      onOpenChange(false);
    } else {
      onOpenChange(newOpen);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  if (!alert) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Order Stock
        </span>
      }
      description="Create a purchase order for low-stock item"
      form={form}
      submitLabel="Create PO"
      submitError={error}
      submitDisabled={createPO.isPending}
      size="md"
      className="sm:max-w-md"
      resetOnClose={false}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
        <Package className="h-8 w-8 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{alert.productName}</p>
          <p className="text-sm text-muted-foreground">
            Current stock: {alert.value ?? 0}
            {alert.threshold && (
              <span className="ml-2 text-orange-600">
                (min: {alert.threshold})
              </span>
            )}
          </p>
        </div>
      </div>

      <form.Field name="supplierId">
            {(field) => (
              <SelectField
                field={field}
                label="Supplier"
                options={supplierOptions}
                placeholder={
                  loadingSuppliers ? "Loading..." : "Select supplier"
                }
                required
                disabled={loadingSuppliers}
              />
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="quantity">
              {(field) => (
                <NumberField
                  field={field}
                  label="Quantity"
                  min={1}
                  placeholder="10"
                  required
                />
              )}
            </form.Field>

            <form.Field name="unitPrice">
              {(field) => (
                <NumberField
                  field={field}
                  label="Unit Price"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  required
                />
              )}
            </form.Field>
          </div>

          <form.Field name="notes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes (optional)"
                placeholder="Special instructions or notes..."
                rows={2}
              />
            )}
          </form.Field>
    </FormDialog>
  );
}

export default CreatePOFromAlertDialog;
