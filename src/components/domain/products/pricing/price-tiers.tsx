/**
 * PriceTiers Component
 *
 * Manages volume-based pricing tiers with add/edit/delete functionality.
 */
import { useState, useCallback } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FormDialog,
  NumberField,
  SwitchField,
} from "@/components/shared/forms";
import {
  useCreatePriceTier,
  useUpdatePriceTier,
  useDeletePriceTier,
} from "@/hooks/products";
import type { PriceTier } from "@/lib/schemas/products";

// Tier form schema
const tierFormSchema = z.object({
  minQuantity: z.number().int().positive("Must be at least 1"),
  maxQuantity: z.number().int().positive().optional().nullable(),
  price: z.number().min(0, "Price cannot be negative").optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  isActive: z.boolean(),
}).refine(
  (data) => !data.maxQuantity || data.maxQuantity > data.minQuantity,
  { message: "Max quantity must be greater than min quantity", path: ["maxQuantity"] }
).refine(
  (data) => data.price != null || data.discountPercent != null,
  { message: "Either price or discount percentage is required", path: ["price"] }
);

type TierFormValues = z.infer<typeof tierFormSchema>;

interface PriceTiersProps {
  productId: string;
  basePrice: number;
  tiers: PriceTier[];
  onTiersChange?: () => void;
}

// Format price as currency
function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(price);
}

export function PriceTiers({ productId, basePrice, tiers, onTiersChange }: PriceTiersProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<PriceTier | null>(null);
  const [deletingTier, setDeletingTier] = useState<PriceTier | null>(null);

  // Use mutation hooks
  const createMutation = useCreatePriceTier();
  const updateMutation = useUpdatePriceTier();
  const deleteMutation = useDeletePriceTier();

  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // Sort tiers by min quantity
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  const getDefaultValues = useCallback(
    (tier?: PriceTier | null): TierFormValues => ({
      minQuantity: tier?.minQuantity ?? (sortedTiers.length > 0
        ? (sortedTiers[sortedTiers.length - 1].maxQuantity ?? sortedTiers[sortedTiers.length - 1].minQuantity) + 1
        : 2),
      maxQuantity: tier?.maxQuantity ?? null,
      price: tier?.price ?? null,
      discountPercent: tier?.discountPercent ?? null,
      isActive: tier?.isActive ?? true,
    }),
    [sortedTiers]
  );

  const form = useTanStackForm<TierFormValues>({
    schema: tierFormSchema,
    defaultValues: getDefaultValues(),
    onSubmit: (data) => {
      const tierData = {
        ...data,
        maxQuantity: data.maxQuantity ?? undefined,
        price: data.price ?? undefined,
        discountPercent: data.discountPercent ?? undefined,
      };
      if (editingTier) {
        updateMutation.mutate(
          { id: editingTier.id, ...tierData },
          {
            onSuccess: () => {
              setIsDialogOpen(false);
              onTiersChange?.();
            },
          }
        );
      } else {
        createMutation.mutate(
          { productId, ...tierData },
          {
            onSuccess: () => {
              setIsDialogOpen(false);
              onTiersChange?.();
            },
          }
        );
      }
    },
    onSubmitInvalid: () => {},
  });

  const watchPrice = form.useWatch("price");
  const watchDiscount = form.useWatch("discountPercent");

  // Open dialog for new tier
  const handleAdd = () => {
    setEditingTier(null);
    form.reset(getDefaultValues());
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (tier: PriceTier) => {
    setEditingTier(tier);
    form.reset(getDefaultValues(tier));
    setIsDialogOpen(true);
  };

  // Delete tier
  const handleDelete = () => {
    if (!deletingTier) return;
    deleteMutation.mutate(deletingTier.id, {
      onSuccess: () => {
        setDeletingTier(null);
        onTiersChange?.();
      },
    });
  };

  // Calculate effective price for a tier
  const getEffectivePrice = (tier: PriceTier): number => {
    if (tier.price !== null) return tier.price;
    if (tier.discountPercent !== null) {
      return basePrice * (1 - tier.discountPercent / 100);
    }
    return basePrice;
  };

  // Check for tier overlaps
  const hasOverlaps = (): boolean => {
    for (let i = 0; i < sortedTiers.length - 1; i++) {
      const current = sortedTiers[i];
      const next = sortedTiers[i + 1];
      if (current.maxQuantity === null || current.maxQuantity >= next.minQuantity) {
        return true;
      }
    }
    return false;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Volume Pricing</CardTitle>
            <CardDescription>
              Set different prices based on order quantity
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          {hasOverlaps() && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Some price tiers have overlapping quantity ranges
              </span>
            </div>
          )}

          {sortedTiers.length === 0 ? (
            <EmptyState
              title="No price tiers"
              message="Add volume-based pricing tiers to offer discounts for bulk purchases"
              primaryAction={{
                label: "Add Price Tier",
                onClick: handleAdd,
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quantity Range</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Savings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Base price row */}
                <TableRow className="bg-muted/50">
                  <TableCell>1 - {sortedTiers[0]?.minQuantity - 1 || "∞"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(basePrice)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell>
                    <Badge variant="outline">Base</Badge>
                  </TableCell>
                  <TableCell />
                </TableRow>

                {/* Tier rows */}
                {sortedTiers.map((tier) => {
                  const effectivePrice = getEffectivePrice(tier);
                  const savings = basePrice - effectivePrice;
                  const savingsPercent = (savings / basePrice) * 100;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        {tier.minQuantity} - {tier.maxQuantity ?? "∞"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(effectivePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {tier.discountPercent ? `${tier.discountPercent}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {savings > 0 ? `${savingsPercent.toFixed(0)}% off` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tier.isActive ? "default" : "secondary"}>
                          {tier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(tier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeletingTier(tier)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <FormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingTier ? "Edit Price Tier" : "Add Price Tier"}
        description={
          editingTier
            ? "Modify the quantity range and pricing for this tier"
            : "Set up a new volume-based pricing tier"
        }
        form={form}
        submitLabel={editingTier ? "Update Tier" : "Create Tier"}
        cancelLabel="Cancel"
        loadingLabel="Saving..."
        submitError={(createMutation.error ?? updateMutation.error)?.message ?? null}
        submitDisabled={isSubmitting}
        className="sm:max-w-[500px]"
      >
        {/* Quantity Range */}
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="minQuantity">
            {(field) => (
              <NumberField
                field={field}
                label="Min Quantity"
                min={1}
                required
              />
            )}
          </form.Field>
          <form.Field name="maxQuantity">
            {(field) => (
              <NumberField
                field={field}
                label="Max Quantity"
                min={1}
                placeholder="Unlimited"
              />
            )}
          </form.Field>
        </div>

        {/* Pricing Options */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set either a fixed price or a discount percentage (not both)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="price">
              {(field) => (
                <NumberField
                  field={field}
                  label="Fixed Price"
                  min={0}
                  step={0.01}
                  prefix="$"
                  placeholder={formatPrice(basePrice)}
                  disabled={watchDiscount != null && watchDiscount > 0}
                />
              )}
            </form.Field>
            <form.Field name="discountPercent">
              {(field) => (
                <NumberField
                  field={field}
                  label="Discount %"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="e.g. 10"
                  disabled={watchPrice != null && watchPrice > 0}
                />
              )}
            </form.Field>
          </div>

          {/* Preview */}
          {(watchPrice || watchDiscount) && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Effective price:{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(
                    watchPrice ?? basePrice * (1 - (watchDiscount ?? 0) / 100)
                  )}
                </span>
                {watchDiscount && (
                  <span className="text-green-600 ml-2">
                    ({watchDiscount}% off)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Active Status */}
        <form.Field name="isActive">
          {(field) => (
            <SwitchField
              field={field}
              label="Active"
              description="Inactive tiers are not applied during pricing"
            />
          )}
        </form.Field>
      </FormDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTier} onOpenChange={() => setDeletingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tier for quantities{" "}
              {deletingTier?.minQuantity} - {deletingTier?.maxQuantity ?? "∞"}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
