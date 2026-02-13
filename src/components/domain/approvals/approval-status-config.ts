/**
 * Approval Status Configuration
 *
 * Status badge configurations for approval statuses and priorities.
 * Uses semantic colors from @/lib/status for consistency across React, PDF, and Email.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpCircle,
} from 'lucide-react';
import type { SemanticStatusConfigItem } from '@/components/shared/data-table';
import type { ApprovalStatus } from '@/lib/schemas/approvals';

// ============================================================================
// APPROVAL STATUS CONFIG
// ============================================================================

/**
 * Approval status configuration for StatusCell
 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, SemanticStatusConfigItem> = {
  pending: {
    label: 'Pending',
    color: 'warning',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'success',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'error',
    icon: XCircle,
  },
  escalated: {
    label: 'Escalated',
    color: 'info',
    icon: ArrowUpCircle,
  },
};

// ============================================================================
// PRIORITY CONFIG
// ============================================================================

export type ApprovalPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Priority configuration for StatusCell
 */
export const APPROVAL_PRIORITY_CONFIG: Record<ApprovalPriority, SemanticStatusConfigItem> = {
  low: {
    label: 'Low',
    color: 'neutral',
    icon: Clock,
  },
  medium: {
    label: 'Medium',
    color: 'info',
    icon: AlertTriangle,
  },
  high: {
    label: 'High',
    color: 'warning',
    icon: AlertTriangle,
  },
  urgent: {
    label: 'Urgent',
    color: 'error',
    icon: AlertTriangle,
  },
};
