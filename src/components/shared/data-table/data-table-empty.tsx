import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export type DataTableEmptyVariant = "empty" | "no-results" | "error" | "complete";

export interface DataTableEmptyProps {
  /** Empty state variant */
  variant?: DataTableEmptyVariant;
  /** Custom icon (overrides variant default) */
  icon?: LucideIcon;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Custom content below description */
  children?: ReactNode;
  /** Additional className */
  className?: string;
}

const VARIANT_DEFAULTS: Record<
  DataTableEmptyVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  empty: {
    icon: Inbox,
    title: "No data yet",
    description: "Get started by creating your first item.",
  },
  "no-results": {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filter criteria.",
  },
  error: {
    icon: AlertCircle,
    title: "Failed to load data",
    description: "An error occurred while loading. Please try again.",
  },
  complete: {
    icon: CheckCircle2,
    title: "All done!",
    description: "You've completed all items.",
  },
};

/**
 * Empty state component for data tables.
 *
 * Variants:
 * - `empty`: No data exists yet (primary CTA to create)
 * - `no-results`: Filters returned nothing (CTA to clear filters)
 * - `error`: Failed to load (CTA to retry)
 * - `complete`: All items processed (no action needed)
 *
 * @example
 * ```tsx
 * // Primary empty state
 * <DataTableEmpty
 *   variant="empty"
 *   title="No orders yet"
 *   description="Create your first order to get started."
 *   action={{ label: "Create Order", onClick: handleCreate }}
 * />
 *
 * // No search results
 * <DataTableEmpty
 *   variant="no-results"
 *   action={{ label: "Clear filters", onClick: handleClearFilters }}
 * />
 *
 * // Error state
 * <DataTableEmpty
 *   variant="error"
 *   action={{ label: "Try again", onClick: handleRetry }}
 * />
 * ```
 */
export const DataTableEmpty = memo(function DataTableEmpty({
  variant = "empty",
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: DataTableEmptyProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const Icon = icon || defaults.icon;

  return (
    <Empty className={cn("py-12", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon
            className={cn(
              "size-5",
              variant === "error" && "text-destructive",
              variant === "complete" && "text-emerald-500"
            )}
          />
        </EmptyMedia>
        <EmptyTitle>{title || defaults.title}</EmptyTitle>
        <EmptyDescription>{description || defaults.description}</EmptyDescription>
      </EmptyHeader>

      {(action || secondaryAction || children) && (
        <EmptyContent>
          {children}
          {(action || secondaryAction) && (
            <div className="flex items-center gap-2">
              {action && (
                <Button onClick={action.onClick}>{action.label}</Button>
              )}
              {secondaryAction && (
                <Button variant="outline" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
});

DataTableEmpty.displayName = "DataTableEmpty";

/**
 * Wrapper to display empty state within table structure.
 * Spans full table width with proper colspan.
 */
export interface DataTableEmptyRowProps extends DataTableEmptyProps {
  /** Number of columns to span */
  colSpan: number;
}

export const DataTableEmptyRow = memo(function DataTableEmptyRow({
  colSpan,
  ...props
}: DataTableEmptyRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-[400px]">
        <DataTableEmpty {...props} />
      </td>
    </tr>
  );
});

DataTableEmptyRow.displayName = "DataTableEmptyRow";
