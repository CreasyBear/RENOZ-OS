/**
 * Filter Toggle
 *
 * Boolean switch/checkbox for on/off filters.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterToggleProps } from "./types";

/**
 * Boolean toggle for filters.
 *
 * @example
 * ```tsx
 * <FilterToggle
 *   value={filters.showArchived}
 *   onChange={(checked) => setFilters({ ...filters, showArchived: checked })}
 *   label="Show Archived"
 * />
 * ```
 */
export const FilterToggle = memo(function FilterToggle({
  value,
  onChange,
  label,
  className,
  disabled = false,
}: FilterToggleProps) {
  const id = `filter-toggle-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Switch
        id={id}
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
      <Label
        htmlFor={id}
        className="text-sm font-medium cursor-pointer select-none"
      >
        {label}
      </Label>
    </div>
  );
});

FilterToggle.displayName = "FilterToggle";
