/**
 * Disabled Button with Tooltip
 *
 * Shows disabled buttons with explanatory tooltips.
 * Use for status-constrained actions that should be visible but not available.
 *
 * @see docs/design-system/DETAIL-VIEW-STANDARDS.md - Conditional Action Availability Pattern
 */

import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface DisabledButtonWithTooltipProps
  extends Omit<ButtonProps, 'disabled'> {
  /**
   * When provided, the button is disabled and this message is shown in a tooltip.
   * When undefined/empty, the button is enabled normally.
   */
  disabledReason?: string;
  /**
   * Standard disabled prop. Button is disabled if either this OR disabledReason is truthy.
   */
  disabled?: boolean;
  /**
   * Tooltip placement
   * @default 'top'
   */
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * A button that shows a tooltip explaining why it's disabled.
 *
 * Use for status-constrained actions where the user should know the action exists
 * but isn't currently available.
 *
 * @example
 * ```tsx
 * // Order can only be edited in draft status
 * <DisabledButtonWithTooltip
 *   variant="outline"
 *   onClick={actions.onEdit}
 *   disabledReason={
 *     order.status !== 'draft'
 *       ? 'Orders can only be edited in draft status'
 *       : undefined
 *   }
 * >
 *   Edit Order
 * </DisabledButtonWithTooltip>
 *
 * // Delete only available for draft orders
 * <DisabledButtonWithTooltip
 *   variant="destructive"
 *   onClick={actions.onDelete}
 *   disabledReason={
 *     order.status !== 'draft'
 *       ? 'Only draft orders can be deleted'
 *       : undefined
 *   }
 * >
 *   Delete
 * </DisabledButtonWithTooltip>
 * ```
 */
export const DisabledButtonWithTooltip = forwardRef<
  HTMLButtonElement,
  DisabledButtonWithTooltipProps
>(function DisabledButtonWithTooltip(
  {
    disabledReason,
    disabled,
    children,
    className,
    tooltipSide = 'top',
    ...props
  },
  ref
) {
  const isDisabled = disabled || !!disabledReason;

  // If not disabled, render a normal button
  if (!isDisabled) {
    return (
      <Button ref={ref} className={className} {...props}>
        {children}
      </Button>
    );
  }

  // Disabled button with optional tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/*
           * Wrapper span is needed because disabled buttons don't fire mouse events.
           * The span captures hover/focus and displays the tooltip.
           */}
          <span className="inline-block">
            <Button
              ref={ref}
              disabled
              className={cn('pointer-events-none', className)}
              aria-disabled="true"
              {...props}
            >
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        {disabledReason && (
          <TooltipContent side={tooltipSide}>
            <p className="max-w-[200px] text-center">{disabledReason}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});

// ============================================================================
// MENU ITEM VARIANT
// ============================================================================

export interface DisabledMenuItemProps {
  /**
   * When provided, the menu item is disabled and this message is shown in a tooltip.
   */
  disabledReason?: string;
  /**
   * Standard disabled prop.
   */
  disabled?: boolean;
  /**
   * Menu item content
   */
  children: React.ReactNode;
  /**
   * Click handler (only fires when enabled)
   */
  onClick?: () => void;
  /**
   * Additional class names
   */
  className?: string;
}

/**
 * A menu item (for dropdown menus) that shows a tooltip when disabled.
 *
 * @example
 * ```tsx
 * <DropdownMenuContent>
 *   <DisabledMenuItem
 *     onClick={actions.onEdit}
 *     disabledReason={
 *       order.status !== 'draft' ? 'Only draft orders can be edited' : undefined
 *     }
 *   >
 *     <Pencil className="mr-2 h-4 w-4" />
 *     Edit Order
 *   </DisabledMenuItem>
 * </DropdownMenuContent>
 * ```
 */
export function DisabledMenuItem({
  disabledReason,
  disabled,
  children,
  onClick,
  className,
}: DisabledMenuItemProps) {
  const isDisabled = disabled || !!disabledReason;

  if (!isDisabled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:bg-accent focus:text-accent-foreground',
          'w-full text-left',
          className
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block">
            <button
              type="button"
              disabled
              className={cn(
                'relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'text-muted-foreground opacity-50',
                'w-full text-left',
                className
              )}
              aria-disabled="true"
            >
              {children}
            </button>
          </span>
        </TooltipTrigger>
        {disabledReason && (
          <TooltipContent side="left">
            <p className="max-w-[200px]">{disabledReason}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
