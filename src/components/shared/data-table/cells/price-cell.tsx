import { memo } from "react";
import { cn } from "@/lib/utils";
import { useOrgFormat } from "@/hooks/use-org-format";

export interface PriceCellProps {
  /** Price value (in dollars by default, or cents if centsInput=true) */
  value: number | null | undefined;
  /** Whether input is in cents (default: false) */
  centsInput?: boolean;
  /** Currency code (default: "AUD") */
  currency?: string;
  /** Show positive values in green (default: false) */
  colorPositive?: boolean;
  /** Show negative values in red (default: true) */
  colorNegative?: boolean;
  /** Text alignment (default: "right") */
  align?: "left" | "center" | "right";
  /** Show cents/decimal places (default: true) */
  showCents?: boolean;
  /** Additional className */
  className?: string;
}

export const PriceCell = memo(function PriceCell({
  value,
  centsInput = false,
  colorPositive = false,
  colorNegative = true,
  align = "right",
  showCents = true,
  currency,
  className,
}: PriceCellProps) {
  const { formatCurrency } = useOrgFormat();
  if (value == null) {
    return (
      <span
        className={cn(
          "text-sm text-muted-foreground",
          align === "right" && "text-right block",
          align === "center" && "text-center block",
          className
        )}
      >
        —
      </span>
    );
  }

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={cn(
        "text-sm tabular-nums font-medium",
        align === "right" && "text-right block",
        align === "center" && "text-center block",
        colorPositive && isPositive && "text-emerald-600 dark:text-emerald-500",
        colorNegative && isNegative && "text-destructive",
        className
      )}
    >
      {formatCurrency(value, { cents: centsInput, showCents, currency })}
    </span>
  );
});

PriceCell.displayName = "PriceCell";
