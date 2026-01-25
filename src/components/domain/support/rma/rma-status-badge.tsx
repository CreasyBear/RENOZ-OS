/**
 * RMA Status Badge Component
 *
 * Displays RMA status with color-coded badge.
 *
 * @see src/lib/schemas/support/rma.ts - RmaStatus type
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RmaStatus } from '@/lib/schemas/support/rma';
import { Clock, CheckCircle, Package, PackageCheck, XCircle } from 'lucide-react';

interface RmaStatusBadgeProps {
  status: RmaStatus;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  RmaStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    Icon: React.ElementType;
  }
> = {
  requested: {
    label: 'Requested',
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    Icon: Clock,
  },
  approved: {
    label: 'Approved',
    variant: 'secondary',
    className: 'bg-green-100 text-green-800 border-green-200',
    Icon: CheckCircle,
  },
  received: {
    label: 'Received',
    variant: 'secondary',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
    Icon: Package,
  },
  processed: {
    label: 'Processed',
    variant: 'secondary',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Icon: PackageCheck,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800 border-red-200',
    Icon: XCircle,
  },
};

export function RmaStatusBadge({ status, className, showIcon = true }: RmaStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const { Icon } = config;

  return (
    <Badge variant={config.variant} className={cn(config.className, 'font-medium', className)}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

/**
 * RMA Reason Badge Component
 */
import type { RmaReason } from '@/lib/schemas/support/rma';

interface RmaReasonBadgeProps {
  reason: RmaReason;
  className?: string;
}

const REASON_LABELS: Record<RmaReason, string> = {
  defective: 'Defective',
  damaged_in_shipping: 'Damaged in Shipping',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not as Described',
  performance_issue: 'Performance Issue',
  installation_failure: 'Installation Failure',
  other: 'Other',
};

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
import type { RmaResolution } from '@/lib/schemas/support/rma';

interface RmaResolutionBadgeProps {
  resolution: RmaResolution;
  className?: string;
}

const RESOLUTION_LABELS: Record<RmaResolution, string> = {
  refund: 'Refund',
  replacement: 'Replacement',
  repair: 'Repair',
  credit: 'Credit',
  no_action: 'No Action',
};

export function RmaResolutionBadge({ resolution, className }: RmaResolutionBadgeProps) {
  return (
    <Badge variant="outline" className={cn('font-medium', className)}>
      {RESOLUTION_LABELS[resolution]}
    </Badge>
  );
}
