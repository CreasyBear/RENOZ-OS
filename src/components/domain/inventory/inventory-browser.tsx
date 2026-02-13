/**
 * Inventory Browser Component
 *
 * Main inventory browsing interface combining filtering, multiple view modes,
 * bulk operations, and export capabilities.
 *
 * Features:
 * - Advanced filtering with saved filter sets
 * - Multiple view modes (list, grid, map)
 * - Bulk selection and operations
 * - Export with custom column selection
 * - URL-synchronized state
 *
 * Accessibility:
 * - Full keyboard navigation
 * - Visible focus indicators
 * - Status indicated by icon + color
 */
import { memo, useState, useCallback, useMemo } from "react";
import {
  Download,
  RefreshCw,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
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
import { DomainFilterBar } from "@/components/shared/filters";
import {
  DEFAULT_INVENTORY_FILTERS,
  createInventoryFilterConfig,
  type InventoryFiltersState,
} from "./inventory-filter-config";
import {
  ViewModeToggle,
  InventoryListView,
  InventoryGridView,
  InventoryMapView,
  type InventoryItem,
  type ViewMode,
} from "./view-modes";

// Legacy type alias for compatibility during migration
type InventoryFilters = InventoryFiltersState;

// ============================================================================
// TYPES
// ============================================================================

interface InventoryBrowserProps {
  items: InventoryItem[];
  isLoading?: boolean;
  products?: Array<{ id: string; name: string; sku: string }>;
  locations?: Array<{ id: string; name: string; code: string }>;
  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  // Filters
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Actions
  onItemClick: (item: InventoryItem) => void;
  onAdjust?: (item: InventoryItem) => void;
  onTransfer?: (item: InventoryItem) => void;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkTransfer?: (ids: string[], locationId: string) => Promise<void>;
  onExport?: (ids: string[], columns: string[]) => Promise<void>;
  onRefresh?: () => void;
  className?: string;
}

// Export column options
const EXPORT_COLUMNS = [
  { id: "productSku", label: "SKU" },
  { id: "productName", label: "Product Name" },
  { id: "locationCode", label: "Location Code" },
  { id: "locationName", label: "Location Name" },
  { id: "quantityOnHand", label: "Quantity On Hand" },
  { id: "quantityAllocated", label: "Quantity Allocated" },
  { id: "quantityAvailable", label: "Quantity Available" },
  { id: "unitCost", label: "Unit Cost" },
  { id: "totalValue", label: "Total Value" },
  { id: "status", label: "Status" },
  { id: "serialNumber", label: "Serial Number" },
  { id: "lotNumber", label: "Lot Number" },
  { id: "expiryDate", label: "Expiry Date" },
  { id: "receivedAt", label: "Received Date" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const InventoryBrowser = memo(function InventoryBrowser({
  items,
  isLoading,
  products = [],
  locations = [],
  page,
  pageSize,
  totalCount,
  onPageChange,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  onItemClick,
  onAdjust,
  onTransfer,
  onBulkDelete,
  onBulkTransfer,
  onExport,
  onRefresh,
  className,
}: InventoryBrowserProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferLocationId, setTransferLocationId] = useState("");
  const [exportColumns, setExportColumns] = useState<string[]>([
    "productSku",
    "productName",
    "locationCode",
    "quantityOnHand",
    "quantityAvailable",
    "unitCost",
    "totalValue",
    "status",
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Selection handlers
  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(async () => {
    if (onBulkDelete && selectedIds.size > 0) {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    }
  }, [onBulkDelete, selectedIds]);

  const handleExport = useCallback(async () => {
    if (onExport) {
      const ids = selectedIds.size > 0 ? Array.from(selectedIds) : items.map((i) => i.id);
      await onExport(ids, exportColumns);
    }
  }, [onExport, selectedIds, items, exportColumns]);

  const handleBulkTransfer = useCallback(async () => {
    if (!onBulkTransfer || selectedIds.size === 0) return;
    if (!transferLocationId) {
      toast.warning("Select a destination location", {
        description: "Choose where to move the selected inventory items.",
      });
      return;
    }
    await onBulkTransfer(Array.from(selectedIds), transferLocationId);
    setSelectedIds(new Set());
    setTransferLocationId("");
    setShowTransferDialog(false);
  }, [onBulkTransfer, selectedIds, transferLocationId]);

  const handleColumnToggle = useCallback((columnId: string) => {
    setExportColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((c) => c !== columnId)
        : [...prev, columnId]
    );
  }, []);

  // Build dynamic filter config with product/location options
  const filterConfig = useMemo(
    () => createInventoryFilterConfig(products, locations),
    [products, locations]
  );

  // Compute active filters for empty state display
  const activeFilters = useMemo(() => {
    const active: Array<{ label: string; value: string }> = [];
    
    if (filters.search) {
      active.push({ label: "Search", value: filters.search });
    }
    if (filters.status && filters.status.length > 0) {
      active.push({ label: "Status", value: filters.status.join(", ") });
    }
    if (filters.locationId) {
      const location = locations.find((l) => l.id === filters.locationId);
      if (location) {
        active.push({ label: "Location", value: location.name });
      }
    }
    if (filters.productId) {
      const product = products.find((p) => p.id === filters.productId);
      if (product) {
        active.push({ label: "Product", value: product.name });
      }
    }
    
    return active;
  }, [filters, locations, products]);

  // Clear all filters handler
  const handleClearFilters = useCallback(() => {
    onFiltersChange(DEFAULT_INVENTORY_FILTERS);
  }, [onFiltersChange]);

  // View component selection
  const ViewComponent = useMemo(() => {
    switch (viewMode) {
      case "grid":
        return InventoryGridView;
      case "map":
        return InventoryMapView;
      default:
        return InventoryListView;
    }
  }, [viewMode]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter Panel */}
      <DomainFilterBar<InventoryFiltersState>
        config={filterConfig}
        filters={filters}
        onFiltersChange={onFiltersChange}
        defaultFilters={DEFAULT_INVENTORY_FILTERS}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />

          {/* Bulk Actions */}
          {selectedIds.size >= 2 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l">
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>

              {onBulkDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete
                </Button>
              )}

              {onBulkTransfer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTransferDialog(true)}
                >
                  <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
                  Transfer
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                Clear
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Export */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EXPORT_COLUMNS.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={exportColumns.includes(column.id)}
                    onCheckedChange={() => handleColumnToggle(column.id)}
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Export {selectedIds.size > 0 ? selectedIds.size : totalCount} items
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {isLoading ? (
            "Loading..."
          ) : totalCount > 0 ? (
            <>
              Showing {startItem} - {endItem} of {totalCount} items
            </>
          ) : (
            "No items found"
          )}
        </div>
      </div>

      {/* View */}
      <ViewComponent
        items={items}
        selectedIds={selectedIds}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onItemClick={onItemClick}
        onAdjust={onAdjust}
        onTransfer={onTransfer}
        isLoading={isLoading}
        onClearFilters={handleClearFilters}
        activeFilters={activeFilters}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} inventory item
              {selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Transfer Dialog */}
      <Dialog
        open={showTransferDialog}
        onOpenChange={(open) => {
          setShowTransferDialog(open);
          if (!open) {
            setTransferLocationId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Inventory</DialogTitle>
            <DialogDescription>
              Move {selectedIds.size} selected item{selectedIds.size !== 1 ? "s" : ""} to a new
              location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Destination Location</label>
            <Select value={transferLocationId} onValueChange={setTransferLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {locations.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No locations available
                  </SelectItem>
                ) : (
                  locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.code ? `(${location.code})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkTransfer}
              disabled={!transferLocationId || selectedIds.size === 0}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default InventoryBrowser;
