/**
 * Invoice Domain Hooks
 *
 * TanStack Query hooks for invoice management operations.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

// ============================================================================
// LIST & DETAIL HOOKS
// ============================================================================

export {
  useInvoices,
  useInvoice,
  type UseInvoicesOptions,
  type UseInvoiceOptions,
  type InvoiceListResult,
  type InvoiceDetail,
} from './use-invoices';

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export {
  useUpdateInvoiceStatus,
  useMarkInvoiceViewed,
  type UpdateStatusResult,
} from './use-update-invoice-status';

export { useVoidInvoice } from './use-invoices';

export { useSendInvoiceReminder } from './use-send-invoice-reminder';
export { useBulkSendReminders, useBulkUpdateInvoiceStatus } from './use-bulk-invoice-operations';

// ============================================================================
// SUMMARY & ANALYTICS HOOKS
// ============================================================================

export {
  useInvoiceSummary,
  type UseInvoiceSummaryOptions,
  type InvoiceSummaryResult,
} from './use-invoice-summary';

// ============================================================================
// COMPOSITE DETAIL HOOK
// ============================================================================

export {
  useInvoiceDetail,
  type UseInvoiceDetailReturn,
  type InvoiceAlert,
  type InvoiceDetailActions,
} from './use-invoice-detail';
