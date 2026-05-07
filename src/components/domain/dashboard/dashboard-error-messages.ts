import { getUserFriendlyMessage } from '@/lib/error-handling';
import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

export const DASHBOARD_ERROR_MESSAGES = {
  activityFeed: 'Recent activity is temporarily unavailable. Please refresh and try again.',
  aiInsights: 'AI insights are temporarily unavailable. Please refresh and try again.',
  chartData: 'Chart data is temporarily unavailable. Please refresh and try again.',
  drillDown: 'Drill-down data is temporarily unavailable. Please refresh and try again.',
  kpiData: 'Dashboard metric is temporarily unavailable. Please refresh and try again.',
  mobileDashboard: 'Dashboard is temporarily unavailable. Please refresh and try again.',
  targets: 'Target progress is temporarily unavailable. Please refresh and try again.',
  widgets: 'Dashboard widgets are temporarily unavailable. Please refresh and try again.',
} as const;

export type DashboardErrorSurface = keyof typeof DASHBOARD_ERROR_MESSAGES;

function isUnsafeDashboardErrorMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    isUnsafeMutationErrorMessage(message) ||
    normalized.includes('dashboard query') ||
    normalized.includes('drizzle') ||
    normalized.includes('materialized view') ||
    normalized.includes('row level security') ||
    normalized.includes('rpc') ||
    normalized.includes('view does not exist')
  );
}

export function getDashboardErrorMessage(
  error: unknown,
  surface: DashboardErrorSurface
): string {
  const fallback = DASHBOARD_ERROR_MESSAGES[surface];
  const message = getUserFriendlyMessage(error).trim();

  if (!message || isUnsafeDashboardErrorMessage(message)) {
    return fallback;
  }

  return message;
}
