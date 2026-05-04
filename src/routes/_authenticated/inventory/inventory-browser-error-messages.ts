export const INVENTORY_BROWSER_UNAVAILABLE_MESSAGE =
  'Inventory data is temporarily unavailable. Please refresh and try again.';

export function getInventoryBrowserReadErrorMessage(error: unknown): string | null {
  return error ? INVENTORY_BROWSER_UNAVAILABLE_MESSAGE : null;
}
