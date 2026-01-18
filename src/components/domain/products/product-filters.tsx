/**
 * ProductFilters Component
 *
 * Advanced filtering panel for the product catalog.
 * Can be shown in a sidebar or dropdown.
 *
 * Features:
 * - Price range filter
 * - Status multi-select
 * - Type multi-select
 * - Tags filter
 * - Clear all filters
 */
import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";

interface ProductFiltersProps {
  filters: {
    minPrice?: number;
    maxPrice?: number;
    status?: string[];
    type?: string[];
    tags?: string[];
  };
  onFiltersChange: (filters: ProductFiltersProps["filters"]) => void;
  onClear: () => void;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "discontinued", label: "Discontinued" },
];

const TYPE_OPTIONS = [
  { value: "physical", label: "Physical" },
  { value: "service", label: "Service" },
  { value: "digital", label: "Digital" },
  { value: "bundle", label: "Bundle" },
];

export function ProductFilters({
  filters,
  onFiltersChange,
  onClear,
}: ProductFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Count active filters
  const activeFilterCount =
    (localFilters.minPrice ? 1 : 0) +
    (localFilters.maxPrice ? 1 : 0) +
    (localFilters.status?.length ?? 0) +
    (localFilters.type?.length ?? 0) +
    (localFilters.tags?.length ?? 0);

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = localFilters.status ?? [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter((s) => s !== status);
    setLocalFilters((prev) => ({
      ...prev,
      status: newStatuses.length > 0 ? newStatuses : undefined,
    }));
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    const currentTypes = localFilters.type ?? [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter((t) => t !== type);
    setLocalFilters((prev) => ({
      ...prev,
      type: newTypes.length > 0 ? newTypes : undefined,
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    setLocalFilters({});
    onClear();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Products</SheetTitle>
          <SheetDescription>
            Narrow down products by price, status, type, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Price Range */}
          <div className="space-y-3">
            <Label>Price Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.minPrice ?? ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    minPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.maxPrice ?? ""}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    maxPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-24"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label>Status</Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.status?.includes(option.value) ?? false}
                    onCheckedChange={(checked) =>
                      handleStatusChange(option.value, !!checked)
                    }
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-3">
            <Label>Product Type</Label>
            <div className="space-y-2">
              {TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${option.value}`}
                    checked={localFilters.type?.includes(option.value) ?? false}
                    onCheckedChange={(checked) =>
                      handleTypeChange(option.value, !!checked)
                    }
                  />
                  <label
                    htmlFor={`type-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
