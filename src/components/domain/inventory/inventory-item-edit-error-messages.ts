import { formatInventoryMutationError } from "@/hooks/inventory/_mutation-errors";

export const INVENTORY_ITEM_UPDATE_FAILED_MESSAGE =
  "Inventory item details could not be updated. Please refresh and try again.";

export function getInventoryItemEditSubmitError(error: unknown): string {
  return formatInventoryMutationError(error, INVENTORY_ITEM_UPDATE_FAILED_MESSAGE);
}
