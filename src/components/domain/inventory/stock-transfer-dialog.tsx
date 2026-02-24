/**
 * Stock Transfer Dialog
 *
 * Dialog for transferring inventory between warehouse locations.
 * Follows DOM-INV-002c wireframe specifications.
 *
 * @see docs/design-system/FORM-STANDARDS.md
 * @see _Initiation/_prd/2-domains/inventory/wireframes/INV-002c.wireframe.md
 */

import { useState, useCallback } from "react";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import {
  FormDialog,
  NumberField,
  SelectField,
  TextField,
} from "@/components/shared/forms";
import {
  stockTransferFormSchema,
  type StockTransferFormValues,
} from "@/lib/schemas/inventory/stock-transfer-form";
import { Label } from "@/components/ui/label";
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
    isSerialized?: boolean;
    serialNumber?: string | null;
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
  serialNumbers?: string[];
  reason?: string;
}

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

  const form = useTanStackForm<StockTransferFormValues>({
    schema: stockTransferFormSchema,
    defaultValues: {
      toLocationId: "",
      quantity: 1,
      reason: "",
    },
    onSubmit: async (values) => {
      try {
        setError(null);

        await onTransfer({
          inventoryId: item.id,
          productId: item.productId,
          fromLocationId: item.locationId,
          toLocationId: values.toLocationId,
          quantity: item.isSerialized ? 1 : values.quantity,
          serialNumbers: item.isSerialized && item.serialNumber ? [item.serialNumber] : undefined,
          reason: values.reason,
        });

        form.reset();
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to transfer inventory");
        }
      }
    },
    onSubmitInvalid: () => {
      setError("Please fix the errors below and try again");
    },
  });

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        if (isLoading) return;
        setError(null);
        form.reset();
        onClose();
      }
    },
    [form, isLoading, onClose]
  );

  // Calculate preview values
  const quantity = form.state.values.quantity ?? 0;
  const toLocationId = form.state.values.toLocationId;
  const toLocation = locations.find((loc) => loc.id === toLocationId);

  const locationOptions = availableLocations.map((loc) => ({
    value: loc.id,
    label: `${loc.name} ${loc.code ? `(${loc.code})` : ""}`,
  }));

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Move Inventory"
      description={`Transfer stock from ${item.locationName} to another location.`}
      form={form}
      submitLabel="Transfer"
      submitError={error}
      submitDisabled={isLoading}
      size="md"
      className="sm:max-w-[600px]"
      resetOnClose={false}
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
        <form.Field
          name="quantity"
          validators={{
            onChange: ({ value }) => {
              if (item.isSerialized && value !== 1) return "Serialized items can only move one unit per transfer";
              if (value <= 0) return "Quantity must be greater than 0";
              if (value > item.quantityAvailable)
                return `Cannot exceed available quantity (${item.quantityAvailable})`;
              return undefined;
            },
          }}
        >
          {(field) => (
            <NumberField
              field={field}
              label="Quantity to Move"
              min={1}
              max={item.isSerialized ? 1 : item.quantityAvailable}
              required
              disabled={isLoading || item.isSerialized}
              description={
                item.isSerialized
                  ? `Serialized transfer for ${item.serialNumber ?? "selected serial"}`
                  : `Max: ${item.quantityAvailable} units`
              }
            />
          )}
        </form.Field>

        <form.Field
          name="toLocationId"
          validators={{
            onChange: ({ value }) =>
              value ? undefined : "Destination location is required",
          }}
        >
          {(field) => (
            <SelectField
              field={field}
              label="New Location"
              placeholder={
                availableLocations.length === 0
                  ? "No other locations available"
                  : "Select destination..."
              }
              options={locationOptions}
              required
              disabled={isLoading || availableLocations.length === 0}
            />
          )}
        </form.Field>
      </div>

      {/* Reason Field */}
      <form.Field name="reason">
        {(field) => (
          <TextField
            field={field}
            label="Reason (Optional)"
            placeholder="e.g., Reorganization, Picking prep"
            disabled={isLoading}
          />
        )}
      </form.Field>

          {/* Movement Preview */}
          {toLocationId && (item.isSerialized ? 1 : quantity) > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="mb-3 text-sm font-medium">Movement Preview</h4>
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{item.locationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantityOnHand} →{" "}
                    <span className="font-medium text-destructive">
                      {item.quantityOnHand - (item.isSerialized ? 1 : quantity)}
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
                    Current inventory will increase by {item.isSerialized ? 1 : quantity} units
                  </p>
                </div>
              </div>
            </div>
          )}
    </FormDialog>
  );
}

export default StockTransferDialog;
