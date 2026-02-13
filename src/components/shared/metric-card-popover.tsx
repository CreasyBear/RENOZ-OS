/**
 * MetricCardPopover Component
 *
 * Wraps a MetricCard with a HoverCard that shows recent items
 * for contextual drill-down without leaving the dashboard.
 *
 * @see docs/design-system/DASHBOARD-STANDARDS.md
 */

import { type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface RecentItem {
  id: string;
  /** Primary display text (e.g., customer name, order number) */
  title: string;
  /** Secondary text (e.g., amount, date) */
  subtitle?: string;
  /** Optional status indicator */
  status?: 'success' | 'warning' | 'error' | 'neutral';
  /** Link to detail view */
  href?: string;
}

export interface MetricCardPopoverProps {
  /** The MetricCard to wrap */
  children: ReactNode;
  /** Recent items to show in popover */
  items?: RecentItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** "View all" link destination */
  viewAllHref?: string;
  /** "View all" link label */
  viewAllLabel?: string;
  /** Max items to show (default 5) */
  maxItems?: number;
  /** Popover alignment */
  align?: 'start' | 'center' | 'end';
  /** Disable the popover (just render children) */
  disabled?: boolean;
}

// ============================================================================
// STATUS STYLES
// ============================================================================

const statusStyles = {
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  neutral: 'bg-gray-400',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MetricCardPopover({
  children,
  items = [],
  isLoading,
  emptyMessage = 'No items',
  viewAllHref,
  viewAllLabel = 'View all',
  maxItems = 5,
  align = 'start',
  disabled,
}: MetricCardPopoverProps) {
  // If disabled or no items/loading, just render children
  if (disabled || (!isLoading && items.length === 0 && !viewAllHref)) {
    return <>{children}</>;
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        align={align}
        className="w-80 p-0"
        sideOffset={8}
      >
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayItems.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y">
            {displayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* View All Link */}
        {viewAllHref && (
          <div className="border-t p-2">
            <Link
              to={viewAllHref}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'w-full justify-between text-xs'
              )}
            >
              {viewAllLabel}
              <ChevronRight className="size-3" />
            </Link>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

// ============================================================================
// ITEM ROW COMPONENT
// ============================================================================

function ItemRow({ item }: { item: RecentItem }) {
  const content = (
    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
      {/* Status indicator */}
      {item.status && (
        <div
          className={cn('size-2 rounded-full shrink-0', statusStyles[item.status])}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
      </div>

      {/* Arrow for linked items */}
      {item.href && <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
    </div>
  );

  if (item.href) {
    return (
      <Link to={item.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export default MetricCardPopover;
