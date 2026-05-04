import { formatInventoryMutationError } from "@/hooks/inventory/_mutation-errors";

export const STOCK_ADJUSTMENT_FAILED_MESSAGE =
  "Inventory adjustment could not be completed. Please refresh and try again.";
export const STOCK_TRANSFER_FAILED_MESSAGE =
  "Inventory transfer could not be completed. Please refresh and try again.";

export function getStockAdjustmentSubmitError(error: unknown): string {
  return formatInventoryMutationError(error, STOCK_ADJUSTMENT_FAILED_MESSAGE);
}

export function getStockTransferSubmitError(error: unknown): string {
  return formatInventoryMutationError(error, STOCK_TRANSFER_FAILED_MESSAGE);
}
