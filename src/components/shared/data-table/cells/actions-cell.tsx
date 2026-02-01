import { memo, Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ActionItem {
  /** Action label */
  label: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?: "default" | "destructive";
  /** Disabled state */
  disabled?: boolean;
  /** Show separator before this item */
  separator?: boolean;
}

export interface ActionsCellProps {
  /** Array of action items */
  actions: ActionItem[];
  /** Menu alignment */
  align?: "start" | "center" | "end";
  /** Additional className for trigger button */
  className?: string;
}

/**
 * Standardized row actions dropdown cell.
 *
 * @example
 * ```tsx
 * <ActionsCell
 *   actions={[
 *     { label: "Edit", icon: Edit, onClick: handleEdit },
 *     { label: "Duplicate", icon: Copy, onClick: handleDuplicate },
 *     { label: "Delete", icon: Trash, onClick: handleDelete, variant: "destructive", separator: true },
 *   ]}
 * />
 * ```
 */
export const ActionsCell = memo(function ActionsCell({
  actions,
  align = "end",
  className,
}: ActionsCellProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            // 44px touch target on mobile, 32px on desktop
            "h-8 w-8 p-0 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action, index) => (
          <Fragment key={action.label}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              disabled={action.disabled}
              variant={action.variant}
            >
              {action.icon && <action.icon className="h-4 w-4 mr-2" />}
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

ActionsCell.displayName = "ActionsCell";
