import { formatReportReadError } from './report-read-errors';

const REPORT_FAVORITES_UNAVAILABLE =
  'Report favorites are temporarily unavailable. Please refresh and try again.';

const SCHEDULED_REPORTS_UNAVAILABLE =
  'Scheduled reports are temporarily unavailable. Please refresh and try again.';

export function formatReportFavoritesReadError(error: unknown): string {
  return formatReportReadError(error, REPORT_FAVORITES_UNAVAILABLE);
}

export function formatScheduledReportsReadError(error: unknown): string {
  return formatReportReadError(error, SCHEDULED_REPORTS_UNAVAILABLE);
}
