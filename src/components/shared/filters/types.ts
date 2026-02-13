/**
 * Filter Component Types
 *
 * Shared types for the config-driven filter system.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import type { LucideIcon } from "lucide-react";

// ============================================================================
// FILTER FIELD TYPES
// ============================================================================

export type FilterFieldType =
  | "search"
  | "select"
  | "multi-select"
  | "date"
  | "date-range"
  | "number-range"
  | "toggle";

export interface FilterOption<T = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

export interface FilterFieldConfig<TValue = unknown> {
  /** Unique key matching the filter state property */
  key: string;
  /** Display label for the field */
  label: string;
  /** Field type determines which component to render */
  type: FilterFieldType;
  /** Placeholder text */
  placeholder?: string;
  /** Options for select/multi-select types */
  options?: FilterOption[];
  /** Max selections for multi-select (undefined = unlimited) */
  maxSelections?: number;
  /** Show in primary bar (true) or advanced panel (false) */
  primary?: boolean;
  /** Custom formatter for chip display */
  formatChip?: (value: TValue) => string;
  /** Custom formatter for chip label (key name) */
  chipLabel?: string;
  /** Prefix for number inputs (e.g., "$") */
  prefix?: string;
  /** Suffix for number inputs (e.g., "%") */
  suffix?: string;
  /** Min value for number-range */
  min?: number;
  /** Max value for number-range */
  max?: number;
  /** Step for number inputs */
  step?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Label for "All" option in select */
  allLabel?: string;
  /** Label for "From" date in date-range */
  fromLabel?: string;
  /** Label for "To" date in date-range */
  toLabel?: string;
  /** Placeholder for min input in number-range */
  minPlaceholder?: string;
  /** Placeholder for max input in number-range */
  maxPlaceholder?: string;
}

// ============================================================================
// FILTER BAR CONFIG
// ============================================================================

export interface FilterSearchConfig {
  /** Placeholder text for search input */
  placeholder?: string;
  /** Fields to search across (for display in chip) */
  fields?: string[];
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

export interface FilterPreset<TFilters> {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Filter values to apply */
  filters: Partial<TFilters>;
}

export interface FilterBarConfig<TFilters> {
  /** Search configuration */
  search?: FilterSearchConfig;
  /** Filter field definitions */
  filters: FilterFieldConfig[];
  /** Quick filter presets */
  presets?: FilterPreset<TFilters>[];
  /** Labels for filter keys (used in chips) */
  labels?: Partial<Record<keyof TFilters, string>>;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface BaseFilterProps {
  /** Additional CSS classes */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface FilterSearchInputProps extends BaseFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export interface FilterSelectProps<T = string> extends BaseFilterProps {
  value: T | null;
  onChange: (value: T | null) => void;
  options: FilterOption<T>[];
  placeholder?: string;
  label?: string;
  allLabel?: string;
}

export interface FilterMultiSelectProps<T = string> extends BaseFilterProps {
  value: T[];
  onChange: (value: T[]) => void;
  options: FilterOption<T>[];
  placeholder?: string;
  label?: string;
  maxDisplay?: number;
  maxSelections?: number;
}

export interface FilterDatePickerProps extends BaseFilterProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  placeholder?: string;
  label?: string;
}

export interface FilterDateRangeProps extends BaseFilterProps {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
  placeholder?: string;
  label?: string;
}

export interface FilterNumberRangeProps extends BaseFilterProps {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
  label?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export interface FilterToggleProps extends BaseFilterProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export interface FilterChipsBarProps<TFilters extends Record<string, unknown>> {
  filters: TFilters;
  onChange: (filters: TFilters) => void;
  config: FilterBarConfig<TFilters>;
  defaultFilters: TFilters;
  className?: string;
}

export interface FilterPresetsProps<TFilters> {
  presets: FilterPreset<TFilters>[];
  currentFilters: TFilters;
  onApply: (filters: Partial<TFilters>) => void;
  className?: string;
}

// ============================================================================
// DOMAIN FILTER BAR PROPS
// ============================================================================

export interface DomainFilterBarProps<TFilters extends Record<string, unknown>> {
  /** Filter bar configuration */
  config: FilterBarConfig<TFilters>;
  /** Current filter values */
  filters: TFilters;
  /** Callback when filters change */
  onFiltersChange: (filters: TFilters) => void;
  /** Default filter values (for reset) */
  defaultFilters: TFilters;
  /** Result count to display */
  resultCount?: number;
  /** Show advanced filters panel initially */
  defaultAdvancedOpen?: boolean;
  /** Show result count (default: true) */
  showResultCount?: boolean;
  /** Show active filter chips (default: true) */
  showChips?: boolean;
  /** Show preset buttons (default: true) */
  showPresets?: boolean;
  /** Optional content to render after presets/chips in the same row (e.g. Save Current Filters) */
  presetsSuffix?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type FilterValue =
  | string
  | string[]
  | number
  | number[]
  | boolean
  | Date
  | null
  | undefined
  | { min?: number | null; max?: number | null }
  | { from?: Date | null; to?: Date | null };

export function isEmptyFilterValue(value: FilterValue): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && value !== null) {
    if ("min" in value && "max" in value) {
      return value.min === null && value.max === null;
    }
    if ("from" in value && "to" in value) {
      return value.from === null && value.to === null;
    }
  }
  return false;
}

export function countActiveFilters<T extends Record<string, unknown>>(
  filters: T,
  excludeKeys: (keyof T)[] = ["search" as keyof T]
): number {
  return Object.entries(filters).filter(
    ([key, value]) => !excludeKeys.includes(key as keyof T) && !isEmptyFilterValue(value as FilterValue)
  ).length;
}
