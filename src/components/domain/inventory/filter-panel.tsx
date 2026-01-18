/**
 * Inventory Filter Panel
 *
 * Advanced filtering panel for inventory search with multiple filter criteria.
 * Supports saved filter sets and search history.
 *
 * Accessibility:
 * - All filter controls are keyboard accessible
 * - Labels are properly associated with inputs
 * - Clear visual feedback for active filters
 */
import { memo, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Save,
  FolderOpen,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  Hash,
  Calendar,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryFilters {
  search: string;
  productId?: string;
  locationId?: string;
  status: string[];
  minQuantity?: number;
  maxQuantity?: number;
  minValue?: number;
  maxValue?: number;
  ageRange?: "all" | "0-30" | "31-60" | "61-90" | "90+";
  qualityStatus: string[];
}

interface SavedFilterSet {
  id: string;
  name: string;
  filters: InventoryFilters;
  createdAt: Date;
}

interface FilterPanelProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  products?: Array<{ id: string; name: string; sku: string }>;
  locations?: Array<{ id: string; name: string; code: string }>;
  savedFilters?: SavedFilterSet[];
  onSaveFilter?: (name: string, filters: InventoryFilters) => void;
  onLoadFilter?: (filterId: string) => void;
  className?: string;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const defaultInventoryFilters: InventoryFilters = {
  search: "",
  productId: undefined,
  locationId: undefined,
  status: [],
  minQuantity: undefined,
  maxQuantity: undefined,
  minValue: undefined,
  maxValue: undefined,
  ageRange: "all",
  qualityStatus: [],
};

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "allocated", label: "Allocated" },
  { value: "sold", label: "Sold" },
  { value: "damaged", label: "Damaged" },
  { value: "returned", label: "Returned" },
  { value: "quarantined", label: "Quarantined" },
];

const QUALITY_OPTIONS = [
  { value: "good", label: "Good" },
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "quarantined", label: "Quarantined" },
];

const AGE_OPTIONS = [
  { value: "all", label: "All Ages" },
  { value: "0-30", label: "0-30 days" },
  { value: "31-60", label: "31-60 days" },
  { value: "61-90", label: "61-90 days" },
  { value: "90+", label: "90+ days" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export const FilterPanel = memo(function FilterPanel({
  filters,
  onFiltersChange,
  products = [],
  locations = [],
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  className,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Count active filters
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.productId ? 1 : 0) +
    (filters.locationId ? 1 : 0) +
    filters.status.length +
    filters.qualityStatus.length +
    (filters.minQuantity !== undefined ? 1 : 0) +
    (filters.maxQuantity !== undefined ? 1 : 0) +
    (filters.minValue !== undefined ? 1 : 0) +
    (filters.maxValue !== undefined ? 1 : 0) +
    (filters.ageRange && filters.ageRange !== "all" ? 1 : 0);

  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value });
    },
    [filters, onFiltersChange]
  );

  const handleStatusToggle = useCallback(
    (status: string) => {
      const newStatus = filters.status.includes(status)
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status];
      onFiltersChange({ ...filters, status: newStatus });
    },
    [filters, onFiltersChange]
  );

  const handleQualityToggle = useCallback(
    (quality: string) => {
      const newQuality = filters.qualityStatus.includes(quality)
        ? filters.qualityStatus.filter((q) => q !== quality)
        : [...filters.qualityStatus, quality];
      onFiltersChange({ ...filters, qualityStatus: newQuality });
    },
    [filters, onFiltersChange]
  );

  const handleReset = useCallback(() => {
    onFiltersChange(defaultInventoryFilters);
  }, [onFiltersChange]);

  const handleSaveFilter = useCallback(() => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), filters);
      setSaveFilterName("");
      setShowSaveDialog(false);
    }
  }, [saveFilterName, filters, onSaveFilter]);

  return (
    <Card className={cn("mb-4", className)}>
      <CardContent className="p-4">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by SKU, serial number, or product name..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              aria-label="Search inventory"
            />
          </div>

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="relative"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Hide filters" : "Show filters"}
              >
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 ml-2" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" aria-hidden="true" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              aria-label="Reset all filters"
            >
              <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        <Collapsible open={isExpanded}>
          <CollapsibleContent className="pt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Product Filter */}
              <div className="space-y-2">
                <Label htmlFor="product-filter" className="flex items-center gap-2">
                  <Package className="h-4 w-4" aria-hidden="true" />
                  Product
                </Label>
                <Select
                  value={filters.productId || ""}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      productId: value || undefined,
                    })
                  }
                >
                  <SelectTrigger id="product-filter">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <Label htmlFor="location-filter" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  Location
                </Label>
                <Select
                  value={filters.locationId || ""}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      locationId: value || undefined,
                    })
                  }
                >
                  <SelectTrigger id="location-filter">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.code} - {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Hash className="h-4 w-4" aria-hidden="true" />
                  Quantity Range
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minQuantity ?? ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        minQuantity: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-20"
                    aria-label="Minimum quantity"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxQuantity ?? ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        maxQuantity: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-20"
                    aria-label="Maximum quantity"
                  />
                </div>
              </div>

              {/* Age Range */}
              <div className="space-y-2">
                <Label htmlFor="age-filter" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  Inventory Age
                </Label>
                <Select
                  value={filters.ageRange || "all"}
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      ageRange: value as InventoryFilters["ageRange"],
                    })
                  }
                >
                  <SelectTrigger id="age-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Filters */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" aria-hidden="true" />
                Inventory Status
              </Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Inventory status filters">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.status.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusToggle(option.value)}
                    aria-pressed={filters.status.includes(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quality Status Filters */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Quality Status
              </Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quality status filters">
                {QUALITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={filters.qualityStatus.includes(option.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQualityToggle(option.value)}
                    aria-pressed={filters.qualityStatus.includes(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                {/* Save Filter */}
                {onSaveFilter && (
                  <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                        Save Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <Label htmlFor="filter-name">Filter Name</Label>
                        <Input
                          id="filter-name"
                          value={saveFilterName}
                          onChange={(e) => setSaveFilterName(e.target.value)}
                          placeholder="Enter filter name..."
                        />
                        <Button onClick={handleSaveFilter} className="w-full">
                          Save
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Load Saved Filter */}
                {savedFilters.length > 0 && onLoadFilter && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <FolderOpen className="h-4 w-4 mr-2" aria-hidden="true" />
                        Saved Filters
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-2">
                        {savedFilters.map((saved) => (
                          <Button
                            key={saved.id}
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => onLoadFilter(saved.id)}
                          >
                            {saved.name}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {activeFilterCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
});

export default FilterPanel;
