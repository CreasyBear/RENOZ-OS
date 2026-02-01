/**
 * Filter Components
 *
 * Config-driven filter system for consistent filtering UX across all domains.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 *
 * @example
 * ```tsx
 * import {
 *   DomainFilterBar,
 *   FilterSearchInput,
 *   FilterSelect,
 *   FilterChipsBar,
 *   type FilterBarConfig,
 * } from '@/components/shared/filters';
 *
 * // Define filter config
 * const ORDER_FILTER_CONFIG: FilterBarConfig<OrderFilters> = {
 *   search: { placeholder: 'Search orders...' },
 *   filters: [
 *     { key: 'status', label: 'Status', type: 'select', options: STATUSES, primary: true },
 *     { key: 'dateRange', label: 'Date', type: 'date-range' },
 *   ],
 *   presets: [
 *     { id: 'pending', label: 'Pending', filters: { status: 'pending' } },
 *   ],
 * };
 *
 * // Use in component
 * <DomainFilterBar
 *   config={ORDER_FILTER_CONFIG}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   defaultFilters={DEFAULT_FILTERS}
 * />
 * ```
 */

// Types
export type {
  FilterFieldType,
  FilterOption,
  FilterFieldConfig,
  FilterSearchConfig,
  FilterPreset,
  FilterBarConfig,
  BaseFilterProps,
  FilterSearchInputProps,
  FilterSelectProps,
  FilterMultiSelectProps,
  FilterDatePickerProps,
  FilterDateRangeProps,
  FilterNumberRangeProps,
  FilterToggleProps,
  FilterChipProps,
  FilterChipsBarProps,
  FilterPresetsProps,
  DomainFilterBarProps,
  FilterValue,
} from "./types";

// Utilities
export { isEmptyFilterValue, countActiveFilters } from "./types";

// Primitive Components
export { FilterSearchInput } from "./filter-search-input";
export { FilterSelect } from "./filter-select";
export { FilterMultiSelect } from "./filter-multi-select";
export { FilterDatePicker } from "./filter-date-picker";
export { FilterDateRange } from "./filter-date-range";
export { FilterNumberRange } from "./filter-number-range";
export { FilterToggle } from "./filter-toggle";

// Composite Components
export { FilterChip } from "./filter-chip";
export { FilterChipsBar } from "./filter-chips-bar";
export { FilterPresets } from "./filter-presets";

// Main Component
export { DomainFilterBar } from "./domain-filter-bar";
