import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Gradient style configuration for status badges
 */
export interface GradientStyleConfig {
  border: string;
  gradient: string;
  text: string;
}

/**
 * Pre-defined gradient styles matching TABLE-STANDARDS.md
 */
export const GRADIENT_STYLES = {
  success: {
    border: "border-emerald-500/40",
    gradient:
      "linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.06) 30%, rgba(16, 185, 129, 0) 100%)",
    text: "text-emerald-400",
  },
  warning: {
    border: "border-amber-500/40",
    gradient:
      "linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.06) 30%, rgba(245, 158, 11, 0) 100%)",
    text: "text-amber-400",
  },
  danger: {
    border: "border-red-500/40",
    gradient:
      "linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 30%, rgba(239, 68, 68, 0) 100%)",
    text: "text-red-400",
  },
  info: {
    border: "border-blue-500/40",
    gradient:
      "linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 30%, rgba(59, 130, 246, 0) 100%)",
    text: "text-blue-400",
  },
  hot: {
    border: "border-orange-500/40",
    gradient:
      "linear-gradient(90deg, rgba(249, 115, 22, 0.12) 0%, rgba(249, 115, 22, 0.06) 30%, rgba(249, 115, 22, 0) 100%)",
    text: "text-orange-400",
  },
  cold: {
    border: "border-cyan-500/40",
    gradient:
      "linear-gradient(90deg, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0.06) 30%, rgba(6, 182, 212, 0) 100%)",
    text: "text-cyan-400",
  },
  neutral: {
    border: "border-zinc-500/40",
    gradient:
      "linear-gradient(90deg, rgba(113, 113, 122, 0.12) 0%, rgba(113, 113, 122, 0.06) 30%, rgba(113, 113, 122, 0) 100%)",
    text: "text-zinc-400",
  },
} as const;

export type GradientVariant = keyof typeof GRADIENT_STYLES;

export interface GradientStatusCellProps {
  /** Display label */
  label: string;
  /** Gradient variant */
  variant: GradientVariant;
  /** Optional icon component */
  icon?: LucideIcon;
  /** Additional className */
  className?: string;
}

/**
 * Status badge with gradient background pattern.
 *
 * @example
 * ```tsx
 * <GradientStatusCell
 *   label="Confirmed"
 *   variant="success"
 *   icon={CheckCircle}
 * />
 * ```
 */
export const GradientStatusCell = memo(function GradientStatusCell({
  label,
  variant,
  icon: Icon,
  className,
}: GradientStatusCellProps) {
  const style = GRADIENT_STYLES[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-lg border w-fit",
        style.border,
        className
      )}
      style={{
        backgroundImage: `${style.gradient}, linear-gradient(90deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%)`,
      }}
    >
      {Icon && <Icon className={cn("size-3.5", style.text)} />}
      <span className={cn("text-sm font-medium", style.text)}>{label}</span>
    </div>
  );
});

GradientStatusCell.displayName = "GradientStatusCell";
