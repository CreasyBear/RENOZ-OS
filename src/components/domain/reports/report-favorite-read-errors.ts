import { formatReportReadError } from './report-read-errors';

const REPORT_FAVORITES_UNAVAILABLE =
  'Report favorites are temporarily unavailable. Please refresh and try again.';

export function formatReportFavoritesReadError(error: unknown): string {
  return formatReportReadError(error, REPORT_FAVORITES_UNAVAILABLE);
}
