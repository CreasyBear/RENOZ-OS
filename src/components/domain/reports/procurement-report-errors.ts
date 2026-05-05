import { formatReportReadError } from './report-read-errors';

const PROCUREMENT_ANALYTICS_UNAVAILABLE =
  'Procurement analytics are temporarily unavailable. Please refresh and try again.';

export function formatProcurementAnalyticsReadError(error: unknown): string {
  return formatReportReadError(error, PROCUREMENT_ANALYTICS_UNAVAILABLE);
}
