import { formatMutationError } from '@/lib/mutation-error-feedback';

export type MobileWarehouseAction = 'confirmPick' | 'submitCount';

const MOBILE_WAREHOUSE_ACTION_FALLBACKS: Record<MobileWarehouseAction, string> = {
  confirmPick: 'Unable to confirm pick. Refresh and try again.',
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
