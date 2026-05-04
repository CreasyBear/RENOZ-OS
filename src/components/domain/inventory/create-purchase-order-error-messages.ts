import { formatInventoryMutationError } from "@/hooks/inventory/_mutation-errors";

export const CREATE_PURCHASE_ORDER_FAILED_MESSAGE =
  "Purchase order could not be created. Review supplier, quantity, and pricing, then try again.";

export function getCreatePurchaseOrderSubmitError(error: unknown): string {
  return formatInventoryMutationError(error, CREATE_PURCHASE_ORDER_FAILED_MESSAGE);
}
