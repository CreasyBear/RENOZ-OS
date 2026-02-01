import { memo, type MouseEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface CheckboxCellProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Shift-click handler for range selection */
  onShiftClick?: () => void;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Indeterminate state (for select all) */
  indeterminate?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Memoized checkbox cell with shift-click range selection support.
 *
 * @example
 * ```tsx
 * <CheckboxCell
 *   checked={row.getIsSelected()}
 *   onChange={(checked) => row.toggleSelected(checked)}
 *   onShiftClick={() => handleShiftClickRange(rowIndex)}
 *   ariaLabel={`Select row ${row.id}`}
 * />
 * ```
 */
export const CheckboxCell = memo(function CheckboxCell({
  checked,
  onChange,
  onShiftClick,
  ariaLabel,
  indeterminate = false,
  disabled = false,
  className,
}: CheckboxCellProps) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.shiftKey && onShiftClick) {
      e.preventDefault();
      e.stopPropagation();
      onShiftClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn("flex items-center justify-center", className)}
    >
      <Checkbox
        checked={indeterminate ? "indeterminate" : checked}
        onCheckedChange={(value) => {
          if (typeof value === "boolean") {
            onChange(value);
          }
        }}
        aria-label={ariaLabel}
        disabled={disabled}
      />
    </div>
  );
});

CheckboxCell.displayName = "CheckboxCell";
