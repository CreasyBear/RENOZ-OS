/**
 * Create Purchase Order from Recommendation Dialog
 *
 * Simplified dialog for creating a PO directly from a reorder recommendation.
 * Uses existing hooks and follows STANDARDS.md patterns.
 *
 * @source recommendation from parent container (forecasting page)
 * @source useCreatePurchaseOrder hook for mutation
 * @source useSuppliers hook for supplier data
 */

import { useState, useEffect, startTransition } from "react";
import { Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSuppliers, useCreatePurchaseOrder } from "@/hooks/suppliers";
import type { ReorderRecommendation } from "./reorder-recommendations";
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

interface CreatePOFromRecommendationDialogProps {
  /** Recommendation data or null if closed */
  recommendation: ReorderRecommendation | null;
  /** Dialog open state */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Callback on successful PO creation */
  onSuccess?: () => void;
}

type FormValues = CreatePOFromAlertFormValues;

// ============================================================================
// COMPONENT
// ============================================================================

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

export function CreatePOFromRecommendationDialog({
  recommendation,
  open,
  onOpenChange,
  onSuccess,
}: CreatePOFromRecommendationDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({
    enabled: open,
  });
  const suppliers = suppliersData?.items ?? [];

  const createPO = useCreatePurchaseOrder();

  const defaultQuantity = recommendation?.recommendedQuantity ?? 10;

  const form = useTanStackForm<FormValues>({
    schema: createPOFromAlertFormSchema,
    onSubmitInvalid: () => {
      toast.error("Please fix the errors below and try again.");
    },
    defaultValues: {
      supplierId: "",
      quantity: defaultQuantity,
      unitPrice: 0,
      notes: "",
    },
    onSubmit: async (values) => {
      if (!recommendation) return;

      setError(null);

      try {
        await createPO.mutateAsync({
          supplierId: values.supplierId,
          items: [
            {
              productId: recommendation.productId,
              productName: recommendation.productName,
              productSku: recommendation.productSku,
              quantity: values.quantity,
              unitPrice: values.unitPrice,
              notes: values.notes,
            },
          ],
          notes: values.notes,
          expectedDeliveryDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .slice(0, 10),
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
    if (recommendation && open) {
      form.reset({
        supplierId: "",
        quantity: recommendation.recommendedQuantity,
        unitPrice: 0,
        notes: `Auto-generated from reorder recommendation. Current stock: ${recommendation.currentStock}, Recommended: ${recommendation.recommendedQuantity}`,
      });
      startTransition(() => setError(null));
    }
  }, [recommendation, open, form]);

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

  if (!recommendation) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <span className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          Create Purchase Order
        </span>
      }
      description={`Create a PO for ${recommendation.productName}`}
      form={form}
      submitLabel="Create Purchase Order"
      submitError={error}
      submitDisabled={createPO.isPending || loadingSuppliers}
      size="md"
      className="sm:max-w-[500px]"
      resetOnClose={false}
    >
      {recommendation && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {recommendation.productName}
              </span>
              <Badge className={getUrgencyColor(recommendation.urgency)}>
                {recommendation.urgency}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>SKU:</span>
                <span>{recommendation.productSku}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Stock:</span>
                <span>{recommendation.currentStock}</span>
              </div>
              <div className="flex justify-between">
                <span>Reorder Point:</span>
                <span>{recommendation.reorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span>Recommended Qty:</span>
                <span className="font-medium">
                  {recommendation.recommendedQuantity}
                </span>
              </div>
              {recommendation.daysUntilStockout !== null && (
                <div className="flex justify-between">
                  <span>Days Until Stockout:</span>
                  <span
                    className={
                      recommendation.daysUntilStockout <= 7
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {recommendation.daysUntilStockout}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

      <form.Field name="supplierId">
            {(field) => (
              <SelectField
                field={field}
                label="Supplier"
                options={supplierOptions}
                placeholder={
                  loadingSuppliers ? "Loading..." : "Select a supplier"
                }
                required
                disabled={loadingSuppliers || createPO.isPending}
              />
            )}
          </form.Field>

          <form.Field name="quantity">
            {(field) => (
              <NumberField
                field={field}
                label="Quantity"
                min={1}
                required
                disabled={createPO.isPending}
              />
            )}
          </form.Field>

          <form.Field name="unitPrice">
            {(field) => (
              <NumberField
                field={field}
                label="Unit Price ($)"
                min={0.01}
                step={0.01}
                required
                disabled={createPO.isPending}
              />
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes"
                placeholder="Optional notes for this purchase order"
                rows={3}
                disabled={createPO.isPending}
              />
            )}
          </form.Field>
    </FormDialog>
  );
}
