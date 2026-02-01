/**
 * Filter Date Picker
 *
 * Single date picker with calendar popover.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FilterDatePickerProps } from "./types";

/**
 * Single date picker for filters.
 *
 * @example
 * ```tsx
 * <FilterDatePicker
 *   value={filters.dateFrom}
 *   onChange={(date) => setFilters({ ...filters, dateFrom: date })}
 *   label="From Date"
 * />
 * ```
 */
export const FilterDatePicker = memo(function FilterDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  className,
  disabled = false,
}: FilterDatePickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
            aria-label={label ?? placeholder}
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {value ? format(value, "dd/MM/yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(date) => onChange(date ?? null)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

FilterDatePicker.displayName = "FilterDatePicker";
