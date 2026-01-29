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

import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Truck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useSuppliers, useCreatePurchaseOrder } from "@/hooks/suppliers";
import type { ReorderRecommendation } from "./reorder-recommendations";

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

const createPOSchema = z.object({
  supplierId: z.string().min(1, "Select a supplier"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.number().positive("Price must be positive"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof createPOSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Create Purchase Order from Recommendation Dialog
 *
 * Presenter component - receives data via props, no direct data fetching.
 */
export function CreatePOFromRecommendationDialog({
  recommendation,
  open,
  onOpenChange,
  onSuccess,
}: CreatePOFromRecommendationDialogProps) {
  const [error, setError] = useState<string | null>(null);

  // Fetch suppliers for dropdown
  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({
    enabled: open,
  });
  const suppliers = suppliersData?.items ?? [];

  // PO creation mutation
  const createPO = useCreatePurchaseOrder();

  // Default quantity from recommendation
  const defaultQuantity = recommendation?.recommendedQuantity ?? 10;

  const form = useForm<FormValues>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      supplierId: "",
      quantity: defaultQuantity,
      unitPrice: 0,
      notes: "",
    },
  });

  // Reset form when recommendation changes
  useEffect(() => {
    if (recommendation && open) {
      form.reset({
        supplierId: "",
        quantity: recommendation.recommendedQuantity,
        unitPrice: 0,
        notes: `Auto-generated from reorder recommendation. Current stock: ${recommendation.currentStock}, Recommended: ${recommendation.recommendedQuantity}`,
      });
      setError(null);
    }
  }, [recommendation, open, form]);

  const onSubmit = async (values: FormValues) => {
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
        ).toISOString(), // Default 2 weeks
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create purchase order");
    }
  };

  const getUrgencyColor = (urgency: string) => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a PO for {recommendation?.productName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {recommendation && (
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{recommendation.productName}</span>
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
                <span className="font-medium">{recommendation.recommendedQuantity}</span>
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">
              Supplier <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.watch("supplierId")}
              onValueChange={(value) => form.setValue("supplierId", value)}
              disabled={loadingSuppliers || createPO.isPending}
            >
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Select a supplier" />
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
              <p className="text-xs text-destructive">
                {form.formState.errors.supplierId.message}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...form.register("quantity", { valueAsNumber: true })}
              disabled={createPO.isPending}
            />
            {form.formState.errors.quantity && (
              <p className="text-xs text-destructive">
                {form.formState.errors.quantity.message}
              </p>
            )}
          </div>

          {/* Unit Price */}
          <div className="space-y-2">
            <Label htmlFor="unitPrice">
              Unit Price ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              min={0.01}
              {...form.register("unitPrice", { valueAsNumber: true })}
              disabled={createPO.isPending}
            />
            {form.formState.errors.unitPrice && (
              <p className="text-xs text-destructive">
                {form.formState.errors.unitPrice.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register("notes")}
              disabled={createPO.isPending}
              rows={3}
              placeholder="Optional notes for this purchase order"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createPO.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createPO.isPending || loadingSuppliers}>
              {createPO.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Create Purchase Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
