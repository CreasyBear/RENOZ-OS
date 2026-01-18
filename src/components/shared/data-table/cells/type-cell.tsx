import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TypeConfigItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface TypeCellProps<T extends string = string> {
  /** Type value */
  type: T | null | undefined;
  /** Type configuration map */
  typeConfig: Record<T, TypeConfigItem>;
  /** Badge variant (default: "outline") */
  variant?: "default" | "secondary" | "outline";
  /** Additional className */
  className?: string;
}

export const TypeCell = memo(function TypeCell<T extends string = string>({
  type,
  typeConfig,
  variant = "outline",
  className,
}: TypeCellProps<T>) {
  if (type == null || !typeConfig[type]) {
    return (
      <span className="text-sm text-muted-foreground">—</span>
    );
  }

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}) as <T extends string = string>(props: TypeCellProps<T>) => JSX.Element;

TypeCell.displayName = "TypeCell";
