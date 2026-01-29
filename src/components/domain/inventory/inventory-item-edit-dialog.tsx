/**
 * Inventory Item Edit Dialog
 *
 * Dialog for editing inventory item details (product information).
 * Updates the associated product data.
 *
 * ARCHITECTURE: Presenter Component - receives data via props, no direct data fetching.
 *
 * @see STANDARDS.md for container/presenter pattern
 * @see _Initiation/_prd/2-domains/inventory/inventory.prd.json
 */

import { useState, useCallback } from "react";
import { Loader2, Package, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { UpdateProduct } from "@/lib/schemas/products";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryItemEditDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Product data to edit */
  product: {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    barcode?: string | null;
    basePrice: number;
    costPrice?: number | null;
    weight?: number | null;
    isActive: boolean;
    isSellable: boolean;
    trackInventory: boolean;
  };
  /** Callback when form is submitted */
  onSubmit: (data: UpdateProduct) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Inventory Item Edit Dialog
 *
 * @source product from parent container (inventory item detail)
 * @source onSubmit callback from parent container (useUpdateProduct mutation)
 */
export function InventoryItemEditDialog({
  open,
  onClose,
  product,
  onSubmit,
  isLoading = false,
}: InventoryItemEditDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      barcode: product.barcode ?? "",
      basePrice: product.basePrice,
      costPrice: product.costPrice ?? 0,
      weight: product.weight ?? 0,
      isActive: product.isActive,
      isSellable: product.isSellable,
      trackInventory: product.trackInventory,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await onSubmit({
          sku: value.sku,
          name: value.name,
          description: value.description || undefined,
          barcode: value.barcode || undefined,
          basePrice: value.basePrice,
          costPrice: value.costPrice || undefined,
          weight: value.weight || undefined,
          isActive: value.isActive,
          isSellable: value.isSellable,
          trackInventory: value.trackInventory,
        });
        onClose();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to update item");
      }
    },
  });

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setSubmitError(null);
      onClose();
    }
  }, [isLoading, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update product details for {product.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-6 py-4"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {/* SKU */}
              <div className="space-y-2">
                <Label htmlFor="sku">
                  SKU <span className="text-destructive">*</span>
                </Label>
                <form.Field
                  name="sku"
                  validators={{
                    onSubmit: ({ value }) =>
                      !value ? "SKU is required" : undefined,
                  }}
                >
                  {(field) => (
                    <div className="space-y-1">
                      <Input
                        id="sku"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="Enter SKU"
                        disabled={isLoading}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">
                          {field.state.meta.errors[0]}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <form.Field name="barcode">
                  {(field) => (
                    <Input
                      id="barcode"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter barcode"
                      disabled={isLoading}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <form.Field
                name="name"
                validators={{
                  onSubmit: ({ value }) =>
                    !value ? "Name is required" : undefined,
                }}
              >
                {(field) => (
                  <div className="space-y-1">
                    <Input
                      id="name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter product name"
                      disabled={isLoading}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-xs text-destructive">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <form.Field name="description">
                {(field) => (
                  <Textarea
                    id="description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Enter product description"
                    disabled={isLoading}
                    rows={3}
                  />
                )}
              </form.Field>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pricing
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Base Price */}
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <form.Field name="basePrice">
                  {(field) => (
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                      onBlur={field.handleBlur}
                      disabled={isLoading}
                    />
                  )}
                </form.Field>
              </div>

              {/* Cost Price */}
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price ($)</Label>
                <form.Field name="costPrice">
                  {(field) => (
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                      onBlur={field.handleBlur}
                      disabled={isLoading}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>

          {/* Physical Attributes */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Physical Attributes
            </h4>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <form.Field name="weight">
                {(field) => (
                  <Input
                    id="weight"
                    type="number"
                    step="0.001"
                    min="0"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(parseFloat(e.target.value) || 0)
                    }
                    onBlur={field.handleBlur}
                    disabled={isLoading}
                  />
                )}
              </form.Field>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Settings
            </h4>

            <div className="space-y-4">
              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isActive">Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Item is available for operations
                      </p>
                    </div>
                    <Switch
                      id="isActive"
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isSellable">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isSellable">Sellable</Label>
                      <p className="text-xs text-muted-foreground">
                        Item can be sold to customers
                      </p>
                    </div>
                    <Switch
                      id="isSellable"
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="trackInventory">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="trackInventory">Track Inventory</Label>
                      <p className="text-xs text-muted-foreground">
                        Track stock levels for this item
                      </p>
                    </div>
                    <Switch
                      id="trackInventory"
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {submitError}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
