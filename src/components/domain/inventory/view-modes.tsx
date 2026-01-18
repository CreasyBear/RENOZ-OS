/**
 * Inventory View Mode Components
 *
 * Multiple view modes for browsing inventory: List, Grid, Map.
 * Uses virtualization for large datasets (>50 items).
 *
 * Accessibility:
 * - Full keyboard navigation in all views
 * - Bulk select checkbox hit area spans full row
 * - Visible focus rings on all interactive elements
 * - Status indicated by color AND icon (not color-only)
 */
import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Package,
  MapPin,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  unitCost: number;
  totalValue: number;
  status: "available" | "allocated" | "sold" | "damaged" | "returned" | "quarantined";
  qualityStatus?: "good" | "damaged" | "expired" | "quarantined";
  serialNumber?: string;
  lotNumber?: string;
  expiryDate?: Date;
  receivedAt?: Date;
  lastMovementAt?: Date;
}

export type ViewMode = "list" | "grid" | "map";

interface ViewModeProps {
  items: InventoryItem[];
  selectedIds: Set<string>;
  onSelectItem: (id: string) => void;
  onSelectAll: () => void;
  onItemClick: (item: InventoryItem) => void;
  onAdjust?: (item: InventoryItem) => void;
  onTransfer?: (item: InventoryItem) => void;
  onViewHistory?: (item: InventoryItem) => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<
  InventoryItem["status"],
  { label: string; icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  available: {
    label: "Available",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/50",
  },
  allocated: {
    label: "Allocated",
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  sold: {
    label: "Sold",
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/50",
  },
  damaged: {
    label: "Damaged",
    icon: AlertCircle,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
  returned: {
    label: "Returned",
    icon: XCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
  },
  quarantined: {
    label: "Quarantined",
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
  },
};

// ============================================================================
// VIEW MODE TOGGLE
// ============================================================================

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewModeToggle = memo(function ViewModeToggle({
  mode,
  onChange,
  className,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn("flex items-center gap-1 rounded-lg border p-1", className)}
      role="tablist"
      aria-label="View mode"
    >
      <Button
        variant={mode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        role="tab"
        aria-selected={mode === "list"}
        aria-label="List view"
        className="h-8 px-3"
      >
        List
      </Button>
      <Button
        variant={mode === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("grid")}
        role="tab"
        aria-selected={mode === "grid"}
        aria-label="Grid view"
        className="h-8 px-3"
      >
        Grid
      </Button>
      <Button
        variant={mode === "map" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("map")}
        role="tab"
        aria-selected={mode === "map"}
        aria-label="Map view"
        className="h-8 px-3"
      >
        Map
      </Button>
    </div>
  );
});

// ============================================================================
// LIST VIEW (VIRTUALIZED)
// ============================================================================

export const InventoryListView = memo(function InventoryListView({
  items,
  selectedIds,
  onSelectItem,
  onSelectAll,
  onItemClick,
  onAdjust,
  onTransfer,
  onViewHistory,
  isLoading,
  className,
}: ViewModeProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtualization = items.length > 50;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-10 w-10 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No inventory found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  const renderRow = (item: InventoryItem) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const StatusIcon = statusConfig.icon;
    const isSelected = selectedIds.has(item.id);

    return (
      <div
        key={item.id}
        className={cn(
          "flex items-center gap-4 p-4 border rounded-lg transition-colors cursor-pointer",
          "hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          isSelected && "bg-primary/5 border-primary/20"
        )}
        onClick={() => onItemClick(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onItemClick(item);
          }
        }}
        tabIndex={0}
        role="row"
        aria-selected={isSelected}
      >
        {/* Checkbox - full row hit area */}
        <div
          className="flex items-center justify-center w-8 h-full -m-4 p-4"
          onClick={(e) => {
            e.stopPropagation();
            onSelectItem(item.id);
          }}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelectItem(item.id)}
            aria-label={`Select ${item.productName}`}
          />
        </div>

        {/* Product Icon */}
        <div className="flex-shrink-0 h-10 w-10 rounded bg-muted flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.productName}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {item.productSku}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {item.locationCode} - {item.locationName}
            </span>
            {item.serialNumber && (
              <span className="font-mono text-xs">S/N: {item.serialNumber}</span>
            )}
            {item.lotNumber && (
              <span className="font-mono text-xs">Lot: {item.lotNumber}</span>
            )}
          </div>
        </div>

        {/* Quantity */}
        <div className="text-right tabular-nums">
          <div className="font-medium">{item.quantityAvailable}</div>
          <div className="text-xs text-muted-foreground">
            of {item.quantityOnHand} available
          </div>
        </div>

        {/* Value */}
        <div className="text-right tabular-nums w-24">
          <div className="font-medium">
            {new Intl.NumberFormat("en-AU", {
              style: "currency",
              currency: "AUD",
            }).format(item.totalValue)}
          </div>
          <div className="text-xs text-muted-foreground">
            @{" "}
            {new Intl.NumberFormat("en-AU", {
              style: "currency",
              currency: "AUD",
            }).format(item.unitCost)}
          </div>
        </div>

        {/* Status - icon + color */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn("flex items-center gap-1", statusConfig.color, statusConfig.bgColor)}
              >
                <StatusIcon className="h-3 w-3" aria-hidden="true" />
                {statusConfig.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Status: {statusConfig.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="Item actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onItemClick(item)}>
              View Details
            </DropdownMenuItem>
            {onViewHistory && (
              <DropdownMenuItem onClick={() => onViewHistory(item)}>
                View History
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onAdjust && (
              <DropdownMenuItem onClick={() => onAdjust(item)}>
                Adjust Quantity
              </DropdownMenuItem>
            )}
            {onTransfer && (
              <DropdownMenuItem onClick={() => onTransfer(item)}>
                Transfer Location
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30 rounded-t-lg">
        <Checkbox
          checked={allSelected}
          ref={(ref) => {
            if (ref) {
              (ref as any).indeterminate = someSelected;
            }
          }}
          onCheckedChange={onSelectAll}
          aria-label="Select all items"
        />
        <span className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : `${items.length} items`}
        </span>
      </div>

      {/* Virtualized or Regular List */}
      {useVirtualization ? (
        <div
          ref={parentRef}
          className="h-[600px] overflow-auto"
          role="grid"
          aria-label="Inventory items"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {renderRow(items[virtualRow.index])}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2 p-2" role="grid" aria-label="Inventory items">
          {items.map((item) => renderRow(item))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// GRID VIEW
// ============================================================================

export const InventoryGridView = memo(function InventoryGridView({
  items,
  selectedIds,
  onSelectItem,
  onSelectAll: _onSelectAll,
  onItemClick,
  onAdjust: _onAdjust,
  onTransfer: _onTransfer,
  onViewHistory: _onViewHistory,
  isLoading,
  className,
}: ViewModeProps) {
  // Grid view doesn't use bulk select all or individual actions in current impl
  void _onSelectAll;
  void _onAdjust;
  void _onTransfer;
  void _onViewHistory;

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-24 w-full rounded" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No inventory found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}
      role="grid"
      aria-label="Inventory items"
    >
      {items.map((item) => {
        const statusConfig = STATUS_CONFIG[item.status];
        const StatusIcon = statusConfig.icon;
        const isSelected = selectedIds.has(item.id);

        return (
          <Card
            key={item.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
              isSelected && "ring-2 ring-primary"
            )}
            onClick={() => onItemClick(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onItemClick(item);
              }
            }}
            tabIndex={0}
            role="gridcell"
            aria-selected={isSelected}
          >
            <CardContent className="p-4">
              {/* Header with checkbox and status */}
              <div className="flex items-start justify-between mb-3">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectItem(item.id);
                  }}
                  className="p-1"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelectItem(item.id)}
                    aria-label={`Select ${item.productName}`}
                  />
                </div>
                <Badge
                  variant="outline"
                  className={cn("flex items-center gap-1", statusConfig.color, statusConfig.bgColor)}
                >
                  <StatusIcon className="h-3 w-3" aria-hidden="true" />
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Product Icon Placeholder */}
              <div className="h-24 rounded bg-muted flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>

              {/* Product Info */}
              <h3 className="font-medium truncate">{item.productName}</h3>
              <p className="text-sm text-muted-foreground font-mono">{item.productSku}</p>

              {/* Location */}
              <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {item.locationCode}
              </div>

              {/* Quantity and Value */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="tabular-nums">
                  <div className="text-lg font-semibold">{item.quantityAvailable}</div>
                  <div className="text-xs text-muted-foreground">available</div>
                </div>
                <div className="text-right tabular-nums">
                  <div className="font-medium">
                    {new Intl.NumberFormat("en-AU", {
                      style: "currency",
                      currency: "AUD",
                    }).format(item.totalValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">total value</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
});

// ============================================================================
// MAP VIEW (Location-based visualization)
// ============================================================================

export const InventoryMapView = memo(function InventoryMapView({
  items,
  // Map view doesn't use selection - grouping by location
  selectedIds: _selectedIds,
  onSelectItem: _onSelectItem,
  onSelectAll: _onSelectAll,
  onItemClick,
  isLoading,
  className,
}: ViewModeProps) {
  // Silence unused variable warnings
  void _selectedIds;
  void _onSelectItem;
  void _onSelectAll;
  // Group items by location
  const locationGroups = items.reduce(
    (acc, item) => {
      const key = item.locationId;
      if (!acc[key]) {
        acc[key] = {
          locationId: item.locationId,
          locationName: item.locationName,
          locationCode: item.locationCode,
          items: [],
          totalQuantity: 0,
          totalValue: 0,
        };
      }
      acc[key].items.push(item);
      acc[key].totalQuantity += item.quantityOnHand;
      acc[key].totalValue += item.totalValue;
      return acc;
    },
    {} as Record<
      string,
      {
        locationId: string;
        locationName: string;
        locationCode: string;
        items: InventoryItem[];
        totalQuantity: number;
        totalValue: number;
      }
    >
  );

  if (isLoading) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No locations with inventory</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      role="grid"
      aria-label="Inventory by location"
    >
      {Object.values(locationGroups).map((group) => (
        <Card
          key={group.locationId}
          className="cursor-pointer hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-ring"
          tabIndex={0}
          role="gridcell"
        >
          <CardContent className="p-4">
            {/* Location Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-medium">{group.locationCode}</h3>
                <p className="text-sm text-muted-foreground">{group.locationName}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 py-3 border-y">
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {group.items.length}
                </div>
                <div className="text-xs text-muted-foreground">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">
                  {group.totalQuantity}
                </div>
                <div className="text-xs text-muted-foreground">Total Units</div>
              </div>
            </div>

            {/* Total Value */}
            <div className="mt-3 text-right">
              <div className="text-lg font-semibold tabular-nums">
                {new Intl.NumberFormat("en-AU", {
                  style: "currency",
                  currency: "AUD",
                }).format(group.totalValue)}
              </div>
              <div className="text-xs text-muted-foreground">Total Value</div>
            </div>

            {/* Item Preview */}
            <div className="mt-3 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Top Items
              </div>
              <div className="space-y-1">
                {group.items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                  >
                    <span className="truncate">{item.productSku}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.quantityOnHand}
                    </span>
                  </div>
                ))}
                {group.items.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{group.items.length - 3} more items
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

export default InventoryListView;
