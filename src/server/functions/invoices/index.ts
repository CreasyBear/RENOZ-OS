/**
 * Invoice Server Functions
 *
 * Barrel export for all invoice-related server functions.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

// ============================================================================
// LIST & DETAIL
// ============================================================================

export { getInvoices } from './get-invoices';
export type { InvoiceListItem, InvoiceListResponse } from '@/lib/schemas/invoices';
export { getInvoice, type InvoiceDetail, type InvoiceLineItem } from './get-invoice';

// ============================================================================
// MUTATIONS
// ============================================================================

export {
  updateInvoiceStatus,
  markInvoiceViewed,
  type UpdateInvoiceStatusResponse,
} from './update-invoice-status';

export {
  sendInvoiceReminder,
  type SendInvoiceReminderResponse,
} from './send-invoice-reminder';

export {
  voidInvoice,
  type VoidInvoiceResponse,
} from './void-invoice';

// ============================================================================
// SUMMARY & ANALYTICS
// ============================================================================

export {
  getInvoiceSummary,
  type InvoiceStatusSummary,
  type InvoiceSummaryResponse,
} from './get-invoice-summary';
