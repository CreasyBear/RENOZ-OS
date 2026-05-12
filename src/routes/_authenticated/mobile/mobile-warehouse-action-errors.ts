import {
  formatMutationError,
  isUnsafeMutationErrorMessage,
} from '@/lib/mutation-error-feedback';

export type MobileWarehouseAction = 'confirmPick' | 'startCount' | 'submitCount';

export const SERIALIZED_PICK_SYNC_DESKTOP_MESSAGE =
  'Serialized pick could not sync - open order on desktop to complete';

const MOBILE_WAREHOUSE_ACTION_FALLBACKS: Record<MobileWarehouseAction, string> = {
  confirmPick: 'Unable to confirm pick. Refresh and try again.',
  startCount: 'Unable to start count. Refresh and try again.',
  submitCount: 'Unable to submit count. Refresh and try again.',
};

const MOBILE_WAREHOUSE_ACTION_CODE_MESSAGES: Record<string, string> = {
  CONFLICT: 'Warehouse task changed. Refresh and review before trying again.',
  FORBIDDEN: 'You do not have permission to update warehouse tasks.',
  NOT_FOUND: 'Warehouse task was not found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update warehouse tasks.',
  VALIDATION_ERROR: 'Warehouse task details need review before continuing.',
};

export function formatMobileWarehouseActionError(
  error: unknown,
  action: MobileWarehouseAction
): string {
  return formatMutationError(error, MOBILE_WAREHOUSE_ACTION_FALLBACKS[action], {
    codeMessages: MOBILE_WAREHOUSE_ACTION_CODE_MESSAGES,
  });
}

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : null;
  }

  if (typeof error === 'string') {
    const message = error.trim();
    return message.length > 0 ? message : null;
  }

  return null;
}

export function isSerializedPickSyncFailure(
  error: unknown,
  serialNumbers?: readonly string[]
): boolean {
  if (serialNumbers && serialNumbers.length > 0) return false;

  const message = extractErrorMessage(error);
  return message ? !isUnsafeMutationErrorMessage(message) && /serial/i.test(message) : false;
}
