/**
 * Filter Chip
 *
 * Removable badge displaying an active filter.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FilterChipProps } from "./types";

/**
 * Removable filter chip showing active filter.
 *
 * @example
 * ```tsx
 * <FilterChip
 *   label="Status"
 *   value="Draft"
 *   onRemove={() => clearFilter("status")}
 * />
 * ```
 */
export const FilterChip = memo(function FilterChip({
  label,
  value,
  onRemove,
  className,
}: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 pr-1 max-w-[200px] h-7",
        className
      )}
    >
      <span className="truncate">
        <span className="text-muted-foreground">{label}:</span>{" "}
        <span className="font-medium">{value}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-full p-0.5 shrink-0"
        aria-label={`Clear ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
});

FilterChip.displayName = "FilterChip";
