/**
 * Filter Chips Bar
 *
 * Displays active filters in a dropdown to avoid layout shift.
 * Always renders a compact trigger; chips live in a Popover.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useMemo, type ReactElement } from "react";
import { format } from "date-fns";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { FilterChip } from "./filter-chip";
import type { FilterChipsBarProps, FilterFieldConfig, FilterValue } from "./types";
import { isEmptyFilterValue } from "./types";

/**
 * Format a filter value for chip display.
 */
function formatFilterValue(
  value: FilterValue,
  config?: FilterFieldConfig
): string {
  // Use custom formatter if provided
  if (config?.formatChip && value !== null && value !== undefined) {
    return config.formatChip(value);
  }

  // Date formatting
  if (value instanceof Date) {
    return format(value, "dd/MM/yyyy");
  }

  // Array formatting (multi-select)
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.length <= 2) return value.join(", ");
    return `${value.slice(0, 2).join(", ")} +${value.length - 2}`;
  }

  // Number range formatting
  if (typeof value === "object" && value !== null) {
    if ("min" in value && "max" in value) {
      const prefix = config?.prefix ?? "";
      if (value.min !== null && value.max !== null) {
        return `${prefix}${value.min} - ${prefix}${value.max}`;
      }
      if (value.min !== null) {
        return `≥ ${prefix}${value.min}`;
      }
      if (value.max !== null) {
        return `≤ ${prefix}${value.max}`;
      }
      return "";
    }
    // Date range formatting
    if ("from" in value && "to" in value) {
      if (value.from && value.to) {
        return `${format(value.from, "dd/MM")} - ${format(value.to, "dd/MM")}`;
      }
      if (value.from) {
        return `From ${format(value.from, "dd/MM/yyyy")}`;
      }
      if (value.to) {
        return `To ${format(value.to, "dd/MM/yyyy")}`;
      }
      return "";
    }
  }

  // Default string conversion
  return String(value);
}

/**
 * Get label for a filter key.
 */
function getFilterLabel<T>(
  key: string,
  config: { filters: FilterFieldConfig[]; labels?: Partial<Record<keyof T, string>> }
): string {
  // Check explicit labels first
  if (config.labels?.[key as keyof T]) {
    return config.labels[key as keyof T] as string;
  }

  // Check field config
  const fieldConfig = config.filters.find((f) => f.key === key);
  if (fieldConfig?.chipLabel) {
    return fieldConfig.chipLabel;
  }
  if (fieldConfig?.label) {
    return fieldConfig.label;
  }

  // Format key as fallback (camelCase to Title Case)
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Active filter chips in a dropdown. Always renders a fixed-height trigger
 * to prevent layout shift when filters are applied or cleared.
 *
 * @example
 * ```tsx
 * <FilterChipsBar
 *   filters={filters}
 *   onChange={setFilters}
 *   config={FILTER_CONFIG}
 *   defaultFilters={DEFAULT_FILTERS}
 * />
 * ```
 */
export const FilterChipsBar = memo(function FilterChipsBar<
  TFilters extends Record<string, unknown>
>({
  filters,
  onChange,
  config,
  defaultFilters,
  className,
}: FilterChipsBarProps<TFilters>) {
  // Get active filters (non-empty, non-default)
  const activeFilters = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      // Skip search - handled separately in most UIs
      if (key === "search") return false;
      return !isEmptyFilterValue(value as FilterValue);
    });
  }, [filters]);

  const clearFilter = (key: string) => {
    const fieldConfig = config.filters.find((f) => f.key === key);
    const defaultValue = defaultFilters[key as keyof TFilters];

    // For multi-select, clear to empty array
    if (fieldConfig?.type === "multi-select") {
      onChange({ ...filters, [key]: [] } as TFilters);
      return;
    }

    // For other types, reset to default
    onChange({ ...filters, [key]: defaultValue } as TFilters);
  };

  const clearAll = () => {
    // Reset all filters to defaults, preserving search
    const resetFilters = { ...defaultFilters };
    if ("search" in filters && "search" in resetFilters) {
      (resetFilters as Record<string, unknown>).search = filters.search;
    }
    onChange(resetFilters);
  };

  return (
    <div className={cn("flex items-center h-8", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-8 shrink-0"
            aria-label={
              activeFilters.length > 0
                ? `Active filters (${activeFilters.length}), click to view or clear`
                : "Active filters (0), click to view"
            }
            aria-expanded={undefined}
            aria-haspopup="dialog"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Active filters</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeFilters.length}
            </Badge>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-80 max-h-[280px] overflow-y-auto p-3"
        >
          {activeFilters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No active filters
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(([key, value]) => {
                  const fieldConfig = config.filters.find((f) => f.key === key);
                  const label = getFilterLabel(key, config);
                  const displayValue = formatFilterValue(
                    value as FilterValue,
                    fieldConfig
                  );

                  if (!displayValue) return null;

                  return (
                    <FilterChip
                      key={key}
                      label={label}
                      value={displayValue}
                      onRemove={() => clearFilter(key)}
                    />
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground hover:text-foreground w-full justify-center h-8"
              >
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}) as <TFilters extends Record<string, unknown>>(
  props: FilterChipsBarProps<TFilters>
) => ReactElement;

(FilterChipsBar as { displayName?: string }).displayName = "FilterChipsBar";
