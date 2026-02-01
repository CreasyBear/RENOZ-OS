/**
 * Filter Chips Bar
 *
 * Displays all active filters as removable chips.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useMemo, type ReactElement } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
 * Active filter chips bar with clear all button.
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

  // No active filters - don't render
  if (activeFilters.length === 0) {
    return null;
  }

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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground shrink-0">
        Active filters:
      </span>

      {activeFilters.map(([key, value]) => {
        const fieldConfig = config.filters.find((f) => f.key === key);
        const label = getFilterLabel(key, config);
        const displayValue = formatFilterValue(value as FilterValue, fieldConfig);

        // Skip if no display value
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

      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="text-muted-foreground hover:text-foreground h-auto py-1 px-2 shrink-0"
      >
        Clear all
      </Button>
    </div>
  );
}) as <TFilters extends Record<string, unknown>>(
  props: FilterChipsBarProps<TFilters>
) => ReactElement | null;

(FilterChipsBar as { displayName?: string }).displayName = "FilterChipsBar";
