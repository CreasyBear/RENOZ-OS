/**
 * Build Filter Items Utility
 *
 * Utility function to build FilterItem[] from filter state and config.
 * Reuses formatting logic from FilterChipsBar to avoid duplication.
 *
 * @see FilterEmptyState - Used to display active filters in empty states
 * @see FilterChipsBar - Uses same formatting logic
 */

import type { FilterBarConfig, FilterFieldConfig, FilterValue } from "./types";
import { isEmptyFilterValue } from "./types";
import { format } from "date-fns";
import type { FilterItem } from "../filter-empty-state";

/**
 * Format a filter value for display (reused from FilterChipsBar).
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
      const min = (value as { min: number | null; max: number | null }).min;
      const max = (value as { max: number | null; min: number | null }).max;
      if (min !== null && max !== null) {
        return `${prefix}${min.toLocaleString()} - ${prefix}${max.toLocaleString()}`;
      }
      if (min !== null) {
        return `≥ ${prefix}${min.toLocaleString()}`;
      }
      if (max !== null) {
        return `≤ ${prefix}${max.toLocaleString()}`;
      }
      return "";
    }
    // Date range formatting
    if ("from" in value && "to" in value) {
      const from = (value as { from: Date | null; to: Date | null }).from;
      const to = (value as { to: Date | null; from: Date | null }).to;
      if (from && to) {
        return `${format(from, "dd/MM")} - ${format(to, "dd/MM")}`;
      }
      if (from) {
        return `From ${format(from, "dd/MM/yyyy")}`;
      }
      if (to) {
        return `To ${format(to, "dd/MM/yyyy")}`;
      }
      return "";
    }
  }

  // For select options, find the label
  if (config?.options && typeof value === "string") {
    const option = config.options.find((o) => o.value === value);
    if (option) return option.label;
  }

  // Default string conversion
  return String(value);
}

/**
 * Get label for a filter key (reused from FilterChipsBar).
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
 * Build filter items array from filter state and config.
 * Reuses formatting logic from FilterChipsBar to ensure consistency.
 *
 * @example
 * ```tsx
 * const filterItems = buildFilterItems({
 *   filters,
 *   config: ORDER_FILTER_CONFIG,
 *   defaultFilters: DEFAULT_ORDER_FILTERS,
 *   onFiltersChange: (nextFilters) => {
 *     setFilters(nextFilters);
 *   },
 * });
 * ```
 */
export function buildFilterItems<TFilters extends Record<string, unknown>>({
  filters,
  config,
  defaultFilters,
  onFiltersChange,
  excludeKeys = ["search"],
}: {
  filters: TFilters;
  config: FilterBarConfig<TFilters>;
  defaultFilters: TFilters;
  onFiltersChange: (filters: TFilters) => void;
  excludeKeys?: (keyof TFilters)[];
}): FilterItem[] {
  const items: FilterItem[] = [];

  // Get active filters (non-empty, non-default)
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (excludeKeys.includes(key as keyof TFilters)) return false;
    return !isEmptyFilterValue(value as FilterValue);
  });

  for (const [key, value] of activeFilters) {
    const fieldConfig = config.filters.find((f) => f.key === key);
    const label = getFilterLabel(key, config);
    const displayValue = formatFilterValue(value as FilterValue, fieldConfig);

    // Skip if no display value
    if (!displayValue) continue;

    // Create remove handler
    const onRemove = () => {
      const defaultValue = defaultFilters[key as keyof TFilters];
      
      // For multi-select, clear to empty array
      if (fieldConfig?.type === "multi-select") {
        onFiltersChange({ ...filters, [key]: [] } as TFilters);
        return;
      }

      // For other types, reset to default
      onFiltersChange({ ...filters, [key]: defaultValue } as TFilters);
    };

    items.push({
      key,
      label,
      value: displayValue,
      onRemove,
    });
  }

  return items;
}
