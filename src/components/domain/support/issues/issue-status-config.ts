/**
 * Issue Status Configuration
 *
 * Semantic color mapping for issue workflow states.
 * Used with StatusBadge component for consistent status display.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import type { StatusConfigItem } from '@/components/shared/status-badge';
import type { IssueStatus } from '@/lib/schemas/support/issues';

/**
 * Issue Status Configuration
 *
 * Semantic color mapping:
 * - open: info (new, needs attention)
 * - in_progress: progress (being worked on)
 * - pending: pending (waiting on something)
 * - on_hold: warning (paused, may need attention)
 * - escalated: error (urgent, escalated)
 * - resolved: success (fixed)
 * - closed: inactive (done/archived)
 */
export const ISSUE_STATUS_CONFIG: Record<IssueStatus, StatusConfigItem> = {
  open: { variant: 'info', label: 'Open' },
  in_progress: { variant: 'progress', label: 'In Progress' },
  pending: { variant: 'pending', label: 'Pending' },
  on_hold: { variant: 'warning', label: 'On Hold' },
  escalated: { variant: 'error', label: 'Escalated' },
  resolved: { variant: 'success', label: 'Resolved' },
  closed: { variant: 'inactive', label: 'Closed' },
};
