/**
 * Filter Date Range
 *
 * From/To date range picker with calendar popover.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useState } from "react";
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
import type { FilterDateRangeProps } from "./types";
import type { DateRange } from "react-day-picker";

/**
 * Date range picker for filters.
 *
 * @example
 * ```tsx
 * <FilterDateRange
 *   from={filters.dateFrom}
 *   to={filters.dateTo}
 *   onChange={(from, to) => setFilters({ ...filters, dateFrom: from, dateTo: to })}
 *   label="Date Range"
 * />
 * ```
 */
export const FilterDateRange = memo(function FilterDateRange({
  from,
  to,
  onChange,
  placeholder = "Select date range",
  label,
  className,
  disabled = false,
}: FilterDateRangeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dateRange: DateRange | undefined =
    from || to ? { from: from ?? undefined, to: to ?? undefined } : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    let fromDate = range?.from ?? null;
    let toDate = range?.to ?? null;

    // Auto-swap if from > to
    if (fromDate && toDate && fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }

    onChange(fromDate, toDate);
    // Close popover when both dates are selected
    if (fromDate && toDate) {
      setIsOpen(false);
    }
  };

  const formatDisplay = () => {
    if (!from && !to) return placeholder;
    if (from && to) {
      return `${format(from, "dd/MM/yyyy")} - ${format(to, "dd/MM/yyyy")}`;
    }
    if (from) return `From ${format(from, "dd/MM/yyyy")}`;
    if (to) return `To ${format(to, "dd/MM/yyyy")}`;
    return placeholder;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !from && !to && "text-muted-foreground"
            )}
            disabled={disabled}
            aria-label={label ?? placeholder}
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            <span className="truncate">{formatDisplay()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
});

FilterDateRange.displayName = "FilterDateRange";
