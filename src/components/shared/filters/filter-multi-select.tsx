/**
 * Filter Multi-Select
 *
 * Checkbox dropdown for selecting multiple values.
 *
 * @see docs/design-system/FILTER-STANDARDS.md
 */

import { memo, useState, type ReactElement } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FilterMultiSelectProps } from "./types";

/**
 * Multi-select filter with checkbox dropdown.
 *
 * @example
 * ```tsx
 * <FilterMultiSelect
 *   value={filters.statuses}
 *   onChange={(statuses) => setFilters({ ...filters, statuses })}
 *   options={STATUS_OPTIONS}
 *   placeholder="Select statuses"
 * />
 * ```
 */
export const FilterMultiSelect = memo(function FilterMultiSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select...",
  label,
  maxDisplay = 2,
  maxSelections,
  className,
  disabled = false,
}: FilterMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const handleToggle = (optionValue: T, checked: boolean) => {
    if (checked) {
      if (maxSelections === 1) {
        onChange([optionValue]);
        return;
      }
      if (maxSelections && value.length >= maxSelections) {
        const trimmed = value.slice(1 - maxSelections);
        onChange([...trimmed, optionValue]);
        return;
      }
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= maxDisplay
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, maxDisplay).join(", ")} +${selectedLabels.length - maxDisplay}`;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
            aria-label={label ?? placeholder}
          >
            <span className="truncate">{displayText}</span>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {value.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {value.length}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>{label ?? "Options"}</span>
            {value.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={String(option.value)}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => handleToggle(option.value, checked)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex items-center gap-2">
                {option.icon && (
                  <option.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                {option.label}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}) as <T extends string>(props: FilterMultiSelectProps<T>) => ReactElement;

(FilterMultiSelect as { displayName?: string }).displayName = "FilterMultiSelect";
