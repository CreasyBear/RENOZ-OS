export const INVENTORY_DASHBOARD_DATA_UNAVAILABLE_MESSAGE =
  'Inventory dashboard data is temporarily unavailable. Please refresh and try again.';

export const INVENTORY_DASHBOARD_METRICS_UNAVAILABLE_MESSAGE =
  'Inventory dashboard metrics are temporarily unavailable. Please refresh and try again.';

export function getWmsDashboardReadErrorMessage(error: unknown): string | null {
  return error ? INVENTORY_DASHBOARD_DATA_UNAVAILABLE_MESSAGE : null;
}

export function getInventoryDashboardReadErrorMessage(error: unknown): string | null {
  return error ? INVENTORY_DASHBOARD_METRICS_UNAVAILABLE_MESSAGE : null;
}
