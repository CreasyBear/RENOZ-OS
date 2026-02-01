/**
 * Filter Number Range
 *
 * Min/Max number inputs for range filtering.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterNumberRangeProps } from "./types";

/**
 * Number range input for min/max filtering.
 *
 * @example
 * ```tsx
 * <FilterNumberRange
 *   min={filters.minTotal}
 *   max={filters.maxTotal}
 *   onChange={(min, max) => setFilters({ ...filters, minTotal: min, maxTotal: max })}
 *   label="Total Amount"
 *   prefix="$"
 * />
 * ```
 */
export const FilterNumberRange = memo(function FilterNumberRange({
  min,
  max,
  onChange,
  label,
  prefix,
  suffix,
  step = 1,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  className,
  disabled = false,
}: FilterNumberRangeProps) {
  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newMin = value === "" ? null : Number(value);
      // Auto-swap if min > max
      if (newMin !== null && max !== null && newMin > max) {
        onChange(max, newMin);
      } else {
        onChange(newMin, max);
      }
    },
    [max, onChange]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newMax = value === "" ? null : Number(value);
      // Auto-swap if max < min
      if (newMax !== null && min !== null && newMax < min) {
        onChange(newMax, min);
      } else {
        onChange(min, newMax);
      }
    },
    [min, onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          <Input
            type="number"
            inputMode="numeric"
            placeholder={minPlaceholder}
            value={min ?? ""}
            onChange={handleMinChange}
            step={step}
            disabled={disabled}
            className={cn(prefix && "pl-7", suffix && "pr-7")}
            aria-label={`${label ? `${label} ` : ""}minimum`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <span className="text-muted-foreground shrink-0">-</span>
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          <Input
            type="number"
            inputMode="numeric"
            placeholder={maxPlaceholder}
            value={max ?? ""}
            onChange={handleMaxChange}
            step={step}
            disabled={disabled}
            className={cn(prefix && "pl-7", suffix && "pr-7")}
            aria-label={`${label ? `${label} ` : ""}maximum`}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

FilterNumberRange.displayName = "FilterNumberRange";
