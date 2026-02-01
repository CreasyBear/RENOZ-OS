/**
 * Filter Search Input
 *
 * Search input with icon, clear button, and optional debounce.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FilterSearchInputProps } from "./types";

/**
 * Search input with icon and clear button.
 *
 * @example
 * ```tsx
 * <FilterSearchInput
 *   value={filters.search}
 *   onChange={(search) => setFilters({ ...filters, search })}
 *   placeholder="Search orders..."
 * />
 * ```
 */
export const FilterSearchInput = memo(function FilterSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
  disabled = false,
}: FilterSearchInputProps) {
  // Internal state for immediate UI feedback
  const [internalValue, setInternalValue] = useState(value);

  // Sync internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    if (internalValue === value) return;

    const timer = setTimeout(() => {
      onChange(internalValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange, debounceMs]);

  const handleClear = useCallback(() => {
    setInternalValue("");
    onChange("");
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        disabled={disabled}
        className="pl-10 pr-10"
        aria-label={placeholder}
      />
      {internalValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

FilterSearchInput.displayName = "FilterSearchInput";
