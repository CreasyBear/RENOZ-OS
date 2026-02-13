/**
 * Filter Select
 *
 * Single-select dropdown with "All" option for filters.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, type ReactElement } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterSelectProps } from "./types";

const ALL_VALUE = "__all__";

/**
 * Single-select filter dropdown with automatic "All" option.
 *
 * @example
 * ```tsx
 * <FilterSelect
 *   value={filters.status}
 *   onChange={(status) => setFilters({ ...filters, status })}
 *   options={ORDER_STATUSES}
 *   placeholder="All Statuses"
 * />
 * ```
 */
export const FilterSelect = memo(function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "All",
  label,
  allLabel = "All",
  className,
  disabled = false,
}: FilterSelectProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <Select
        value={value ?? ALL_VALUE}
        onValueChange={(v) => onChange(v === ALL_VALUE ? null : (v as T))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" aria-label={label ?? placeholder}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>
          {(options ?? []).map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              <span className="flex items-center gap-2">
                {option.icon && (
                  <option.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}) as <T extends string>(props: FilterSelectProps<T>) => ReactElement;

(FilterSelect as { displayName?: string }).displayName = "FilterSelect";
