/**
 * Stock Adjustment Dialog
 *
 * Dialog for adjusting inventory stock levels (positive or negative).
 * Creates an inventory movement record for audit trail.
 *
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */

import { useState, useCallback } from "react";
import { Loader2, Package, AlertTriangle, Plus, Minus } from "lucide-react";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

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
// VALIDATION SCHEMA
// ============================================================================

const adjustmentSchema = z.object({
  adjustmentType: z.enum(["increase", "decrease"]),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

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

  const form = useForm({
    defaultValues: {
      adjustmentType: "increase" as const,
      quantity: 1,
      reason: "",
      notes: "",
    } as AdjustmentFormValues,
    onSubmit: async ({ value }) => {
      try {
        setError(null);
        await adjustmentSchema.parseAsync(value);

        // Calculate actual adjustment quantity (positive or negative)
        const adjustmentQty =
          value.adjustmentType === "increase"
            ? value.quantity
            : -value.quantity;

        // Validate decrease doesn't exceed available
        if (
          value.adjustmentType === "decrease" &&
          value.quantity > item.quantityOnHand
        ) {
          setError(
            `Cannot decrease by more than current stock (${item.quantityOnHand} units)`
          );
          return;
        }

        await onAdjust({
          inventoryId: item.id,
          productId: item.productId,
          locationId: item.locationId,
          adjustmentQty,
          reason: value.reason,
          notes: value.notes,
        });

        // Reset form and close on success
        form.reset();
        onClose();
      } catch (err) {
        if (err instanceof z.ZodError) {
          setError(err.issues[0]?.message ?? "Validation failed");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to adjust inventory");
        }
      }
    },
  });

  const handleClose = useCallback(() => {
    setError(null);
    form.reset();
    onClose();
  }, [form, onClose]);

  const adjustmentType = form.getFieldValue("adjustmentType");
  const quantity = form.getFieldValue("quantity") ?? 0;

  // Calculate new quantity preview
  const newQuantity =
    adjustmentType === "increase"
      ? item.quantityOnHand + quantity
      : item.quantityOnHand - quantity;

  const isDecrease = adjustmentType === "decrease";
  const canSubmit =
    quantity > 0 &&
    form.getFieldValue("reason") &&
    (!isDecrease || quantity <= item.quantityOnHand);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Inventory</DialogTitle>
          <DialogDescription>
            Adjust stock levels for {item.productName} at {item.locationName}.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
              onChange: ({ value }) => {
                if (value <= 0) return "Quantity must be greater than 0";
                if (
                  isDecrease &&
                  value > item.quantityOnHand
                ) {
                  return `Cannot decrease by more than current stock (${item.quantityOnHand})`;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity to {isDecrease ? "Decrease" : "Increase"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={isDecrease ? item.quantityOnHand : undefined}
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(parseInt(e.target.value) || 0)
                  }
                  onBlur={field.handleBlur}
                  disabled={isLoading}
                />
                {isDecrease && (
                  <p className="text-xs text-muted-foreground">
                    Max: {item.quantityOnHand} units
                  </p>
                )}
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  disabled={isLoading}
                >
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.state.meta.errors.length > 0 && (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Notes Field */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional details about this adjustment..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isLoading}
                  rows={3}
                />
              </div>
            )}
          </form.Field>

          {/* Preview */}
          {quantity > 0 && (
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
                  {quantity}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adjusting...
                </>
              ) : (
                "Adjust Inventory"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default StockAdjustmentDialog;
