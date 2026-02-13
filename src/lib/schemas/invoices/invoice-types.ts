/**
 * Invoice Types
 *
 * Shared type definitions for invoice list and response data.
 * These types are used by both server functions and UI components.
 *
 * @see docs/design-system/INVOICE-STANDARDS.md
 */

import type { InvoiceStatus } from '@/lib/constants/invoice-status';

// ============================================================================
// LIST TYPES
// ============================================================================

export interface InvoiceListItem {
  id: string;
  orderNumber: string;
  invoiceNumber: string | null;
  customerId: string;
  invoiceStatus: InvoiceStatus | null;
  invoiceDueDate: string | null;
  invoiceSentAt: Date | null;
  invoiceViewedAt: Date | null;
  invoicePdfUrl: string | null;
  total: number | null;
  paidAmount: number | null;
  balanceDue: number | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    email: string | null;
  };
}

export interface InvoiceListResponse {
  invoices: InvoiceListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Invoice summary totals - used in summary cards component
 * Matches the `totals` field from InvoiceSummaryResponse
 */
export interface InvoiceSummaryData {
  open: {
    count: number;
    amount: number;
  };
  overdue: {
    count: number;
    amount: number;
  };
  paid: {
    count: number;
    amount: number;
  };
}
