/**
 * StockAdjustment Component
 *
 * Dialog for adjusting inventory levels with reason tracking.
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adjustStock, receiveStock, listLocations } from "@/lib/server/functions/product-inventory";

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

interface Location {
  id: string;
  code: string;
  name: string;
}

export function StockAdjustment({
  productId,
  productName,
  currentStock,
  open,
  onOpenChange,
  onAdjusted,
  defaultLocationId,
}: StockAdjustmentProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustmentType: "add",
      quantity: 1,
      reason: "",
      notes: "",
    },
  });

  const adjustmentType = watch("adjustmentType");
  const quantity = watch("quantity");

  // Calculate preview
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

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      setIsLoadingLocations(true);
      try {
        const result = await listLocations({ data: { isActive: true } });
        setLocations(result.locations as Location[]);
        // Set default location
        if (result.locations.length > 0) {
          const defaultLoc = defaultLocationId
            ? result.locations.find((l: Location) => l.id === defaultLocationId)
            : result.locations[0];
          if (defaultLoc) {
            setValue("locationId", defaultLoc.id);
          }
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    if (open) {
      loadLocations();
    }
  }, [open, defaultLocationId, setValue]);


  // Handle preset selection
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const presetItem = reasonPresets.find((p) => p.value === preset);
    if (presetItem && preset !== "other") {
      setValue("reason", presetItem.label);
    } else {
      setValue("reason", "");
    }
  };

  // Handle submit
  const onSubmit = async (data: AdjustmentFormData) => {
    setIsSaving(true);
    setError(null);

    try {
      let adjustmentQty: number;

      switch (data.adjustmentType) {
        case "add":
          // Use receiveStock for additions
          await receiveStock({
            data: {
              productId,
              locationId: data.locationId,
              quantity: data.quantity,
              notes: `${data.reason}${data.notes ? ` - ${data.notes}` : ""}`,
            },
          });
          onAdjusted?.();
          onOpenChange(false);
          return;

        case "subtract":
          adjustmentQty = -data.quantity;
          break;

        case "set":
          adjustmentQty = data.quantity - currentStock;
          break;

        default:
          adjustmentQty = data.quantity;
      }

      await adjustStock({
        data: {
          productId,
          locationId: data.locationId,
          adjustmentQty,
          reason: data.reason,
          notes: data.notes,
        },
      });

      onAdjusted?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to adjust stock:", err);
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setIsSaving(false);
    }
  };

  const previewQty = getPreviewQuantity();
  const willGoNegative = previewQty < 0;

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      reset({
        adjustmentType: "add",
        quantity: 1,
        reason: "",
        notes: "",
      });
      setSelectedPreset("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Adjust inventory for {productName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current stock display */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Stock</span>
              <span className="text-xl font-bold">{currentStock}</span>
            </div>
          </div>

          {/* Location selection */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={watch("locationId")}
              onValueChange={(value) => setValue("locationId", value)}
              disabled={isLoadingLocations}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingLocations ? "Loading..." : "Select location"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.code} - {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.locationId && (
              <p className="text-sm text-destructive">{errors.locationId.message}</p>
            )}
          </div>

          {/* Adjustment type */}
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === "add" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("adjustmentType", "add")}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "subtract" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("adjustmentType", "subtract")}
                className="flex-1"
              >
                <Minus className="h-4 w-4 mr-1" />
                Subtract
              </Button>
              <Button
                type="button"
                variant={adjustmentType === "set" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("adjustmentType", "set")}
                className="flex-1"
              >
                Set To
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              {...register("quantity", { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg border ${willGoNegative ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Stock Level</span>
              <span className={`text-xl font-bold ${willGoNegative ? "text-red-600" : "text-green-600"}`}>
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

          {/* Reason preset */}
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
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
                {...register("reason")}
              />
            )}
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              rows={2}
              {...register("notes")}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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
