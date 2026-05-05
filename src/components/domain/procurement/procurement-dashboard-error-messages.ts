import { isReadQueryError } from '@/lib/read-path-policy';

export const PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE =
  'Spend metrics are temporarily unavailable. Please refresh and try again.';

export const PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE =
  'Order metrics are temporarily unavailable. Please refresh and try again.';

export const PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE =
  'Supplier metrics are temporarily unavailable. Please refresh and try again.';

export const PROCUREMENT_APPROVALS_FALLBACK_MESSAGE =
  'Pending approvals are temporarily unavailable. Please refresh and try again.';

export const PROCUREMENT_DASHBOARD_FALLBACK_MESSAGE =
  'Procurement dashboard data is temporarily unavailable. Please refresh and try again.';

function getReadErrorMessage(error: unknown, fallbackMessage: string): string {
  return isReadQueryError(error) ? error.message : fallbackMessage;
}

export function getProcurementSpendMetricsErrorMessage(error: unknown): string {
  return getReadErrorMessage(error, PROCUREMENT_SPEND_METRICS_FALLBACK_MESSAGE);
}

export function getProcurementOrderMetricsErrorMessage(error: unknown): string {
  return getReadErrorMessage(error, PROCUREMENT_ORDER_METRICS_FALLBACK_MESSAGE);
}

export function getProcurementSupplierMetricsErrorMessage(error: unknown): string {
  return getReadErrorMessage(error, PROCUREMENT_SUPPLIER_METRICS_FALLBACK_MESSAGE);
}

export function getProcurementApprovalsErrorMessage(error: unknown): string {
  return getReadErrorMessage(error, PROCUREMENT_APPROVALS_FALLBACK_MESSAGE);
}

export function getProcurementDashboardErrorMessage(error: unknown): string {
  return getReadErrorMessage(error, PROCUREMENT_DASHBOARD_FALLBACK_MESSAGE);
}
