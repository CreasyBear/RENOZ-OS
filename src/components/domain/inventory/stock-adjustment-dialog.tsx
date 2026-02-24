/**
 * Stock Adjustment Dialog
 *
 * Dialog for adjusting inventory stock levels (positive or negative).
 * Creates an inventory movement record for audit trail.
 *
 * @see docs/design-system/FORM-STANDARDS.md
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Package, AlertTriangle, Plus, Minus } from "lucide-react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  NumberField,
  SelectField,
  TextareaField,
} from "@/components/shared/forms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createStockAdjustmentFormSchema,
  type StockAdjustmentFormValues,
} from "@/lib/schemas/inventory/stock-adjustment-form";

// ============================================================================
// TYPES
// ============================================================================

export interface StockAdjustmentDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Inventory item data */
  item: {
    id: string;
    productId: string;
    productName: string;
    productSku: string;
    isSerialized?: boolean;
    serialNumber?: string | null;
    locationId: string;
    locationName: string;
    quantityOnHand: number;
    quantityAvailable: number;
    unitCost?: number;
  };
  /** Callback when adjustment is submitted */
  onAdjust: (data: AdjustmentFormData) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

export interface AdjustmentFormData {
  inventoryId: string;
  productId: string;
  locationId: string;
  adjustmentQty: number; // Positive for increase, negative for decrease
  reason: string;
  notes?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ADJUSTMENT_REASONS = [
  { value: "count_discrepancy", label: "Stock Count Discrepancy" },
  { value: "damaged", label: "Damaged Goods" },
  { value: "expired", label: "Expired Goods" },
  { value: "found", label: "Inventory Found" },
  { value: "lost", label: "Inventory Lost/Missing" },
  { value: "quality_reject", label: "Quality Rejection" },
  { value: "return_to_vendor", label: "Return to Vendor" },
  { value: "system_correction", label: "System Correction" },
  { value: "other", label: "Other" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function StockAdjustmentDialog({
  open,
  onClose,
  item,
  onAdjust,
  isLoading = false,
}: StockAdjustmentDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const adjustmentFormSchema = useMemo(
    () => createStockAdjustmentFormSchema(item),
    [item]
  );

  const form = useTanStackForm<StockAdjustmentFormValues>({
    schema: adjustmentFormSchema,
    defaultValues: {
      adjustmentType: "increase" as const,
      quantity: 1,
      reason: "",
      notes: "",
    },
    onSubmit: async (values) => {
      try {
        setError(null);

        // Calculate actual adjustment quantity (positive or negative)
        const adjustmentQty =
          values.adjustmentType === "increase"
            ? (item.isSerialized ? 1 : values.quantity)
            : -(item.isSerialized ? 1 : values.quantity);

        await onAdjust({
          inventoryId: item.id,
          productId: item.productId,
          locationId: item.locationId,
          adjustmentQty,
          reason: values.reason,
          notes: values.notes,
        });

        form.reset();
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to adjust inventory");
        }
      }
    },
    onSubmitInvalid: () => {
      setError("Please fix the errors below and try again");
    },
  });

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setError(null);
    form.reset();
    onClose();
  }, [form, isLoading, onClose]);

  useEffect(() => {
    if (!item.isSerialized) return;
    const forcedType = item.quantityOnHand > 0 ? "decrease" : "increase";
    if (form.state.values.adjustmentType !== forcedType) {
      form.setFieldValue("adjustmentType", forcedType);
    }
  }, [form, item.isSerialized, item.quantityOnHand]);

  const adjustmentType = form.state.values.adjustmentType;
  const quantity = form.state.values.quantity ?? 0;
  const effectiveQuantity = item.isSerialized ? 1 : quantity;

  // Calculate new quantity preview
  const newQuantity =
    adjustmentType === "increase"
      ? item.quantityOnHand + effectiveQuantity
      : item.quantityOnHand - effectiveQuantity;

  const isDecrease = adjustmentType === "decrease";

  return (
    <FormDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && handleClose()}
      title="Adjust Inventory"
      description={`Adjust stock levels for ${item.productName} at ${item.locationName}.`}
      form={form}
      submitLabel="Adjust Inventory"
      loadingLabel="Adjusting..."
      submitError={error}
      size="md"
      className="sm:max-w-[500px]"
    >
      {/* Item Details */}
      <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{item.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.productSku} • {item.locationName}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Current Stock:{" "}
                <span className="font-medium text-foreground">
                  {item.quantityOnHand} units
                </span>
              </span>
            </div>
          </div>

          {/* Adjustment Type Toggle */}
          <form.Field name="adjustmentType">
            {(field) => (
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      field.state.value === "increase" ? "default" : "outline"
                    }
                    className={cn(
                      "flex-1 gap-2",
                      field.state.value === "increase" &&
                        "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => field.handleChange("increase")}
                    disabled={isLoading || (item.isSerialized && item.quantityOnHand > 0)}
                  >
                    <Plus className="h-4 w-4" />
                    Increase
                  </Button>
                  <Button
                    type="button"
                    variant={
                      field.state.value === "decrease" ? "default" : "outline"
                    }
                    className={cn(
                      "flex-1 gap-2",
                      field.state.value === "decrease" &&
                        "bg-destructive hover:bg-destructive/90"
                    )}
                    onClick={() => field.handleChange("decrease")}
                    disabled={isLoading || (item.isSerialized && item.quantityOnHand <= 0)}
                  >
                    <Minus className="h-4 w-4" />
                    Decrease
                  </Button>
                </div>
              </div>
            )}
          </form.Field>

          {/* Quantity Field */}
          <form.Field
            name="quantity"
            validators={{
              onChangeListenTo: ["adjustmentType"],
              onChange: ({ value, fieldApi }) => {
                const adjType = fieldApi.form.state.values.adjustmentType;
                const isDec = adjType === "decrease";
                if (item.isSerialized && value !== 1) {
                  return "Serialized adjustments are one unit at a time";
                }
                if (value <= 0) return "Quantity must be greater than 0";
                if (isDec && value > item.quantityOnHand) {
                  return `Cannot decrease by more than current stock (${item.quantityOnHand})`;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <NumberField
                field={field}
                label={`Quantity to ${isDecrease ? "Decrease" : "Increase"}`}
                required
                min={1}
                max={item.isSerialized ? 1 : (isDecrease ? item.quantityOnHand : undefined)}
                disabled={isLoading || item.isSerialized}
                description={
                  item.isSerialized
                    ? `Serialized adjustment for ${item.serialNumber ?? "selected serial"}`
                    : isDecrease
                      ? `Max: ${item.quantityOnHand} units`
                      : undefined
                }
              />
            )}
          </form.Field>

          {/* Reason Field */}
          <form.Field
            name="reason"
            validators={{
              onChange: ({ value }) =>
                value ? undefined : "Reason is required",
            }}
          >
            {(field) => (
              <SelectField
                field={field}
                label="Reason"
                options={ADJUSTMENT_REASONS.map((r) => ({ value: r.value, label: r.label }))}
                placeholder="Select a reason..."
                required
                disabled={isLoading}
              />
            )}
          </form.Field>

          {/* Notes Field */}
          <form.Field name="notes">
            {(field) => (
              <TextareaField
                field={field}
                label="Notes (Optional)"
                placeholder="Additional details about this adjustment..."
                rows={3}
                disabled={isLoading}
              />
            )}
          </form.Field>

          {/* Preview */}
          {effectiveQuantity > 0 && (
            <div
              className={cn(
                "rounded-lg border p-4",
                isDecrease ? "bg-destructive/5" : "bg-green-50"
              )}
            >
              <div className="flex items-center gap-2">
                {isDecrease ? (
                  <Minus
                    className={cn("h-4 w-4", isDecrease && "text-destructive")}
                  />
                ) : (
                  <Plus className="h-4 w-4 text-green-600" />
                )}
                <span className="font-medium">Adjustment Preview</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {item.quantityOnHand} units
                </span>
                <span
                  className={cn(
                    "font-bold",
                    isDecrease ? "text-destructive" : "text-green-600"
                  )}
                >
                  {isDecrease ? "-" : "+"}
                  {effectiveQuantity}
                </span>
                <span>=</span>
                <span
                  className={cn(
                    "font-bold",
                    newQuantity < 0 ? "text-destructive" : "text-foreground"
                  )}
                >
                  {newQuantity} units
                </span>
              </div>
              {newQuantity < 0 && (
                <p className="mt-2 text-xs text-destructive">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  Cannot have negative inventory
                </p>
              )}
            </div>
          )}

    </FormDialog>
  );
}

export default StockAdjustmentDialog;
