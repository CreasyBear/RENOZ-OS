import { formatReportReadError } from './report-read-errors';

const FINANCIAL_SUMMARY_UNAVAILABLE =
  'Financial summary is temporarily unavailable. Please refresh and try again.';

export function formatFinancialSummaryReadError(error: unknown): string {
  return formatReportReadError(error, FINANCIAL_SUMMARY_UNAVAILABLE);
}
