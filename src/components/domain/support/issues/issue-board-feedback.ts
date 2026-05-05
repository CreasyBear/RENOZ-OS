import { formatSupportMutationError } from '@/hooks/support/_mutation-errors';

interface IssueBoardFailureItem {
  issueLabel: string;
  message: string;
}

const ISSUE_BOARD_LOCAL_MESSAGES = new Set([
  'Resolve issues from the detail page so structured resolution details can be captured.',
]);

export function formatIssueBoardMutationError(error: unknown, fallback: string): string {
  if (error instanceof Error && ISSUE_BOARD_LOCAL_MESSAGES.has(error.message)) {
    return error.message;
  }

  return formatSupportMutationError(error, fallback);
}

export function formatIssueBoardTransitionFailureToast(
  issueLabel: string,
  message: string
): string {
  return `Failed to move ${issueLabel}: ${message}`;
}

export function formatIssueBoardBulkFailureToast(failureItems: IssueBoardFailureItem[]): string {
  const failedSummary = failureItems
    .slice(0, 3)
    .map((item) => `${item.issueLabel}: ${item.message}`)
    .join(' | ');

  return `${failureItems.length} update${failureItems.length > 1 ? 's' : ''} failed${
    failedSummary ? ` (${failedSummary})` : ''
  }`;
}
