export const SERIALIZED_ITEMS_UNAVAILABLE_MESSAGE =
  'Serialized items are temporarily unavailable. Please refresh and try again.';

export function getSerializedItemsReadErrorMessage(error: unknown): string | null {
  return error ? SERIALIZED_ITEMS_UNAVAILABLE_MESSAGE : null;
}
