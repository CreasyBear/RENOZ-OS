/**
 * Stock Transfer Dialog
 *
 * Dialog for transferring inventory between warehouse locations.
 * Follows DOM-INV-002c wireframe specifications.
 *
 * @see _Initiation/_prd/2-domains/inventory/wireframes/INV-002c.wireframe.md
 */

import { useState, useCallback } from "react";
import { ArrowRight, Loader2, MapPin, Package } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WarehouseLocation } from "@/hooks/inventory/use-locations";

// ============================================================================
// TYPES
// ============================================================================

export interface StockTransferDialogProps {
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
  /** Available locations for transfer (excluding current) */
  locations: WarehouseLocation[];
  /** Callback when transfer is submitted */
  onTransfer: (data: TransferFormData) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

export interface TransferFormData {
  inventoryId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason?: string;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const transferSchema = z.object({
  toLocationId: z.string().min(1, "Destination location is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function StockTransferDialog({
  open,
  onClose,
  item,
  locations,
  onTransfer,
  isLoading = false,
}: StockTransferDialogProps) {
  const [error, setError] = useState<string | null>(null);

  // Filter out current location from destination options
  const availableLocations = locations.filter(
    (loc) => loc.id !== item.locationId && loc.isActive !== false
  );

  const form = useForm({
    defaultValues: {
      toLocationId: "",
      quantity: 1,
      reason: "",
    } as TransferFormValues,
    onSubmit: async ({ value }) => {
      try {
        setError(null);
        await transferSchema.parseAsync(value);

        await onTransfer({
          inventoryId: item.id,
          productId: item.productId,
          fromLocationId: item.locationId,
          toLocationId: value.toLocationId,
          quantity: value.quantity,
          reason: value.reason,
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
          setError("Failed to transfer inventory");
        }
      }
    },
  });

  const handleClose = useCallback(() => {
    setError(null);
    form.reset();
    onClose();
  }, [form, onClose]);

  // Calculate preview values
  const quantity = form.getFieldValue("quantity") ?? 0;
  const toLocationId = form.getFieldValue("toLocationId");
  const toLocation = locations.find((loc) => loc.id === toLocationId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Move Inventory</DialogTitle>
          <DialogDescription>
            Transfer stock from {item.locationName} to another location.
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
          {/* Item Details Section */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="mb-3 text-sm font-medium text-muted-foreground">
              Item Details
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Product Info */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Product</Label>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.productSku}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current Location */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Current Location
                </Label>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.locationName}</span>
                </div>
              </div>
            </div>

            {/* Available Quantity */}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Available to Move:{" "}
                <span className="font-medium text-foreground">
                  {item.quantityAvailable} units
                </span>
              </span>
              <span className="text-muted-foreground">
                On Hand:{" "}
                <span className="font-medium text-foreground">
                  {item.quantityOnHand} units
                </span>
              </span>
            </div>
          </div>

          {/* Transfer Form Fields */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Quantity Field */}
            <form.Field
              name="quantity"
              validators={{
                onChange: ({ value }) => {
                  if (value <= 0) return "Quantity must be greater than 0";
                  if (value > item.quantityAvailable)
                    return `Cannot exceed available quantity (${item.quantityAvailable})`;
                  return undefined;
                },
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity to Move <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={item.quantityAvailable}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(parseInt(e.target.value) || 0)
                    }
                    onBlur={field.handleBlur}
                    disabled={isLoading}
                    aria-describedby="quantity-help"
                  />
                  <p id="quantity-help" className="text-xs text-muted-foreground">
                    Max: {item.quantityAvailable} units
                  </p>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Destination Location */}
            <form.Field
              name="toLocationId"
              validators={{
                onChange: ({ value }) =>
                  value ? undefined : "Destination location is required",
              }}
            >
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="toLocationId">
                    New Location <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    disabled={isLoading || availableLocations.length === 0}
                  >
                    <SelectTrigger id="toLocationId">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLocations.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No other locations available
                        </SelectItem>
                      ) : (
                        availableLocations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} {loc.code ? `(${loc.code})` : ""}
                          </SelectItem>
                        ))
                      )}
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
          </div>

          {/* Reason Field */}
          <form.Field name="reason">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  placeholder="e.g., Reorganization, Picking prep"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  disabled={isLoading}
                />
              </div>
            )}
          </form.Field>

          {/* Movement Preview */}
          {toLocationId && quantity > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="mb-3 text-sm font-medium">Movement Preview</h4>
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{item.locationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantityOnHand} →{" "}
                    <span className="font-medium text-destructive">
                      {item.quantityOnHand - quantity}
                    </span>{" "}
                    units
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-muted-foreground">To</p>
                  <p className="font-medium">
                    {toLocation?.name ?? "Unknown Location"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current inventory will increase by {quantity} units
                  </p>
                </div>
              </div>
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
            <Button
              type="submit"
              disabled={
                isLoading ||
                !form.getFieldValue("toLocationId") ||
                form.getFieldValue("quantity") <= 0
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Move Inventory"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default StockTransferDialog;
