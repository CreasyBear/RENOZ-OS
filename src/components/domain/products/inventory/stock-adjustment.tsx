/**
 * StockAdjustment Component
 *
 * Dialog for adjusting inventory levels with reason tracking.
 */
import { useState, useEffect, useMemo } from "react";
import { useTanStackForm } from "@/hooks/_shared/use-tanstack-form";
import { z } from "zod";
import { Plus, Minus, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPendingDialogInteractionGuards,
  createPendingDialogOpenChangeHandler,
} from "@/components/ui/dialog-pending-guards";
import { FormFieldDisplayProvider } from "@/components/shared/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdjustStock, useReceiveStock, useInventoryLocations } from "@/hooks/products";

interface StockAdjustmentProps {
  productId: string;
  productName: string;
  currentStock: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted?: () => void;
  defaultLocationId?: string;
}

const adjustmentSchema = z.object({
  locationId: z.string().uuid("Select a location"),
  adjustmentType: z.enum(["add", "subtract", "set"]),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required").max(500),
  notes: z.string().max(500).optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

const reasonPresets = [
  { value: "cycle_count", label: "Cycle Count Adjustment" },
  { value: "damaged", label: "Damaged Goods" },
  { value: "theft", label: "Theft/Shrinkage" },
  { value: "found", label: "Found Stock" },
  { value: "return", label: "Customer Return" },
  { value: "correction", label: "Data Correction" },
  { value: "other", label: "Other" },
];

export function StockAdjustment({
  productId,
  productName,
  currentStock,
  open,
  onOpenChange,
  onAdjusted,
  defaultLocationId,
}: StockAdjustmentProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const { data: locationsData, isLoading: isLoadingLocations } = useInventoryLocations({
    enabled: open,
  });
  const adjustStockMutation = useAdjustStock();
  const receiveStockMutation = useReceiveStock();

  const locations = useMemo(() => locationsData?.locations ?? [], [locationsData]);
  const isSaving = adjustStockMutation.isPending || receiveStockMutation.isPending;

  const defaultLocation = useMemo(() => {
    if (locations.length === 0) return undefined;
    return defaultLocationId
      ? locations.find((l) => l.id === defaultLocationId)
      : locations[0];
  }, [locations, defaultLocationId]);

  const form = useTanStackForm<AdjustmentFormData>({
    schema: adjustmentSchema,
    defaultValues: {
      locationId: defaultLocation?.id ?? "",
      adjustmentType: "add",
      quantity: 1,
      reason: "",
      notes: "",
    },
    onSubmit: async (data) => {
      setError(null);

      const onSuccess = () => {
        onAdjusted?.();
        onOpenChange(false);
      };

      const onError = (err: Error) => {
        setError(err.message || "Failed to adjust stock");
      };

      switch (data.adjustmentType) {
        case "add":
          receiveStockMutation.mutate(
            {
              productId,
              locationId: data.locationId,
              quantity: data.quantity,
              notes: `${data.reason}${data.notes ? ` - ${data.notes}` : ""}`,
            },
            { onSuccess, onError }
          );
          return;

        case "subtract":
          adjustStockMutation.mutate(
            {
              productId,
              locationId: data.locationId,
              adjustmentQty: -data.quantity,
              reason: data.reason,
              notes: data.notes,
            },
            { onSuccess, onError }
          );
          return;

        case "set":
          adjustStockMutation.mutate(
            {
              productId,
              locationId: data.locationId,
              adjustmentQty: data.quantity - currentStock,
              reason: data.reason,
              notes: data.notes,
            },
            { onSuccess, onError }
          );
          return;

        default:
          adjustStockMutation.mutate(
            {
              productId,
              locationId: data.locationId,
              adjustmentQty: data.quantity,
              reason: data.reason,
              notes: data.notes,
            },
            { onSuccess, onError }
          );
      }
    },
    onSubmitInvalid: () => {},
  });

  const adjustmentType = form.useWatch("adjustmentType");
  const quantity = form.useWatch("quantity");

  // Set default location when locations load
  useEffect(() => {
    if (defaultLocation && open && !form.getValues().locationId) {
      form.setFieldValue("locationId", defaultLocation.id);
    }
  }, [defaultLocation, open, form]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        locationId: defaultLocation?.id ?? "",
        adjustmentType: "add",
        quantity: 1,
        reason: "",
        notes: "",
      });
      setSelectedPreset("");
      setError(null);
    }
  }, [open, defaultLocation?.id, form]);

  const getPreviewQuantity = () => {
    if (!quantity || quantity <= 0) return currentStock;
    switch (adjustmentType) {
      case "add":
        return currentStock + quantity;
      case "subtract":
        return Math.max(0, currentStock - quantity);
      case "set":
        return quantity;
      default:
        return currentStock;
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetItem = reasonPresets.find((p) => p.value === preset);
    if (presetItem && preset !== "other") {
      form.setFieldValue("reason", presetItem.label);
    } else {
      form.setFieldValue("reason", "");
    }
  };

  const previewQty = getPreviewQuantity();
  const willGoNegative = previewQty < 0;

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      form.reset({
        locationId: defaultLocation?.id ?? "",
        adjustmentType: "add",
        quantity: 1,
        reason: "",
        notes: "",
      });
      setSelectedPreset("");
      setError(null);
    }
  };

  const pendingInteractionGuards = createPendingDialogInteractionGuards(isSaving);
  const handleDialogOpenChange = createPendingDialogOpenChangeHandler(isSaving, handleOpenChange);

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={pendingInteractionGuards.onEscapeKeyDown}
        onInteractOutside={pendingInteractionGuards.onInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Adjust inventory for {productName}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <FormFieldDisplayProvider form={form}>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Stock</span>
                <span className="text-xl font-bold">{currentStock}</span>
              </div>
            </div>

            <form.Field name="locationId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Location</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v)}
                    disabled={isLoadingLocations}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={isLoadingLocations ? "Loading..." : "Select location"} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.locationCode} - {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="adjustmentType">
              {(field) => (
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.state.value === "add" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.handleChange("add")}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant={field.state.value === "subtract" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.handleChange("subtract")}
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Subtract
                    </Button>
                    <Button
                      type="button"
                      variant={field.state.value === "set" ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.handleChange("set")}
                      className="flex-1"
                    >
                      Set To
                    </Button>
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="quantity">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Quantity</Label>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value ? parseInt(e.target.value, 10) : 1
                      )
                    }
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>

            <div
              className={`p-3 rounded-lg border ${willGoNegative ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">New Stock Level</span>
                <span
                  className={`text-xl font-bold ${willGoNegative ? "text-red-600" : "text-green-600"}`}
                >
                  {previewQty}
                </span>
              </div>
              {willGoNegative && (
                <div className="flex items-center gap-1 mt-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs">Stock will go negative</span>
                </div>
              )}
            </div>

            <form.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Select
                    value={selectedPreset}
                    onValueChange={handlePresetChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonPresets.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPreset === "other" && (
                    <Input
                      placeholder="Enter reason..."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  )}
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Additional Notes (Optional)</Label>
                  <Textarea
                    id={field.name}
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Add any additional details..."
                    rows={2}
                  />
                </div>
              )}
            </form.Field>
          </FormFieldDisplayProvider>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingLocations}>
              {isSaving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Adjust Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
