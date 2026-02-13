/**
 * Invoice Helper Utilities
 *
 * Shared utilities for invoice-related logic across components.
 */

/**
 * Check if an order has an invoice
 * An invoice exists if invoiceNumber is set (not null)
 */
export function hasInvoice(order: { invoiceNumber?: string | null }): boolean {
  return order.invoiceNumber != null && order.invoiceNumber !== '';
}
