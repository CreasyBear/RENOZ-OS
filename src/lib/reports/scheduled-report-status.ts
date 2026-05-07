import type { ScheduledReportStatus } from '@/lib/schemas/reports/scheduled-reports';

type ReportRunStatus = ScheduledReportStatus['lastRunStatus'];

export interface ScheduledReportStatusInput {
  lastRunAt?: Date | string | null;
  lastSuccessAt?: Date | string | null;
  lastErrorAt?: Date | string | null;
  lastError?: string | null;
}

export interface DerivedScheduledReportStatus {
  lastRunStatus: ReportRunStatus;
  lastRunMessage: string | null;
}

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function deriveScheduledReportStatus({
  lastRunAt,
  lastSuccessAt,
  lastErrorAt,
  lastError,
}: ScheduledReportStatusInput): DerivedScheduledReportStatus {
  const runAt = toValidDate(lastRunAt);
  const successAt = toValidDate(lastSuccessAt);
  const errorAt = toValidDate(lastErrorAt);

  if (!runAt) {
    return {
      lastRunStatus: 'pending',
      lastRunMessage: 'Report has not run yet.',
    };
  }

  if (errorAt && (!successAt || errorAt >= successAt) && errorAt >= runAt) {
    return {
      lastRunStatus: 'failed',
      lastRunMessage: lastError ?? 'Last scheduled report run failed.',
    };
  }

  if (successAt && successAt >= runAt && (!errorAt || successAt >= errorAt)) {
    return {
      lastRunStatus: 'success',
      lastRunMessage: 'Last scheduled report run completed successfully.',
    };
  }

  if (successAt && (!errorAt || successAt >= errorAt)) {
    return {
      lastRunStatus: 'success',
      lastRunMessage: 'Last scheduled report run completed successfully.',
    };
  }

  return {
    lastRunStatus: 'running',
    lastRunMessage: 'Scheduled report run is in progress.',
  };
}
