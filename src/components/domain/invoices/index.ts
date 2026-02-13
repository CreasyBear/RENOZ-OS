/**
 * Invoice Domain Components
 *
 * Components for invoice management UI.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

export { InvoiceStatusBadge, type InvoiceStatusBadgeProps } from './invoice-status-badge';

// ============================================================================
// LIST VIEW COMPONENTS
// ============================================================================

export { InvoiceListContainer, type InvoiceListContainerProps } from './list/invoice-list-container';
export { InvoiceListPresenter, type InvoiceListPresenterProps } from './list/invoice-list-presenter';
export { InvoiceSummaryCards, type InvoiceSummaryCardsProps } from './list/invoice-summary-cards';
export type { InvoiceSummaryData } from '@/lib/schemas/invoices';

// ============================================================================
// DETAIL VIEW COMPONENTS
// ============================================================================

export { InvoiceDetailContainer, type InvoiceDetailContainerProps } from './detail/invoice-detail-container';
export { InvoiceDetailView, type InvoiceDetailViewProps } from './detail/invoice-detail-view';

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

export { getInvoiceColumns } from './columns/invoice-columns';
