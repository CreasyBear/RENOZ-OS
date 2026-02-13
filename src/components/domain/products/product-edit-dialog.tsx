/**
 * Product Edit Dialog
 *
 * Dialog for editing core product fields. Uses TanStack Form with
 * the same pattern as InventoryItemEditDialog.
 *
 * @see src/components/domain/inventory/inventory-item-edit-dialog.tsx
 */

import { useState, useCallback, useEffect, useMemo, startTransition } from "react";
import { Loader2, Package, Save } from "lucide-react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { updateProductSchema } from "@/lib/schemas/products";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductWithRelations, ProductStatus, TaxType } from "@/lib/schemas/products";
import type { UpdateProduct } from "@/lib/schemas/products";

// ============================================================================
// TYPES
// ============================================================================

export interface ProductEditDialogProps {
  open: boolean;
  onClose: () => void;
  product: ProductWithRelations;
  onSubmit: (data: UpdateProduct) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductEditDialog({
  open,
  onClose,
  product,
  onSubmit,
  isLoading = false,
}: ProductEditDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Use useMemo to properly handle defaults and avoid eslint-disable
  const defaults = useMemo<UpdateProduct>(() => ({
    name: product.name,
    sku: product.sku,
    description: product.description ?? undefined,
    barcode: product.barcode ?? undefined,
    basePrice: product.basePrice ?? 0,
    costPrice: product.costPrice ?? undefined,
    reorderPoint: product.reorderPoint ?? 0,
    reorderQty: product.reorderQty ?? 0,
    status: product.status,
    taxType: product.taxType,
    isActive: product.isActive,
    isSellable: product.isSellable,
    isPurchasable: product.isPurchasable,
    trackInventory: product.trackInventory,
    isSerialized: product.isSerialized,
  }), [product]);

  const form = useTanStackForm<UpdateProduct>({
    schema: updateProductSchema,
    defaultValues: defaults,
    onSubmit: async (value) => {
      setSubmitError(null);
      try {
        await onSubmit(value);
        onClose();
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : "Failed to update product"
        );
      }
    },
    onValidationError: (errors) => {
      const firstError = errors.issues[0];
      setSubmitError(firstError?.message ?? "Validation failed");
    },
  });

  // Reset form to latest product data each time dialog opens
  useEffect(() => {
    if (open) {
      form.reset(defaults);
      startTransition(() => setSubmitError(null));
    }
  }, [open, defaults, form]);

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
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update details for {product.name}
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
              <div className="space-y-2">
                <Label htmlFor="edit-name">
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
                        id="edit-name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
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

              <div className="space-y-2">
                <Label htmlFor="edit-sku">
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
                        id="edit-sku"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <form.Field name="description">
                {(field) => (
                  <Textarea
                    id="edit-description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isLoading}
                    rows={3}
                  />
                )}
              </form.Field>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-barcode">Barcode</Label>
              <form.Field name="barcode">
                {(field) => (
                  <Input
                    id="edit-barcode"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={isLoading}
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
              <div className="space-y-2">
                <Label htmlFor="edit-basePrice">Sell Price ($)</Label>
                <form.Field name="basePrice">
                  {(field) => (
                    <Input
                      id="edit-basePrice"
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
              <div className="space-y-2">
                <Label htmlFor="edit-costPrice">Cost Price ($)</Label>
                <form.Field name="costPrice">
                  {(field) => (
                    <Input
                      id="edit-costPrice"
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

          {/* Inventory Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Inventory
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-reorderPoint">Reorder Point</Label>
                <form.Field name="reorderPoint">
                  {(field) => (
                    <Input
                      id="edit-reorderPoint"
                      type="number"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(parseInt(e.target.value) || 0)
                      }
                      onBlur={field.handleBlur}
                      disabled={isLoading}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reorderQty">Reorder Quantity</Label>
                <form.Field name="reorderQty">
                  {(field) => (
                    <Input
                      id="edit-reorderQty"
                      type="number"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(parseInt(e.target.value) || 0)
                      }
                      onBlur={field.handleBlur}
                      disabled={isLoading}
                    />
                  )}
                </form.Field>
              </div>
            </div>
          </div>

          {/* Status & Tax */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Status & Tax
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <form.Field name="status">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as ProductStatus)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="discontinued">
                          Discontinued
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <form.Field name="taxType">
                  {(field) => (
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as TaxType)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gst">GST</SelectItem>
                        <SelectItem value="gst_free">GST Free</SelectItem>
                        <SelectItem value="exempt">Exempt</SelectItem>
                        <SelectItem value="input_taxed">
                          Input Taxed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>
            </div>
          </div>

          {/* Settings Flags */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Settings
            </h4>
            <div className="space-y-4">
              <form.Field name="isActive">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Product is available for operations
                      </p>
                    </div>
                    <Switch
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
                      <Label>Sellable</Label>
                      <p className="text-xs text-muted-foreground">
                        Product can be added to quotes and orders
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isPurchasable">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Purchasable</Label>
                      <p className="text-xs text-muted-foreground">
                        Product can be ordered from suppliers
                      </p>
                    </div>
                    <Switch
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
                      <Label>Track Inventory</Label>
                      <p className="text-xs text-muted-foreground">
                        Track stock levels for this product
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="isSerialized">
                {(field) => (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Serialized</Label>
                      <p className="text-xs text-muted-foreground">
                        Track individual serial numbers
                      </p>
                    </div>
                    <Switch
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
