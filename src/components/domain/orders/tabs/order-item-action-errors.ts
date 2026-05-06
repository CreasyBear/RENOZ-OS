import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from '@/hooks/orders/order-mutation-client-errors';

export type DraftOrderItemAction = 'add' | 'update' | 'remove';

const DRAFT_ORDER_ITEM_ACTION_FALLBACKS: Record<DraftOrderItemAction, string> = {
  add: 'Unable to add items to draft order.',
  update: 'Unable to update draft line item.',
  remove: 'Unable to remove draft line item.',
};

const SAFE_LOCAL_VALIDATION_PATTERNS = [
  /^".+" must have a quantity greater than 0\.$/,
  /^".+" must have a valid unit price\.$/,
  /^".+" cannot use both discount percent and discount amount\.$/,
  /^".+" discount cannot exceed the line total\.$/,
];

function isSafeLocalValidationMessage(message: string): boolean {
  return SAFE_LOCAL_VALIDATION_PATTERNS.some((pattern) => pattern.test(message.trim()));
}

export function getDraftOrderItemActionErrorMessage(
  error: unknown,
  action: DraftOrderItemAction
): string {
  if (error instanceof Error && isSafeLocalValidationMessage(error.message)) {
    return error.message;
  }

  const fallback = DRAFT_ORDER_ITEM_ACTION_FALLBACKS[action];
  const normalized = normalizeOrderMutationError(error, fallback);
  return getClientErrorMessage(normalized, fallback);
}

export function isDraftOrderItemConflictMessage(message: string): boolean {
  return message.toLowerCase().includes('modified by another user');
}
