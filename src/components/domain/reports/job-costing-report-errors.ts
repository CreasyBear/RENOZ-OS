import { formatReportReadError } from './report-read-errors';

const JOB_COSTING_REPORT_UNAVAILABLE =
  'Job costing report is temporarily unavailable. Please refresh and try again.';

export function formatJobCostingReportReadError(error: unknown): string {
  return formatReportReadError(error, JOB_COSTING_REPORT_UNAVAILABLE);
}
