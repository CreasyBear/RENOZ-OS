import { memo } from "react";
import { cn } from "@/lib/utils";

export interface ScoreCellProps {
  /** Score value */
  score: number;
  /** Maximum score (default: 100) */
  max?: number;
  /** Show progress bar (default: true) */
  showBar?: boolean;
  /** Size variant */
  size?: "sm" | "md";
  /** Additional className */
  className?: string;
}

/**
 * Score display with optional progress bar visualization.
 *
 * Colors are determined by percentage:
 * - >= 80%: Green (success)
 * - >= 50%: Cyan (info)
 * - < 50%: Amber (warning)
 *
 * @example
 * ```tsx
 * <ScoreCell score={85} />
 * <ScoreCell score={42} max={100} showBar={false} />
 * ```
 */
export const ScoreCell = memo(function ScoreCell({
  score,
  max = 100,
  showBar = true,
  size = "md",
  className,
}: ScoreCellProps) {
  const percentage = Math.min(Math.max((score / max) * 100, 0), 100);

  const getStyle = () => {
    if (percentage >= 80) {
      return { bar: "bg-emerald-500", text: "text-emerald-400" };
    }
    if (percentage >= 50) {
      return { bar: "bg-cyan-500", text: "text-cyan-400" };
    }
    return { bar: "bg-amber-500", text: "text-amber-400" };
  };

  const { bar, text } = getStyle();

  const barWidth = size === "sm" ? "w-10" : "w-12";
  const barHeight = size === "sm" ? "h-1" : "h-1.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showBar && (
        <div
          className={cn(
            "relative rounded-full bg-muted overflow-hidden",
            barWidth,
            barHeight
          )}
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
              bar
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      <span className={cn("font-semibold tabular-nums min-w-[28px]", textSize, text)}>
        {Math.round(score)}
      </span>
    </div>
  );
});

ScoreCell.displayName = "ScoreCell";
