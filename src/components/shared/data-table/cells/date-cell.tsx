import { memo } from "react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/formatters";

export interface DateCellProps {
  /** Date value */
  value: Date | string | null | undefined;
  /** Display format (default: "short" = "17 Jan 2026") */
  format?: "short" | "long" | "relative" | "iso";
  /** Custom format options */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Fallback text when null (default: "—") */
  fallback?: string;
  /** Additional className */
  className?: string;
}

export const DateCell = memo(function DateCell({
  value,
  format = "short",
  formatOptions,
  fallback = "—",
  className,
}: DateCellProps) {
  if (!value) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {fallback}
      </span>
    );
  }

  const date = typeof value === "string" ? new Date(value) : value;

  let formattedDate: string;

  switch (format) {
    case "long":
      formattedDate = formatDate(
        date,
        formatOptions || {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      );
      break;
    case "relative":
      formattedDate = formatRelativeTime(date);
      break;
    case "iso":
      formattedDate = date.toISOString();
      break;
    case "short":
    default:
      formattedDate = formatDate(date, formatOptions);
      break;
  }

  return (
    <span className={cn("text-sm", className)}>
      {formattedDate}
    </span>
  );
});

DateCell.displayName = "DateCell";
