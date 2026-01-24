/**
 * Date Range Presets Utility
 *
 * Provides standardized date range presets for dashboard filtering.
 * Supports Australian fiscal year (July 1 - June 30).
 *
 * @see DASH-DATE-RANGE
 * @see wireframes/dashboard-date-range.wireframe.md
 */

import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  subYears,
  addMonths,
  setMonth,
  setDate,
  isBefore,
  isAfter,
  differenceInDays,
} from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DatePreset {
  /** Display label (e.g., "This Month") */
  label: string;
  /** Short label for mobile (e.g., "Month") */
  shortLabel: string;
  /** URL-safe identifier (e.g., "this-month") */
  value: string;
  /** Function to compute the date range */
  getRange: (today?: Date) => DateRange;
}

export interface PresetOption {
  label: string;
  shortLabel: string;
  value: string;
  dateRange: DateRange;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Australian fiscal year starts July 1 */
export const AUSTRALIAN_FISCAL_YEAR_START_MONTH = 6; // 0-indexed (July = 6)

/** Maximum allowed date range in days */
export const MAX_RANGE_DAYS = 365;

// ============================================================================
// FISCAL YEAR HELPERS
// ============================================================================

/**
 * Get the start of the fiscal year containing the given date.
 * Australian fiscal year: July 1 - June 30
 */
export function startOfFiscalYear(date: Date, fiscalYearStartMonth = AUSTRALIAN_FISCAL_YEAR_START_MONTH): Date {
  const year = date.getFullYear();
  const month = date.getMonth();

  // If we're before July, fiscal year started last calendar year
  if (month < fiscalYearStartMonth) {
    return startOfDay(setDate(setMonth(new Date(year - 1, 0, 1), fiscalYearStartMonth), 1));
  }

  // Fiscal year started this calendar year
  return startOfDay(setDate(setMonth(new Date(year, 0, 1), fiscalYearStartMonth), 1));
}

/**
 * Get the end of the fiscal year containing the given date.
 * Australian fiscal year: July 1 - June 30
 */
export function endOfFiscalYear(date: Date, fiscalYearStartMonth = AUSTRALIAN_FISCAL_YEAR_START_MONTH): Date {
  const fyStart = startOfFiscalYear(date, fiscalYearStartMonth);
  // End of fiscal year is the last day of the month before the start month, next calendar year
  return endOfDay(endOfMonth(subDays(addMonths(fyStart, 12), 1)));
}

// ============================================================================
// PRESET DEFINITIONS
// ============================================================================

/**
 * Standard date range presets for dashboard filtering.
 * Week starts on Monday (Australian convention).
 */
export const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    shortLabel: "Today",
    value: "today",
    getRange: (today = new Date()) => ({
      from: startOfDay(today),
      to: endOfDay(today),
    }),
  },
  {
    label: "This Week",
    shortLabel: "Week",
    value: "this-week",
    getRange: (today = new Date()) => ({
      from: startOfWeek(today, { weekStartsOn: 1 }), // Monday
      to: endOfWeek(today, { weekStartsOn: 1 }), // Sunday
    }),
  },
  {
    label: "This Month",
    shortLabel: "Month",
    value: "this-month",
    getRange: (today = new Date()) => ({
      from: startOfMonth(today),
      to: endOfMonth(today),
    }),
  },
  {
    label: "This Quarter",
    shortLabel: "Quarter",
    value: "this-quarter",
    getRange: (today = new Date()) => ({
      from: startOfQuarter(today),
      to: endOfQuarter(today),
    }),
  },
  {
    label: "Year to Date",
    shortLabel: "YTD",
    value: "ytd",
    getRange: (today = new Date()) => ({
      from: startOfFiscalYear(today),
      to: endOfDay(today),
    }),
  },
  {
    label: "Last 7 Days",
    shortLabel: "7 Days",
    value: "last-7-days",
    getRange: (today = new Date()) => ({
      from: startOfDay(subDays(today, 6)),
      to: endOfDay(today),
    }),
  },
  {
    label: "Last 30 Days",
    shortLabel: "30 Days",
    value: "last-30-days",
    getRange: (today = new Date()) => ({
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
    }),
  },
  {
    label: "Last 90 Days",
    shortLabel: "90 Days",
    value: "last-90-days",
    getRange: (today = new Date()) => ({
      from: startOfDay(subDays(today, 89)),
      to: endOfDay(today),
    }),
  },
  {
    label: "Last Month",
    shortLabel: "Last Mo",
    value: "last-month",
    getRange: (today = new Date()) => ({
      from: startOfMonth(subMonths(today, 1)),
      to: endOfMonth(subMonths(today, 1)),
    }),
  },
  {
    label: "Last Year",
    shortLabel: "Last Yr",
    value: "last-year",
    getRange: (today = new Date()) => ({
      from: startOfYear(subYears(today, 1)),
      to: endOfYear(subYears(today, 1)),
    }),
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all preset options with computed date ranges for the current date.
 */
export function getPresetOptions(today = new Date()): PresetOption[] {
  return DATE_PRESETS.map((preset) => ({
    label: preset.label,
    shortLabel: preset.shortLabel,
    value: preset.value,
    dateRange: preset.getRange(today),
  }));
}

/**
 * Get a specific preset by its value.
 */
export function getPresetByValue(value: string): DatePreset | undefined {
  return DATE_PRESETS.find((preset) => preset.value === value);
}

/**
 * Get the date range for a specific preset value.
 */
export function getPresetRange(value: string, today = new Date()): DateRange | undefined {
  const preset = getPresetByValue(value);
  return preset?.getRange(today);
}

/**
 * Check if a date range matches a preset.
 * Returns the preset value if matched, or "custom" if no match.
 */
export function detectPreset(range: DateRange, today = new Date()): string {
  const options = getPresetOptions(today);

  for (const option of options) {
    if (
      isSameDay(range.from, option.dateRange.from) &&
      isSameDay(range.to, option.dateRange.to)
    ) {
      return option.value;
    }
  }

  return "custom";
}

/**
 * Helper to check if two dates are the same day.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Validate a date range.
 * Returns validation result with errors if any.
 */
export function validateDateRange(range: DateRange): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = new Date();

  // Check if end date is after start date
  if (isBefore(range.to, range.from)) {
    errors.push("End date must be after start date");
  }

  // Check maximum range
  const daysDiff = differenceInDays(range.to, range.from);
  if (daysDiff > MAX_RANGE_DAYS) {
    errors.push(`Maximum range is ${MAX_RANGE_DAYS} days. Please select a shorter range.`);
  }

  // Check for future dates (warning, not error)
  if (isAfter(range.to, endOfDay(today))) {
    warnings.push("Range includes future dates. Some widgets may show partial data.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format a date range for display.
 * Returns a human-readable string like "Dec 1 - Dec 10, 2024"
 */
export function formatDateRange(range: DateRange): string {
  const fromYear = range.from.getFullYear();
  const toYear = range.to.getFullYear();
  const sameYear = fromYear === toYear;

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  const fromStr = range.from.toLocaleDateString("en-AU", options);
  const toStr = range.to.toLocaleDateString("en-AU", {
    ...options,
    year: "numeric",
  });

  if (sameYear) {
    return `${fromStr} - ${toStr}`;
  }

  const fromWithYear = range.from.toLocaleDateString("en-AU", {
    ...options,
    year: "numeric",
  });
  return `${fromWithYear} - ${toStr}`;
}

/**
 * Get the number of days in a date range.
 */
export function getRangeDays(range: DateRange): number {
  return differenceInDays(range.to, range.from) + 1;
}

/**
 * Convert date range to URL search params.
 */
export function dateRangeToSearchParams(
  range: DateRange,
  preset?: string
): Record<string, string> {
  const detectedPreset = preset ?? detectPreset(range);

  if (detectedPreset !== "custom") {
    return { dateRange: detectedPreset };
  }

  return {
    dateRange: "custom",
    start: range.from.toISOString().split("T")[0],
    end: range.to.toISOString().split("T")[0],
  };
}

/**
 * Parse date range from URL search params.
 * Returns a valid date range or default to "this-month".
 */
export function dateRangeFromSearchParams(
  params: Record<string, string | undefined>,
  today = new Date()
): { range: DateRange; preset: string } {
  const dateRange = params.dateRange ?? "this-month";

  if (dateRange === "custom") {
    const start = params.start;
    const end = params.end;

    if (start && end) {
      const from = new Date(start);
      const to = new Date(end);

      // Validate the parsed dates
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        const validation = validateDateRange({ from: startOfDay(from), to: endOfDay(to) });
        if (validation.isValid) {
          return {
            range: { from: startOfDay(from), to: endOfDay(to) },
            preset: "custom",
          };
        }
      }
    }
  }

  // Try to find a matching preset
  const presetRange = getPresetRange(dateRange, today);
  if (presetRange) {
    return { range: presetRange, preset: dateRange };
  }

  // Default to this month
  const defaultPreset = DATE_PRESETS.find((p) => p.value === "this-month")!;
  return {
    range: defaultPreset.getRange(today),
    preset: "this-month",
  };
}

/**
 * Default preset for initial dashboard load.
 */
export const DEFAULT_PRESET = "this-month";
