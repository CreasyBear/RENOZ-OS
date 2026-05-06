import { formatMutationError } from '@/lib/mutation-error-feedback';

const CREDIT_NOTE_FALLBACKS = {
  create: 'Unable to create credit note. Refresh and try again.',
  issue: 'Unable to issue credit note. Refresh and try again.',
  apply: 'Unable to apply credit note to invoice. Refresh and try again.',
  void: 'Unable to void credit note. Refresh and try again.',
  pdf: 'Unable to generate credit note PDF. Refresh and try again.',
} as const;

const CREDIT_NOTE_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The credit note could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage credit notes.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing credit notes.',
  RATE_LIMIT: 'Too many credit note actions were attempted. Wait a moment and retry.',
  CONFLICT: 'Credit note state changed. Refresh and review before trying again.',
};

const PAYMENT_PLAN_FALLBACKS = {
  create: 'Unable to create payment plan. Refresh and try again.',
  recordPayment: 'Unable to record installment payment. Refresh and try again.',
} as const;

const PAYMENT_PLAN_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The order or payment installment could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage payment plans.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing payment plans.',
  RATE_LIMIT: 'Too many payment plan actions were attempted. Wait a moment and retry.',
  CONFLICT: 'Payment plan state changed. Refresh and review before trying again.',
};

export type CreditNoteMutationAction = keyof typeof CREDIT_NOTE_FALLBACKS;
export type PaymentPlanMutationAction = keyof typeof PAYMENT_PLAN_FALLBACKS;

export function formatCreditNoteMutationError(
  error: unknown,
  action: CreditNoteMutationAction
): string {
  return formatMutationError(error, CREDIT_NOTE_FALLBACKS[action], {
    codeMessages: CREDIT_NOTE_CODE_MESSAGES,
  });
}

export function formatPaymentPlanMutationError(
  error: unknown,
  action: PaymentPlanMutationAction
): string {
  return formatMutationError(error, PAYMENT_PLAN_FALLBACKS[action], {
    codeMessages: PAYMENT_PLAN_CODE_MESSAGES,
  });
}
