/* eslint-disable react-refresh/only-export-components -- Component exports component + filter config */
/**
 * Activity Filters Component
 *
 * Filter bar for activity feed with URL parameter sync for deep-linkability.
 * Supports filtering by entity type, action, date range, and user.
 *
 * @see ACTIVITY-FEED-UI acceptance criteria
 */

import * as React from "react";
import { X, CalendarIcon, AlertCircle, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterPresets } from "@/components/shared/filters/filter-presets";
import type { FilterPreset } from "@/components/shared/filters/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  activityActionValues,
  activityEntityTypeValues,
  type ActivityAction,
  type ActivityEntityType,
} from "@/lib/schemas/activities";
import {
  ACTION_ICONS,
  ACTION_LABELS,
  ENTITY_ICONS,
  ENTITY_LABELS,
} from "./activity-config";

// ============================================================================
// TYPES
// ============================================================================

export interface ActivityFiltersValue {
  entityType?: ActivityEntityType;
  action?: ActivityAction;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ActivityFiltersProps {
  value: ActivityFiltersValue;
  onChange: (value: ActivityFiltersValue) => void;
  /** Available users for user filter (optional) */
  users?: Array<{ id: string; name: string | null; email: string }>;
  /** Current user ID for "My activities" preset */
  currentUserId?: string;
  /** Show filter presets (default: true) */
  showPresets?: boolean;
  className?: string;
}

// ============================================================================
// FILTER PRESETS
// ============================================================================

/**
 * Common activity filter presets for quick access.
 */
export function getActivityFilterPresets(
  currentUserId?: string
): FilterPreset<ActivityFiltersValue>[] {
  const presets: FilterPreset<ActivityFiltersValue>[] = [
    {
      id: "recent",
      label: "Recent",
      icon: Clock,
      filters: {
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
  ];

  if (currentUserId) {
    presets.push({
      id: "my-activities",
      label: "My activities",
      icon: User,
      filters: {
        userId: currentUserId,
      },
    });
  }

  presets.push({
    id: "requires-attention",
    label: "Requires attention",
    icon: AlertCircle,
    filters: {
      action: "created", // New items that might need review
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    },
  });

  return presets;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Filter bar for activity feed.
 *
 * URL sync should be handled by the parent route component using
 * TanStack Router's search params validation.
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<ActivityFiltersValue>({});
 *
 * <ActivityFilters
 *   value={filters}
 *   onChange={setFilters}
 * />
 * ```
 */
export function ActivityFilters({
  value,
  onChange,
  users,
  currentUserId,
  showPresets = true,
  className,
}: ActivityFiltersProps) {
  const handleChange = (newValue: Partial<ActivityFiltersValue>) => {
    const updated = { ...value, ...newValue };
    onChange(updated);
  };

  const handleClear = (key: keyof ActivityFiltersValue) => {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  };

  const handleClearAll = () => {
    onChange({});
  };

  const handlePresetApply = (presetFilters: Partial<ActivityFiltersValue>) => {
    onChange({ ...value, ...presetFilters });
  };

  const activeFilterCount = Object.values(value).filter(Boolean).length;
  const hasDateRange = value.dateFrom || value.dateTo;
  const presets = React.useMemo(
    () => getActivityFilterPresets(currentUserId),
    [currentUserId]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Entity type filter */}
        <Select
          value={value.entityType ?? "__ALL__"}
          onValueChange={(val) =>
            handleChange({ entityType: val !== "__ALL__" ? (val as ActivityEntityType) : undefined })
          }
        >
          <SelectTrigger className="w-[140px]" aria-label="Filter by entity type">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All types</SelectItem>
            {activityEntityTypeValues.map((type) => {
              const Icon = ENTITY_ICONS[type];
              return (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {ENTITY_LABELS[type]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Action filter */}
        <Select
          value={value.action ?? "__ALL__"}
          onValueChange={(val) =>
            handleChange({ action: val !== "__ALL__" ? (val as ActivityAction) : undefined })
          }
        >
          <SelectTrigger className="w-[130px]" aria-label="Filter by action">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__ALL__">All actions</SelectItem>
            {activityActionValues.map((action) => {
              const Icon = ACTION_ICONS[action];
              return (
                <SelectItem key={action} value={action}>
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {ACTION_LABELS[action]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* User filter (if users provided) */}
        {users && users.length > 0 && (
          <Select
            value={value.userId ?? "__ALL__"}
            onValueChange={(val) =>
              handleChange({ userId: val !== "__ALL__" ? val : undefined })
            }
          >
            <SelectTrigger className="w-[160px]" aria-label="Filter by user">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">All users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name ?? user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Date range picker */}
        <DateRangePicker
          value={
            hasDateRange
              ? { from: value.dateFrom, to: value.dateTo }
              : undefined
          }
          onChange={(range) =>
            handleChange({
              dateFrom: range?.from,
              dateTo: range?.to,
            })
          }
        />

        {/* Clear all button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-muted-foreground"
            aria-label="Clear all filters"
          >
            <X className="w-4 h-4 mr-1" aria-hidden="true" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Filter presets */}
      {showPresets && presets.length > 0 && (
        <FilterPresets
          presets={presets}
          currentFilters={value}
          onApply={handlePresetApply}
        />
      )}

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
          {value.entityType && (
            <FilterBadge
              label={`Type: ${ENTITY_LABELS[value.entityType]}`}
              onRemove={() => handleClear("entityType")}
            />
          )}
          {value.action && (
            <FilterBadge
              label={`Action: ${ACTION_LABELS[value.action]}`}
              onRemove={() => handleClear("action")}
            />
          )}
          {value.userId && users && (
            <FilterBadge
              label={`User: ${users.find((u) => u.id === value.userId)?.name ?? "Unknown"}`}
              onRemove={() => handleClear("userId")}
            />
          )}
          {(value.dateFrom || value.dateTo) && (
            <FilterBadge
              label={formatDateRangeLabel(value.dateFrom, value.dateTo)}
              onRemove={() => {
                handleClear("dateFrom");
                handleClear("dateTo");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function FilterBadge({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1"
      role="listitem"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full hover:bg-muted p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" aria-hidden="true" />
      </button>
    </Badge>
  );
}

function DateRangePicker({
  value,
  onChange,
}: {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (range?: DateRange) => {
    if (range?.from) {
      const adjusted: DateRange = {
        from: startOfDay(range.from),
        to: range.to ? endOfDay(range.to) : undefined,
      };
      onChange(adjusted);
    } else {
      onChange(undefined);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[200px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
          aria-label="Select date range"
        >
          <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "LLL dd")} - {format(value.to, "LLL dd")}
              </>
            ) : (
              format(value.from, "LLL dd, y")
            )
          ) : (
            "Date range"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDateRangeLabel(from?: Date, to?: Date): string {
  if (from && to) {
    return `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
  }
  if (from) {
    return `From ${format(from, "MMM d, yyyy")}`;
  }
  if (to) {
    return `Until ${format(to, "MMM d, yyyy")}`;
  }
  return "Date range";
}

/**
 * Hook to sync filters from URL search params.
 * Use with TanStack Router's searchParams validation.
 */
export function useActivityFiltersFromUrl(): ActivityFiltersValue {
  // This would be used with route search params validation
  // Example: const search = useSearch({ from: "/_authed/activities" });
  // For now, return empty - the actual implementation depends on route setup
  return {};
}
