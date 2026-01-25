/**
 * Warehouse Location Tree Component
 *
 * Hierarchical tree view for warehouse locations with expand/collapse,
 * utilization indicators, and context actions.
 *
 * Accessibility:
 * - Tree widget follows WAI-ARIA treeview pattern
 * - Keyboard navigation (arrows, enter, space)
 * - Utilization shown with icon + color (not color-only)
 */
import { memo, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Warehouse,
  LayoutGrid,
  Rows3,
  Layers,
  Box,
  Package,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

export type LocationType = "warehouse" | "zone" | "aisle" | "rack" | "shelf" | "bin";

export interface WarehouseLocation {
  id: string;
  locationCode: string;
  name: string;
  locationType: LocationType;
  parentId: string | null;
  capacity: number | null;
  isActive: boolean;
  isPickable: boolean;
  isReceivable: boolean;
  children?: WarehouseLocation[];
  inventoryCount?: number;
  utilization?: number | null;
}

interface LocationTreeProps {
  locations: WarehouseLocation[];
  isLoading?: boolean;
  selectedId?: string | null;
  onSelect?: (location: WarehouseLocation) => void;
  onAdd?: (parentId: string | null) => void;
  onEdit?: (location: WarehouseLocation) => void;
  onDelete?: (location: WarehouseLocation) => void;
  className?: string;
}

interface TreeNodeProps {
  location: WarehouseLocation;
  level: number;
  selectedId?: string | null;
  onSelect?: (location: WarehouseLocation) => void;
  onAdd?: (parentId: string | null) => void;
  onEdit?: (location: WarehouseLocation) => void;
  onDelete?: (location: WarehouseLocation) => void;
}

// ============================================================================
// LOCATION TYPE CONFIG
// ============================================================================

const LOCATION_TYPE_CONFIG: Record<
  LocationType,
  { label: string; icon: typeof Warehouse; color: string }
> = {
  warehouse: { label: "Warehouse", icon: Warehouse, color: "text-blue-600" },
  zone: { label: "Zone", icon: LayoutGrid, color: "text-purple-600" },
  aisle: { label: "Aisle", icon: Rows3, color: "text-green-600" },
  rack: { label: "Rack", icon: Layers, color: "text-orange-600" },
  shelf: { label: "Shelf", icon: Box, color: "text-cyan-600" },
  bin: { label: "Bin", icon: Package, color: "text-gray-600" },
};

// ============================================================================
// TREE NODE COMPONENT
// ============================================================================

const TreeNode = memo(function TreeNode({
  location,
  level,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = location.children && location.children.length > 0;
  const isSelected = selectedId === location.id;
  const config = LOCATION_TYPE_CONFIG[location.locationType];
  const Icon = config.icon;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleSelect = useCallback(() => {
    onSelect?.(location);
  }, [location, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect();
      } else if (e.key === "ArrowRight" && hasChildren && !isExpanded) {
        e.preventDefault();
        setIsExpanded(true);
      } else if (e.key === "ArrowLeft" && isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
      }
    },
    [handleSelect, hasChildren, isExpanded]
  );

  return (
    <div role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-accent",
          isSelected && "bg-accent",
          !location.isActive && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-selected={isSelected}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-muted rounded"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Icon */}
        <Icon className={cn("h-4 w-4 shrink-0", config.color)} aria-hidden="true" />

        {/* Name and Code */}
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate">{location.name}</span>
          <span className="text-muted-foreground text-xs ml-2">
            {location.locationCode}
          </span>
        </div>

        {/* Badges */}
        {!location.isActive && (
          <Badge variant="outline" className="text-xs">
            Inactive
          </Badge>
        )}

        {/* Utilization */}
        {location.capacity && location.utilization !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 min-w-[60px]">
                  <Progress
                    value={location.utilization ?? 0}
                    className="h-2 w-12"
                  />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {location.utilization ?? 0}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {location.inventoryCount ?? 0} items / {location.capacity} capacity
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onAdd && location.locationType !== "bin" && (
              <DropdownMenuItem onClick={() => onAdd(location.id)}>
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Add Child Location
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(location)}>
                <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(location)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group">
          {location.children!.map((child) => (
            <TreeNode
              key={child.id}
              location={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const LocationTree = memo(function LocationTree({
  locations,
  isLoading,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  className,
}: LocationTreeProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 px-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Warehouse className="h-12 w-12 text-muted-foreground/50 mx-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          No warehouse locations configured
        </p>
        {onAdd && (
          <Button variant="outline" className="mt-4" onClick={() => onAdd(null)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Warehouse
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="tree"
      aria-label="Warehouse location hierarchy"
      className={cn("group", className)}
    >
      {locations.map((location) => (
        <TreeNode
          key={location.id}
          location={location}
          level={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
});

export default LocationTree;
