/**
 * Expiring Warranties Dashboard Widget
 *
 * ARCHITECTURE: Presenter Component - Pure UI, receives all data via props.
 *
 * Displays warranties expiring in the next 30 days.
 * Click-through navigation to warranty detail page.
 *
 * Features:
 * - Count badge in header
 * - Urgency-colored badges (red/orange/yellow/green)
 * - Responsive: 3 items mobile, 5 tablet/desktop
 * - Loading skeleton, empty state, error retry
 * - Keyboard navigation and ARIA labels
 *
 * @see _Initiation/_prd/2-domains/warranty/wireframes/WAR-003b.wireframe.md
 * @see _Initiation/_prd/2-domains/warranty/warranty.prd.json DOM-WAR-003b
 */

import { memo } from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { ExpiringWarrantyItem } from '@/server/functions/warranty/warranties';

// ============================================================================
// TYPES
// ============================================================================

export interface ExpiringWarrantiesWidgetProps {
  /** @source useExpiringWarranties().data.warranties in /dashboard.tsx */
  warranties: ExpiringWarrantyItem[];
  /** @source useExpiringWarranties().data.totalCount in /dashboard.tsx */
  totalCount: number;
  /** @source useExpiringWarranties().isLoading in /dashboard.tsx */
  isLoading: boolean;
  /** @source useExpiringWarranties().error in /dashboard.tsx */
  error?: unknown;
  /** @source useExpiringWarranties().refetch wrapped in useCallback in /dashboard.tsx */
  onRefetch: () => void;
  /** @source useCallback handler in /dashboard.tsx */
  onWarrantyClick: (warrantyId: string) => void;
  /** @source useCallback handler in /dashboard.tsx */
  onViewAllClick: () => void;
  /** Maximum items shown (default: 5 desktop, 3 mobile) */
  maxItems?: number;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get urgency badge styles based on days until expiry.
 */
function getUrgencyBadgeStyles(urgencyLevel: ExpiringWarrantyItem['urgencyLevel']) {
  switch (urgencyLevel) {
    case 'urgent':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'warning':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'approaching':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'healthy':
    default:
      return 'bg-green-50 text-green-700 border-green-200';
  }
}

/**
 * Format expiry date for display (DD/MM/YYYY Australian format).
 */
function formatExpiryDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Days until expiry badge with urgency coloring.
 */
function DaysBadge({
  days,
  urgencyLevel,
}: {
  days: number;
  urgencyLevel: ExpiringWarrantyItem['urgencyLevel'];
}) {
  const shouldPulse = urgencyLevel === 'urgent';

  return (
    <span
      role="status"
      aria-label={`${days} days until expiry${urgencyLevel === 'urgent' ? ', urgent' : ''}`}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        getUrgencyBadgeStyles(urgencyLevel),
        shouldPulse && 'animate-pulse'
      )}
    >
      {days}d
    </span>
  );
}

/**
 * Single warranty list item.
 */
function WarrantyItem({
  warranty,
  onClick,
  isFocused,
}: {
  warranty: ExpiringWarrantyItem;
  onClick: () => void;
  isFocused?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Warranty ${warranty.warrantyNumber} for ${warranty.customerName ?? 'Unknown'}, expires ${formatExpiryDate(warranty.expiryDate)}, ${warranty.daysUntilExpiry} days remaining`}
      className={cn(
        '-mx-3 flex w-full items-center justify-between rounded-lg px-3 py-3',
        'text-left transition-all duration-150',
        'hover:translate-x-1 hover:bg-gray-50',
        'focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset',
        'active:scale-[0.98] active:bg-gray-100',
        isFocused && 'bg-gray-50'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{warranty.warrantyNumber}</p>
        <p className="truncate text-sm text-gray-500">
          {warranty.customerName ?? 'Unknown Customer'}
        </p>
      </div>
      <div className="ml-4 flex flex-shrink-0 items-center gap-2">
        <span className="hidden text-xs text-gray-400 sm:inline">
          {formatExpiryDate(warranty.expiryDate)}
        </span>
        <DaysBadge days={warranty.daysUntilExpiry} urgencyLevel={warranty.urgencyLevel} />
      </div>
    </button>
  );
}

/**
 * Loading skeleton state.
 */
function LoadingSkeleton({ itemCount }: { itemCount: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading expiring warranties">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex-1">
            <Skeleton className="mb-1 h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-3 w-16 sm:block" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no warranties are expiring.
 */
function EmptyState() {
  return (
    <div
      className="py-8 text-center"
      role="status"
      aria-label="No warranties expiring in the next 30 days"
    >
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
      <p className="text-sm font-medium text-gray-900">No warranties expiring soon</p>
      <p className="mt-1 text-xs text-gray-500">All warranties are healthy!</p>
    </div>
  );
}

/**
 * Error state with retry button.
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-8 text-center" role="alert" aria-label="Failed to load expiring warranties">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
      <p className="text-sm font-medium text-gray-900">Unable to load</p>
      <p className="mt-1 mb-3 text-xs text-gray-500">Could not fetch expiring warranties data.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Dashboard widget showing warranties expiring soon.
 *
 * ARCHITECTURE: Presenter Component - receives all data via props from container.
 * NO data hooks (useQuery, useMutation) - only local UI state allowed.
 */
export const ExpiringWarrantiesWidget = memo(function ExpiringWarrantiesWidget({
  warranties,
  totalCount,
  isLoading,
  error,
  onRefetch,
  onWarrantyClick,
  onViewAllClick,
  maxItems = 5,
  className,
}: ExpiringWarrantiesWidgetProps) {
  // Responsive item count: 3 on mobile, maxItems on larger screens
  // Using CSS to show/hide items for better SSR support
  const mobileItemCount = 3;

  return (
    <section
      role="region"
      aria-labelledby="expiring-warranties-title"
      className={cn('rounded-xl border border-gray-200 bg-white', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <h3 id="expiring-warranties-title" className="font-medium text-gray-900">
            Expiring Warranties
          </h3>
          {!isLoading && !error && (
            <span
              role="status"
              aria-label={`${totalCount} warranties expiring soon`}
              className={cn(
                'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium',
                totalCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
              )}
            >
              {totalCount}
            </span>
          )}
          {isLoading && <Skeleton className="h-5 w-6 rounded-full" />}
        </div>
        <button
          type="button"
          onClick={onViewAllClick}
          aria-label={`View all ${totalCount} expiring warranties`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isLoading ? (
          <>
            {/* Mobile: Show fewer skeletons */}
            <div className="sm:hidden">
              <LoadingSkeleton itemCount={mobileItemCount} />
            </div>
            {/* Tablet/Desktop: Show more skeletons */}
            <div className="hidden sm:block">
              <LoadingSkeleton itemCount={maxItems} />
            </div>
          </>
        ) : error ? (
          <ErrorState onRetry={onRefetch} />
        ) : warranties.length === 0 ? (
          <EmptyState />
        ) : (
          <ul
            role="list"
            aria-label="Warranties expiring in 30 days"
            className="divide-y divide-gray-100"
          >
            {warranties.map((warranty, index) => (
              <li
                key={warranty.id}
                role="listitem"
                className={cn(
                  // Mobile: Hide items beyond mobileItemCount
                  index >= mobileItemCount && 'hidden sm:block'
                )}
              >
                <WarrantyItem
                  warranty={warranty}
                  onClick={() => onWarrantyClick(warranty.id)}
                />
              </li>
            ))}
            {/* Mobile: Show "View all" link if more items exist */}
            {warranties.length > mobileItemCount && (
              <li className="pt-3 sm:hidden">
                <button
                  type="button"
                  onClick={onViewAllClick}
                  className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View All {totalCount} Expiring Warranties →
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
});

// Re-export type for container usage
export type { ExpiringWarrantyItem };
