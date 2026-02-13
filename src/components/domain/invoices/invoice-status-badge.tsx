'use client';

/**
 * Invoice Status Badge
 *
 * Memoized badge component for displaying invoice status.
 * Follows TABLE-STANDARDS.md for memoization and BADGE-STATUS-STANDARDS.md for colors.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 * @see docs/design-system/BADGE-STATUS-STANDARDS.md
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/lib/constants/invoice-status';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | null;
  className?: string;
  showDot?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Invoice status badge with consistent styling
 *
 * @example
 * ```tsx
 * <InvoiceStatusBadge status="overdue" />
 * <InvoiceStatusBadge status="paid" showDot />
 * ```
 */
export const InvoiceStatusBadge = memo(function InvoiceStatusBadge({
  status,
  className,
  showDot = false,
}: InvoiceStatusBadgeProps) {
  if (!status) {
    return null;
  }

  const config = INVOICE_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      )}
      {config.label}
    </span>
  );
});

InvoiceStatusBadge.displayName = 'InvoiceStatusBadge';
