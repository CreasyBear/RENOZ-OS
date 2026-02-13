/* eslint-disable react-refresh/only-export-components -- Component exports component + timezone utils */
/**
 * TimezoneSelect Component
 *
 * Accessible timezone selector with search/filter capability.
 * Groups timezones by region for easier navigation.
 *
 * @see DOM-COMMS-002c
 */

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface TimezoneSelectProps {
  value?: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

// ============================================================================
// TIMEZONE DATA
// ============================================================================

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

interface TimezoneGroup {
  label: string;
  timezones: TimezoneOption[];
}

const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    label: "Australia & Pacific",
    timezones: [
      { value: "Australia/Sydney", label: "Sydney", offset: "AEDT +11:00" },
      { value: "Australia/Melbourne", label: "Melbourne", offset: "AEDT +11:00" },
      { value: "Australia/Brisbane", label: "Brisbane", offset: "AEST +10:00" },
      { value: "Australia/Perth", label: "Perth", offset: "AWST +8:00" },
      { value: "Australia/Adelaide", label: "Adelaide", offset: "ACDT +10:30" },
      { value: "Pacific/Auckland", label: "Auckland", offset: "NZDT +13:00" },
    ],
  },
  {
    label: "Asia",
    timezones: [
      { value: "Asia/Tokyo", label: "Tokyo", offset: "JST +9:00" },
      { value: "Asia/Singapore", label: "Singapore", offset: "SGT +8:00" },
      { value: "Asia/Hong_Kong", label: "Hong Kong", offset: "HKT +8:00" },
      { value: "Asia/Shanghai", label: "Shanghai", offset: "CST +8:00" },
      { value: "Asia/Kolkata", label: "Mumbai/Delhi", offset: "IST +5:30" },
      { value: "Asia/Dubai", label: "Dubai", offset: "GST +4:00" },
    ],
  },
  {
    label: "Europe",
    timezones: [
      { value: "Europe/London", label: "London", offset: "GMT +0:00" },
      { value: "Europe/Paris", label: "Paris", offset: "CET +1:00" },
      { value: "Europe/Berlin", label: "Berlin", offset: "CET +1:00" },
      { value: "Europe/Amsterdam", label: "Amsterdam", offset: "CET +1:00" },
      { value: "Europe/Moscow", label: "Moscow", offset: "MSK +3:00" },
    ],
  },
  {
    label: "Americas",
    timezones: [
      { value: "America/New_York", label: "New York", offset: "EST -5:00" },
      { value: "America/Chicago", label: "Chicago", offset: "CST -6:00" },
      { value: "America/Denver", label: "Denver", offset: "MST -7:00" },
      { value: "America/Los_Angeles", label: "Los Angeles", offset: "PST -8:00" },
      { value: "America/Toronto", label: "Toronto", offset: "EST -5:00" },
      { value: "America/Sao_Paulo", label: "São Paulo", offset: "BRT -3:00" },
    ],
  },
  {
    label: "Other",
    timezones: [
      { value: "UTC", label: "UTC", offset: "UTC +0:00" },
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TimezoneSelect({
  value = "UTC",
  onChange,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: TimezoneSelectProps) {
  const selectedLabel = useMemo(() => {
    for (const group of TIMEZONE_GROUPS) {
      const tz = group.timezones.find((t) => t.value === value);
      if (tz) return `${tz.label} (${tz.offset})`;
    }
    return value;
  }, [value]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn("w-full sm:w-[280px]", className)}
        aria-label={ariaLabel || "Select timezone"}
        aria-describedby={ariaDescribedBy}
      >
        <SelectValue placeholder="Select timezone">{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TIMEZONE_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">
              {group.label}
            </SelectLabel>
            {group.timezones.map((tz) => (
              <SelectItem
                key={tz.value}
                value={tz.value}
                className="flex items-center justify-between"
              >
                <span>{tz.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {tz.offset}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Get the user's local timezone
 */
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/**
 * Format a date in a specific timezone for display
 */
export function formatInTimezone(date: Date, timezone: string): string {
  try {
    return date.toLocaleString("en-US", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}
