import { formatReportReadError } from './report-read-errors';
export { formatReportFavoritesReadError } from './report-favorite-read-errors';

const SCHEDULED_REPORTS_UNAVAILABLE =
  'Scheduled reports are temporarily unavailable. Please refresh and try again.';

export function formatScheduledReportsReadError(error: unknown): string {
  return formatReportReadError(error, SCHEDULED_REPORTS_UNAVAILABLE);
}
