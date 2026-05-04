/* eslint-disable react-refresh/only-export-components -- Component exports component + status config */
/**
 * RMA Status Badge Component
 *
 * Displays RMA status with semantic colors using StatusBadge.
 *
 * @see src/lib/schemas/support/rma.ts - RmaStatus type
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge, type StatusConfig } from '@/components/shared';
import type { SemanticColor } from '@/lib/status';
import type { RmaStatus, RmaReason, RmaResolution } from '@/lib/schemas/support/rma';
import { REASON_LABELS, RMA_RESOLUTION_LABELS } from './rma-options';

/**
 * RMA Status Configuration
 *
 * Semantic color mapping for RMA workflow states:
 * - requested: pending (awaiting approval)
 * - approved: info (approved to proceed)
 * - received: progress (item received, processing)
 * - processed: success (completed)
 * - rejected: error (rejected)
 * - cancelled: neutral (cancelled before receipt)
 */
export const RMA_STATUS_CONFIG: StatusConfig = {
  requested: { variant: 'pending', label: 'Requested' },
  approved: { variant: 'info', label: 'Approved' },
  received: { variant: 'progress', label: 'Received' },
  processed: { variant: 'success', label: 'Processed' },
  rejected: { variant: 'error', label: 'Rejected' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
};

interface RmaStatusBadgeProps {
  status: RmaStatus;
  className?: string;
  /** @deprecated Icons are not used with StatusBadge */
  showIcon?: boolean;
}

export function RmaStatusBadge({ status, className }: RmaStatusBadgeProps) {
  return (
    <StatusBadge
      status={status}
      statusConfig={RMA_STATUS_CONFIG}
      className={className}
    />
  );
}

/**
 * RMA Reason Badge Component
 */

interface RmaReasonBadgeProps {
  reason: RmaReason;
  className?: string;
}

export function RmaReasonBadge({ reason, className }: RmaReasonBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-medium', className)}>
      {REASON_LABELS[reason]}
    </Badge>
  );
}

/**
 * RMA Resolution Badge Component
 */

interface RmaResolutionBadgeProps {
  resolution: RmaResolution;
  className?: string;
}

export function RmaResolutionBadge({ resolution, className }: RmaResolutionBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-medium', className)}>
      {RMA_RESOLUTION_LABELS[resolution]}
    </Badge>
  );
}

/**
 * Get RMA status config for EntityHeader
 * Maps RmaStatus to EntityHeader status format (value + variant)
 */
export function getRmaStatusConfigForEntityHeader(status: RmaStatus): {
  value: string;
  variant: SemanticColor;
} {
  const config = RMA_STATUS_CONFIG[status];
  return {
    value: status,
    variant: config.variant as SemanticColor,
  };
}
