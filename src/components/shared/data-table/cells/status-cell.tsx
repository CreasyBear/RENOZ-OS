import { memo } from "react";
import type { JSX } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type SemanticColor,
  getStatusColorClasses,
} from "@/lib/status";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/**
 * Legacy status config item using shadcn Badge variants.
 * @deprecated Use SemanticStatusConfigItem instead for new code.
 */
export interface StatusConfigItem {
  label: string;
  variant: BadgeVariant;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * New status config item using semantic colors.
 * Provides consistent colors across React, PDF, and Email.
 */
export interface SemanticStatusConfigItem {
  label: string;
  /** Semantic color from @/lib/status/colors */
  color: SemanticColor;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Combined config item type for backwards compatibility.
 * Detects which system is being used based on the presence of `variant` or `color`.
 */
export type CombinedStatusConfigItem = StatusConfigItem | SemanticStatusConfigItem;

function isSemanticConfig(
  item: CombinedStatusConfigItem
): item is SemanticStatusConfigItem {
  return "color" in item && !("variant" in item);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusCellProps<T extends string = string> {
  /** Status value */
  status: T | null | undefined;
  /** Status configuration map (supports both legacy and semantic configs) */
  statusConfig: Record<T, CombinedStatusConfigItem>;
  /** Show icon with label (default: false) */
  showIcon?: boolean;
  /** Additional className */
  className?: string;
}

export const StatusCell = memo(function StatusCell<T extends string = string>({
  status,
  statusConfig,
  showIcon = false,
  className,
}: StatusCellProps<T>) {
  if (status == null || !statusConfig[status]) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  // Handle semantic color configs
  if (isSemanticConfig(config)) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1", getStatusColorClasses(config.color), className)}
      >
        {showIcon && Icon && <Icon className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  }

  // Handle legacy variant configs
  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}) as (<T extends string = string>(
  props: StatusCellProps<T>
) => JSX.Element) & { displayName?: string };

StatusCell.displayName = "StatusCell";
