import { formatReportReadError } from './report-read-errors';

const WIN_LOSS_ANALYSIS_UNAVAILABLE =
  'Win/loss analysis is temporarily unavailable. Please refresh and try again.';

export function formatWinLossAnalysisReadError(error: unknown): string {
  return formatReportReadError(error, WIN_LOSS_ANALYSIS_UNAVAILABLE);
}
