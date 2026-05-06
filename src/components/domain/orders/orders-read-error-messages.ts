import { isReadQueryError } from "@/lib/read-path-policy";

export const ORDERS_LIST_FALLBACK_MESSAGE =
  "Orders are temporarily unavailable. Please refresh and try again.";

export function getOrdersListReadErrorMessage(error: unknown): string {
  return isReadQueryError(error) && error.message.trim().length > 0
    ? error.message
    : ORDERS_LIST_FALLBACK_MESSAGE;
}
