import { memo } from "react";
import type { JSX } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusConfigItem {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon?: React.ComponentType<{ className?: string }>;
}

export interface StatusCellProps<T extends string = string> {
  /** Status value */
  status: T | null | undefined;
  /** Status configuration map */
  statusConfig: Record<T, StatusConfigItem>;
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
    return (
      <span className="text-sm text-muted-foreground">—</span>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn("gap-1", className)}>
      {showIcon && Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}) as (<T extends string = string>(props: StatusCellProps<T>) => JSX.Element) & { displayName?: string };

StatusCell.displayName = "StatusCell";
