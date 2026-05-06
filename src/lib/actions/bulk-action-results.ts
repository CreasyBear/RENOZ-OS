import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

type UnknownRecord = Record<string, unknown>;

export const BULK_ACTION_FAILURE_MESSAGE = 'Action failed. Refresh and try again.';

export interface BulkActionFailure<TId extends string = string> {
  id: TId;
  label: string;
  message: string;
}

export interface BulkActionResult<TId extends string = string> {
  total: number;
  succeededIds: TId[];
  failed: BulkActionFailure<TId>[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function extractBulkActionMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (!isRecord(error)) {
    return null;
  }

  for (const key of ['message', 'error']) {
    const value = error[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

export function formatBulkActionFailureMessage(
  error: unknown,
  fallback = BULK_ACTION_FAILURE_MESSAGE
): string {
  const message = extractBulkActionMessage(error);
  if (!message || isUnsafeMutationErrorMessage(message)) {
    return fallback;
  }

  return message;
}

export async function executeBulkAction<TItem, TId extends string = string>(params: {
  items: TItem[];
  getId: (item: TItem) => TId;
  getLabel: (item: TItem) => string;
  run: (item: TItem) => Promise<unknown>;
  formatError?: (error: unknown) => string;
}): Promise<BulkActionResult<TId>> {
  const results = await Promise.allSettled(params.items.map((item) => params.run(item)));
  const failed: BulkActionFailure<TId>[] = [];
  const succeededIds: TId[] = [];

  results.forEach((result, index) => {
    const item = params.items[index];
    const id = params.getId(item);

    if (result.status === "fulfilled") {
      succeededIds.push(id);
      return;
    }

    failed.push({
      id,
      label: params.getLabel(item),
      message: params.formatError
        ? params.formatError(result.reason)
        : formatBulkActionFailureMessage(result.reason),
    });
  });

  return {
    total: params.items.length,
    succeededIds,
    failed,
  };
}

export function summarizeBulkFailures(
  failures: BulkActionFailure[],
  maxItems = 3
): string {
  return failures
    .slice(0, maxItems)
    .map((failure) => `${failure.label}: ${failure.message}`)
    .join(" | ");
}
