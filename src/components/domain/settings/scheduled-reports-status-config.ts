/**
 * Scheduled Reports Status Configuration
 *
 * Status badge configurations for Active/Paused and derived states.
 *
 * @see docs/design-system/STATUS-BADGE-STANDARDS.md
 */

import { CheckCircle2, PauseCircle, XCircle, Clock } from 'lucide-react';
import type { SemanticStatusConfigItem } from '@/components/shared/data-table';
import type { ScheduledReport } from '@/lib/schemas/reports/scheduled-reports';

export type ScheduledReportStatus = 'active' | 'paused' | 'error' | 'pending';

export const SCHEDULED_REPORT_STATUS_CONFIG: Record<
  ScheduledReportStatus,
  SemanticStatusConfigItem
> = {
  active: {
    label: 'Active',
    color: 'success',
    icon: CheckCircle2,
  },
  paused: {
    label: 'Paused',
    color: 'neutral',
    icon: PauseCircle,
  },
  error: {
    label: 'Error',
    color: 'error',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    color: 'progress',
    icon: Clock,
  },
};

/**
 * Derive display status from report data.
 */
export function getScheduledReportStatus(report: ScheduledReport): ScheduledReportStatus {
  if (!report.isActive) return 'paused';

  if (report.lastError && report.lastErrorAt) {
    const errorAge = Date.now() - new Date(report.lastErrorAt).getTime();
    if (errorAge < 7 * 24 * 60 * 60 * 1000) return 'error';
  }

  if (report.lastSuccessAt) return 'active';
  return 'pending';
}
