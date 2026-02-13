/**
 * ProductBulkOperations Component
 *
 * Panel for performing bulk operations on selected products.
 * Includes bulk update status, update prices, delete, and export.
 */
import { useState } from "react";
import {
  Trash2,
  Download,
  DollarSign,
  Tag,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useBulkUpdateProducts,
  useBulkAdjustPrices,
  useBulkDeleteProducts,
  useExportProducts,
} from "@/hooks/products";
import { toastError } from "@/hooks";

interface ProductBulkOperationsProps {
  selectedIds: string[];
  onComplete?: () => void;
  onClearSelection?: () => void;
}

type BulkOperation = "status" | "prices" | "delete" | null;

export function ProductBulkOperations({
  selectedIds,
  onComplete,
  onClearSelection,
}: ProductBulkOperationsProps) {
  const [activeOperation, setActiveOperation] = useState<BulkOperation>(null);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const bulkUpdate = useBulkUpdateProducts();
  const bulkAdjustPrices = useBulkAdjustPrices();
  const bulkDelete = useBulkDeleteProducts();
  const exportProducts = useExportProducts();

  const isProcessing =
    bulkUpdate.isPending ||
    bulkAdjustPrices.isPending ||
    bulkDelete.isPending ||
    exportProducts.isPending;

  // Status update state
  const [newStatus, setNewStatus] = useState<string>("active");

  // Price update state
  const [priceUpdateType, setPriceUpdateType] = useState<"percentage" | "fixed">("percentage");
  const [priceValue, setPriceValue] = useState<string>("");
  const [priceField, setPriceField] = useState<"basePrice" | "costPrice">("basePrice");

  // Reset state
  const resetState = () => {
    setActiveOperation(null);
    setError(null);
    setNewStatus("active");
    setPriceUpdateType("percentage");
    setPriceValue("");
    setPriceField("basePrice");
  };

  // Handle bulk status update
  const handleStatusUpdate = () => {
    setError(null);

    bulkUpdate.mutate(
      {
        productIds: selectedIds,
        updates: { status: newStatus as "active" | "inactive" | "discontinued" },
      },
      {
        onSuccess: () => {
          resetState();
          onComplete?.();
          onClearSelection?.();
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : "Failed to update products";
          toastError(errorMessage);
          setError(errorMessage);
        },
      }
    );
  };

  // Handle bulk price update
  const handlePriceUpdate = () => {
    const numValue = parseFloat(priceValue);
    if (isNaN(numValue)) {
      setError("Please enter a valid number");
      return;
    }

    setError(null);

    // Build adjustment object based on type
    const adjustment = priceUpdateType === "percentage"
      ? {
          type: "percentage" as const,
          value: numValue,
          applyTo: priceField === "basePrice" ? "basePrice" as const : "costPrice" as const,
        }
      : {
          type: "fixed" as const,
          [priceField]: numValue,
        };

    bulkAdjustPrices.mutate(
      {
        productIds: selectedIds,
        adjustment,
      },
      {
        onSuccess: () => {
          resetState();
          onComplete?.();
          onClearSelection?.();
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : "Failed to update prices";
          toastError(errorMessage);
          setError(errorMessage);
        },
      }
    );
  };

  // Handle bulk delete
  const handleDelete = () => {
    setError(null);

    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        resetState();
        onComplete?.();
        onClearSelection?.();
      },
      onError: (err) => {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete products";
        toastError(errorMessage);
        setError(errorMessage);
      },
    });
  };

  // Handle export
  const handleExport = () => {
    setError(null);

    exportProducts.mutate(
      {
        productIds: selectedIds.length > 0 ? selectedIds : undefined,
      },
      {
        onSuccess: (result) => {
          // Download the file
          const data = result as { content: string; filename: string };
          const blob = new Blob([data.content], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = data.filename;
          a.click();
          URL.revokeObjectURL(url);
        },
        onError: (err) => {
          const errorMessage = err instanceof Error ? err.message : "Failed to export products";
          toastError(errorMessage);
          setError(errorMessage);
        },
      }
    );
  };

  if (selectedIds.length < 2) {
    return null;
  }

  return (
    <>
      {/* Bulk actions bar */}
      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
        <Badge variant="secondary" className="text-sm">
          {selectedIds.length} selected
        </Badge>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveOperation("status")}
          >
            <Tag className="h-4 w-4 mr-2" />
            Update Status
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveOperation("prices")}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Update Prices
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveOperation("delete")}>
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                <span className="text-red-600">Delete Selected</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearSelection}>
                Clear Selection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={activeOperation === "status"} onOpenChange={(open) => !open && resetState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Product Status</DialogTitle>
            <DialogDescription>
              Change the status for {selectedIds.length} selected product{selectedIds.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetState} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={isProcessing}>
              {isProcessing ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Update Dialog */}
      <Dialog open={activeOperation === "prices"} onOpenChange={(open) => !open && resetState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Product Prices</DialogTitle>
            <DialogDescription>
              Adjust prices for {selectedIds.length} selected product{selectedIds.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Price Field</Label>
              <Select value={priceField} onValueChange={(v) => setPriceField(v as "basePrice" | "costPrice")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basePrice">Base Price</SelectItem>
                  <SelectItem value="costPrice">Cost Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <RadioGroup
                value={priceUpdateType}
                onValueChange={(v) => setPriceUpdateType(v as "percentage" | "fixed")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="cursor-pointer">
                    Percentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="cursor-pointer">
                    Fixed Amount
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>
                {priceUpdateType === "percentage" ? "Percentage Change" : "Amount to Add/Subtract"}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step={priceUpdateType === "percentage" ? "0.1" : "0.01"}
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  placeholder={priceUpdateType === "percentage" ? "e.g., 10 or -5" : "e.g., 5.00 or -2.50"}
                />
                <span className="text-muted-foreground">
                  {priceUpdateType === "percentage" ? "%" : "$"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use positive values to increase, negative to decrease
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetState} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handlePriceUpdate} disabled={isProcessing || !priceValue}>
              {isProcessing ? "Updating..." : "Update Prices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={activeOperation === "delete"} onOpenChange={(open) => !open && resetState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Products
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Deleting products will:
              </p>
              <ul className="text-sm text-amber-800 mt-2 ml-4 list-disc">
                <li>Remove them from the catalog</li>
                <li>Remove associated pricing and attributes</li>
                <li>Break any bundle associations</li>
              </ul>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetState} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
              {isProcessing ? "Deleting..." : `Delete ${selectedIds.length} Product${selectedIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
