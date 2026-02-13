/**
 * Domain Filter Bar
 *
 * Config-driven filter bar component for consistent filtering UX across all domains.
 * Renders search, primary filters, advanced filters, chips, and presets.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useState, useMemo, useCallback } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FilterSearchInput } from "./filter-search-input";
import { FilterSelect } from "./filter-select";
import { FilterMultiSelect } from "./filter-multi-select";
import { FilterDatePicker } from "./filter-date-picker";
import { FilterDateRange } from "./filter-date-range";
import { FilterNumberRange } from "./filter-number-range";
import { FilterToggle } from "./filter-toggle";
import { FilterChipsBar } from "./filter-chips-bar";
import { FilterPresets } from "./filter-presets";
import type {
  DomainFilterBarProps,
  FilterFieldConfig,
  FilterValue,
} from "./types";
import { countActiveFilters } from "./types";

/**
 * Render a single filter field based on its config.
 * @param compact - When true, use label as placeholder instead of above the control (for primary row alignment)
 */
function renderFilterField<TFilters extends Record<string, unknown>>(
  config: FilterFieldConfig,
  filters: TFilters,
  onFiltersChange: (filters: TFilters) => void,
  compact?: boolean
): React.ReactNode {
  const value = filters[config.key as keyof TFilters];

  const updateFilter = (newValue: FilterValue) => {
    onFiltersChange({ ...filters, [config.key]: newValue });
  };

  switch (config.type) {
    case "select":
      return (
        <FilterSelect
          value={value as string | null}
          onChange={updateFilter}
          options={config.options ?? []}
          placeholder={compact ? (config.placeholder ?? config.label) : config.placeholder}
          label={compact ? undefined : config.label}
          allLabel={config.allLabel}
          disabled={config.disabled}
        />
      );

    case "multi-select":
      return (
        <FilterMultiSelect
          value={(value as string[]) ?? []}
          onChange={updateFilter}
          options={config.options ?? []}
          placeholder={compact ? (config.placeholder ?? config.label) : config.placeholder}
          label={compact ? undefined : config.label}
          maxSelections={config.maxSelections}
          disabled={config.disabled}
        />
      );

    case "date":
      return (
        <FilterDatePicker
          value={value as Date | null}
          onChange={updateFilter}
          placeholder={config.placeholder}
          label={config.label}
          disabled={config.disabled}
        />
      );

    case "date-range": {
      const rangeValue = value as { from?: Date | null; to?: Date | null } | null;
      return (
        <FilterDateRange
          from={rangeValue?.from ?? null}
          to={rangeValue?.to ?? null}
          onChange={(from, to) => updateFilter({ from, to })}
          placeholder={config.placeholder}
          label={config.label}
          disabled={config.disabled}
        />
      );
    }

    case "number-range": {
      const numValue = value as { min?: number | null; max?: number | null } | null;
      return (
        <FilterNumberRange
          min={numValue?.min ?? null}
          max={numValue?.max ?? null}
          onChange={(min, max) => updateFilter({ min, max })}
          minPlaceholder={config.minPlaceholder}
          maxPlaceholder={config.maxPlaceholder}
          prefix={config.prefix}
          suffix={config.suffix}
          step={config.step}
          label={config.label}
          disabled={config.disabled}
        />
      );
    }

    case "toggle":
      return (
        <FilterToggle
          value={value as boolean}
          onChange={updateFilter}
          label={config.label}
          disabled={config.disabled}
        />
      );

    default:
      return null;
  }
}

/**
 * Config-driven domain filter bar.
 *
 * @example
 * ```tsx
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
 * <DomainFilterBar
 *   config={ORDER_FILTER_CONFIG}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   defaultFilters={DEFAULT_ORDER_FILTERS}
 *   resultCount={orders.length}
 * />
 * ```
 */
export const DomainFilterBar = memo(function DomainFilterBar<
  TFilters extends Record<string, unknown>
>({
  config,
  filters,
  onFiltersChange,
  defaultFilters,
  resultCount,
  defaultAdvancedOpen = false,
  showResultCount = true,
  showChips = true,
  showPresets = true,
  presetsSuffix,
  className,
}: DomainFilterBarProps<TFilters>) {
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);

  // Split filters into primary and advanced
  const { primaryFilters, advancedFilters } = useMemo(() => {
    const primary: FilterFieldConfig[] = [];
    const advanced: FilterFieldConfig[] = [];

    for (const field of config.filters) {
      if (field.primary) {
        primary.push(field);
      } else {
        advanced.push(field);
      }
    }

    return { primaryFilters: primary, advancedFilters: advanced };
  }, [config.filters]);

  // Count active filters (excluding search)
  const activeFilterCount = useMemo(() => {
    return countActiveFilters(filters, ["search"]);
  }, [filters]);

  // Update search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value } as TFilters);
    },
    [filters, onFiltersChange]
  );

  // Apply preset handler
  const handleApplyPreset = useCallback(
    (presetFilters: Partial<TFilters>) => {
      onFiltersChange({ ...filters, ...presetFilters });
    },
    [filters, onFiltersChange]
  );

  // Check if advanced panel should be shown
  const hasAdvancedFilters = advancedFilters.length > 0;
  const hasPresets = showPresets && config.presets && config.presets.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Primary Row: Search + Primary Filters + Result Count + Advanced Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-h-10">
        {/* Search Input */}
        {config.search && (
          <div className="flex-1 min-w-[200px]">
            <FilterSearchInput
              value={filters.search as string ?? ""}
              onChange={handleSearchChange}
              placeholder={config.search.placeholder}
              debounceMs={config.search.debounceMs}
            />
          </div>
        )}

        {/* Primary Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {primaryFilters.map((field) => (
            <div key={field.key} className="min-w-[140px]">
              {renderFilterField(field, filters, onFiltersChange, true)}
            </div>
          ))}
        </div>

        {/* Result Count */}
        {showResultCount && resultCount !== undefined && (
          <div className="flex items-center shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {resultCount.toLocaleString()} result{resultCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Advanced Filters - Dialog to avoid layout shift */}
        {hasAdvancedFilters && (
          <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                aria-label="Open advanced filters"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Advanced Filters</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFiltersChange(defaultFilters)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {advancedFilters.map((field) => (
                    <div key={field.key}>
                      {renderFilterField(field, filters, onFiltersChange)}
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Presets + Chips + suffix (e.g. Save Current Filters) on one row */}
      {(hasPresets || showChips || presetsSuffix) && (
        <div className="flex flex-wrap items-center gap-2 min-h-8">
          {hasPresets && (
            <FilterPresets
              presets={config.presets!}
              currentFilters={filters}
              onApply={handleApplyPreset}
            />
          )}
          {showChips && (
            <FilterChipsBar
              filters={filters}
              onChange={onFiltersChange}
              config={config}
              defaultFilters={defaultFilters}
            />
          )}
          {presetsSuffix}
        </div>
      )}
    </div>
  );
}) as <TFilters extends Record<string, unknown>>(
  props: DomainFilterBarProps<TFilters>
) => React.ReactElement;

(DomainFilterBar as { displayName?: string }).displayName = "DomainFilterBar";
