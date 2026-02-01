/**
 * FormatDate Component
 *
 * Displays dates with consistent formatting using organization settings.
 * Uses locale, timezone, and dateFormat from OrganizationSettingsContext.
 *
 * @example
 * ```tsx
 * // Basic usage - uses org settings
 * <FormatDate date={new Date()} />
 * // Output: 15/01/2026 (assuming en-AU)
 *
 * // Long format
 * <FormatDate date={new Date()} format="long" />
 * // Output: 15 January 2026
 *
 * // With time
 * <FormatDate date={new Date()} includeTime />
 * // Output: 15/01/2026, 2:30 pm
 *
 * // Relative time
 * <FormatDate date={new Date(Date.now() - 3600000)} format="relative" />
 * // Output: 1h ago
 * ```
 */

import { memo } from "react";
import { cn } from "@/lib/utils";
import { useOrganizationSettings } from "~/contexts/organization-settings-context";

export interface FormatDateProps {
  /** The date to display */
  date: Date | string | number | null | undefined;

  /**
   * Date format style
   * - "short": 15/01/2026
   * - "medium": 15 Jan 2026
   * - "long": 15 January 2026
   * - "full": Thursday, 15 January 2026
   * - "relative": 2h ago, yesterday, etc.
   * - "iso": 2026-01-15T14:30:00.000Z
   */
  format?: "short" | "medium" | "long" | "full" | "relative" | "iso";

  /** Include time in output */
  includeTime?: boolean;

  /** Override timezone (defaults to org timezone) */
  timezone?: string;

  /** Override locale (defaults to org locale) */
  locale?: string;

  /** Override time format (defaults to 12h) */
  timeFormat?: "12h" | "24h";

  /**
   * Size variant
   * - "sm": text-sm (14px)
   * - "base": text-base (16px)
   * - "lg": text-lg (18px)
   * - "xl": text-xl (20px)
   */
  size?: "sm" | "base" | "lg" | "xl";

  /** Additional CSS class names */
  className?: string;
}

export const FormatDate = memo(function FormatDate({
  date,
  format = "medium",
  includeTime = false,
  timezone: timezoneProp,
  locale: localeProp,
  timeFormat: timeFormatProp = "12h",
  size = "base",
  className,
}: FormatDateProps) {
  // Get organization settings from context
  const settings = useOrganizationSettings();

  // Use props if provided, otherwise fall back to org settings
  const timezone = timezoneProp ?? settings.timezone;
  const locale = localeProp ?? settings.locale;

  // Handle null/undefined
  if (date === null || date === undefined) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  const dateObj = date instanceof Date ? date : new Date(date);

  // Handle invalid dates
  if (isNaN(dateObj.getTime())) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }

  // ISO format
  if (format === "iso") {
    return (
      <time
        dateTime={dateObj.toISOString()}
        className={cn(getSizeClasses(size), className)}
      >
        {dateObj.toISOString()}
      </time>
    );
  }

  // Relative format
  let displayValue: string;
  if (format === "relative") {
    displayValue = formatRelativeTime(dateObj);
  } else {
    // Standard date formatting using Intl
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (format) {
      case "short":
        formatOptions.dateStyle = "short";
        break;
      case "medium":
        formatOptions.dateStyle = "medium";
        break;
      case "long":
        formatOptions.dateStyle = "long";
        break;
      case "full":
        formatOptions.dateStyle = "full";
        break;
      default:
        formatOptions.dateStyle = "medium";
    }

    if (includeTime) {
      formatOptions.timeStyle = "short";
      formatOptions.hour12 = timeFormatProp === "12h";
    }

    displayValue = new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
  }

  return (
    <time
      dateTime={dateObj.toISOString()}
      className={cn("tabular-nums", getSizeClasses(size), className)}
    >
      {displayValue}
    </time>
  );
});

/**
 * Get CSS classes for size variant
 */
function getSizeClasses(size: FormatDateProps["size"]): string {
  switch (size) {
    case "sm":
      return "text-sm";
    case "lg":
      return "text-lg";
    case "xl":
      return "text-xl font-medium";
    case "base":
    default:
      return "text-base";
  }
}

/**
 * Format a date as relative time (e.g., "2h ago", "yesterday")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Future date
  if (diffMs < 0) {
    const absSecs = Math.abs(diffSecs);
    const absMins = Math.abs(diffMins);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);

    if (absSecs < 60) return "in a moment";
    if (absMins < 60) return `in ${absMins}m`;
    if (absHours < 24) return `in ${absHours}h`;
    if (absDays === 1) return "tomorrow";
    if (absDays < 30) return `in ${absDays}d`;
    if (absDays < 365) return `in ${Math.floor(absDays / 30)}mo`;
    return `in ${Math.floor(absDays / 365)}y`;
  }

  // Past date
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}
