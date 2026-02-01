/**
 * Filter Presets
 *
 * Quick filter buttons for common filter combinations.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FilterPresetsProps, FilterPreset } from "./types";

/**
 * Check if a preset is currently active.
 */
function isPresetActive<T>(
  preset: FilterPreset<T>,
  currentFilters: T
): boolean {
  return Object.entries(preset.filters).every(([key, value]) => {
    const currentValue = currentFilters[key as keyof T];
    // Deep equality check for objects/arrays
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value) === JSON.stringify(currentValue);
    }
    return currentValue === value;
  });
}

/**
 * Quick filter preset buttons.
 *
 * @example
 * ```tsx
 * <FilterPresets
 *   presets={ORDER_PRESETS}
 *   currentFilters={filters}
 *   onApply={(preset) => setFilters({ ...filters, ...preset })}
 * />
 * ```
 */
export const FilterPresets = memo(function FilterPresets<TFilters>({
  presets,
  currentFilters,
  onApply,
  className,
}: FilterPresetsProps<TFilters>) {
  if (!presets || presets.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {presets.map((preset) => {
        const Icon = preset.icon;
        const isActive = isPresetActive(preset, currentFilters);

        return (
          <Button
            key={preset.id}
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            onClick={() => onApply(preset.filters)}
            className={cn(
              "h-8",
              isActive && "border-primary ring-1 ring-primary/20"
            )}
          >
            {Icon && (
              <Icon
                className="h-3.5 w-3.5 mr-1.5"
                aria-hidden="true"
              />
            )}
            {preset.label}
          </Button>
        );
      })}
    </div>
  );
}) as <TFilters>(props: FilterPresetsProps<TFilters>) => ReactElement | null;

(FilterPresets as { displayName?: string }).displayName = "FilterPresets";
