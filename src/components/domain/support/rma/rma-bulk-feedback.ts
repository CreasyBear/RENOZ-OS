import { formatRmaMutationError } from '@/hooks/support';

export type RmaBulkAction = 'approve' | 'receive';

export interface RmaBulkFailure {
  rmaId: string;
  error: string;
}

export interface RmaBulkSourceItem {
  id?: string;
  rmaId?: string;
  rmaNumber?: string | null;
  rmaLabel?: string | null;
}

export interface RmaBulkFailureItem {
  rmaId: string;
  rmaLabel: string;
  message: string;
}

function fallbackForAction(action: RmaBulkAction): string {
  return action === 'approve'
    ? 'Unable to approve this RMA. Refresh and retry.'
    : 'Unable to receive this RMA. Refresh and retry.';
}

export function formatRmaBulkMutationError(error: unknown, fallback: string): string {
  return formatRmaMutationError(error, fallback);
}

export function formatRmaBulkFailureMessage(
  action: RmaBulkAction,
  errorMessage: string
): string {
  return formatRmaMutationError(
    {
      statusCode: 400,
      message: errorMessage,
    },
    fallbackForAction(action)
  );
}

export function buildRmaBulkFailureItems(
  action: RmaBulkAction,
  failures: RmaBulkFailure[],
  sourceItems: RmaBulkSourceItem[]
): RmaBulkFailureItem[] {
  return failures.map((failure) => {
    const match = sourceItems.find((item) => (item.id ?? item.rmaId) === failure.rmaId);
    return {
      rmaId: failure.rmaId,
      rmaLabel: match?.rmaNumber ?? match?.rmaLabel ?? failure.rmaId.slice(0, 8),
      message: formatRmaBulkFailureMessage(action, failure.error),
    };
  });
}

export function formatRmaBulkFailureToast(failures: RmaBulkFailureItem[]): string {
  return `${failures.length} failed: ${failures
    .slice(0, 2)
    .map((failure) => `${failure.rmaLabel}: ${failure.message}`)
    .join(' | ')}`;
}
