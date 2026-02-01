import { Fragment, memo } from "react";
import type { LucideIcon } from "lucide-react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DataTableFilterOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
}

export interface DataTableFilter {
  /** Unique filter identifier */
  id: string;
  /** Display label for the filter group */
  label: string;
  /** Available options */
  options: DataTableFilterOption[];
  /** Current value */
  value: string;
  /** Default value (used for reset) */
  defaultValue: string;
  /** Change handler */
  onChange: (value: string) => void;
}

export interface DataTableFilterDropdownProps {
  /** Array of filter configurations */
  filters?: DataTableFilter[];
  /** Whether any filter is active */
  hasActiveFilters?: boolean;
  /** Button size */
  size?: "sm" | "default";
  /** Additional className */
  className?: string;
}

/**
 * Grouped filter dropdown with clear all functionality.
 *
 * @example
 * ```tsx
 * <DataTableFilterDropdown
 *   filters={[
 *     {
 *       id: "status",
 *       label: "Status",
 *       options: [
 *         { value: "all", label: "All" },
 *         { value: "active", label: "Active", icon: CheckCircle, iconColor: "text-emerald-500" },
 *         { value: "pending", label: "Pending", icon: Clock, iconColor: "text-amber-500" },
 *       ],
 *       value: statusFilter,
 *       defaultValue: "all",
 *       onChange: setStatusFilter,
 *     },
 *   ]}
 *   hasActiveFilters={statusFilter !== "all"}
 * />
 * ```
 */
export const DataTableFilterDropdown = memo(function DataTableFilterDropdown({
  filters,
  hasActiveFilters = false,
  size = "sm",
  className,
}: DataTableFilterDropdownProps) {
  if (!filters || filters.length === 0) {
    return null;
  }

  const handleClearAll = () => {
    filters.forEach((filter) => {
      filter.onChange(filter.defaultValue);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={cn("gap-1.5 bg-muted/50", size === "sm" && "h-8", className)}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>Filter</span>
          {hasActiveFilters && (
            <span className="size-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {filters.map((filter, idx) => (
          <Fragment key={filter.id}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  {filter.label}
                </p>
                <div className="space-y-0.5">
                  {filter.options.map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={filter.value === option.value}
                      onCheckedChange={() => filter.onChange(option.value)}
                    >
                      {option.icon && (
                        <option.icon
                          className={cn("size-3 mr-1.5", option.iconColor)}
                        />
                      )}
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </div>
            </DropdownMenuGroup>
          </Fragment>
        ))}
        {hasActiveFilters && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearAll}>
              Clear all filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

DataTableFilterDropdown.displayName = "DataTableFilterDropdown";
