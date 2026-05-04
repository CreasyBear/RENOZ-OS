import { formatInventoryMutationError } from '@/hooks/inventory/_mutation-errors';

export const PRODUCT_INVENTORY_ADJUST_FAILED_MESSAGE =
  'Product inventory adjustment could not be completed. Please refresh and try again.';

const PRODUCT_INVENTORY_CODE_MESSAGES: Record<string, string> = {
  invalid_serial_state: 'Serialized state conflict detected. Review serial lifecycle and retry.',
};

export function mapProductInventoryMutationError(error: unknown): string {
  return formatInventoryMutationError(error, PRODUCT_INVENTORY_ADJUST_FAILED_MESSAGE, {
    codeMessages: PRODUCT_INVENTORY_CODE_MESSAGES,
  });
}
