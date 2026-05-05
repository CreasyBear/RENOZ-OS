import { isReadQueryError } from '@/lib/read-path-policy';

export const CUSTOMER_LIST_FALLBACK_MESSAGE =
  'Customers are temporarily unavailable. Please refresh and try again.';

export function getCustomerListReadErrorMessage(error: unknown): string {
  return isReadQueryError(error) ? error.message : CUSTOMER_LIST_FALLBACK_MESSAGE;
}
