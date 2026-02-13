/**
 * Xero Invoice Sync Zod Schemas
 *
 * Validation schemas for Xero invoice synchronization.
 * Handles auto-push, manual resync, and payment updates.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-005a
 */

import { z } from 'zod';
import { idSchema } from '../_shared/patterns';

// ============================================================================
// XERO SYNC STATUS
// ============================================================================

// Import from orders domain to avoid duplicate exports
import { xeroSyncStatusValues, xeroSyncStatusSchema, type XeroSyncStatus } from '../orders/orders';

export { xeroSyncStatusValues, xeroSyncStatusSchema, type XeroSyncStatus };

// ============================================================================
// SYNC INVOICE TO XERO
// ============================================================================

/**
 * Parameters for syncing an invoice to Xero.
 */
export const syncInvoiceToXeroSchema = z.object({
  orderId: idSchema,
  // Force sync even if already synced
  force: z.boolean().default(false),
});

export type SyncInvoiceToXeroInput = z.infer<typeof syncInvoiceToXeroSchema>;

// ============================================================================
// MANUAL RESYNC
// ============================================================================

/**
 * Parameters for manual resync of a failed invoice.
 */
export const resyncInvoiceSchema = z.object({
  orderId: idSchema,
});

export type ResyncInvoiceInput = z.infer<typeof resyncInvoiceSchema>;

// ============================================================================
// XERO PAYMENT UPDATE
// ============================================================================

/**
 * Payment update from Xero webhook.
 */
export const xeroPaymentUpdateSchema = z.object({
  xeroInvoiceId: z.string().min(1),
  paymentId: z.string().min(1),
  amountPaid: z.number().positive(),
  paymentDate: z.string(), // ISO date string
  reference: z.string().optional(),
});

export type XeroPaymentUpdate = z.infer<typeof xeroPaymentUpdateSchema>;

/**
 * Bulk payment updates from Xero webhook.
 */
export const xeroPaymentUpdatesSchema = z.object({
  payments: z.array(xeroPaymentUpdateSchema).min(1),
});

export type XeroPaymentUpdates = z.infer<typeof xeroPaymentUpdatesSchema>;

// ============================================================================
// GET INVOICE XERO STATUS
// ============================================================================

/**
 * Query for getting invoice Xero sync status.
 */
export const getInvoiceXeroStatusSchema = z.object({
  orderId: idSchema,
});

export type GetInvoiceXeroStatusInput = z.infer<typeof getInvoiceXeroStatusSchema>;

// ============================================================================
// LIST INVOICES BY SYNC STATUS
// ============================================================================

/**
 * Query for listing invoices by Xero sync status.
 */
export const listInvoicesBySyncStatusSchema = z.object({
  status: xeroSyncStatusSchema.optional(),
  // Only include invoices with errors
  errorsOnly: z.boolean().default(false),
  // Pagination
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type ListInvoicesBySyncStatusInput = z.infer<typeof listInvoicesBySyncStatusSchema>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * Xero sync result for a single invoice.
 */
export interface XeroSyncResult {
  orderId: string;
  success: boolean;
  xeroInvoiceId?: string;
  xeroInvoiceUrl?: string;
  error?: string;
  syncedAt?: string;
}

/**
 * Invoice Xero status response.
 */
export interface InvoiceXeroStatus {
  orderId: string;
  orderNumber: string;
  xeroInvoiceId: string | null;
  xeroSyncStatus: XeroSyncStatus;
  xeroSyncError: string | null;
  lastXeroSyncAt: string | null;
  xeroInvoiceUrl: string | null;
}

/**
 * Xero line item mapping for battery equipment.
 */
export interface XeroLineItem {
  description: string;
  quantity: number;
  unitAmount: number; // AUD (not cents)
  accountCode: string; // Xero account code
  taxType: string; // "OUTPUT" for GST
  lineAmount: number; // Line total AUD
  itemCode?: string; // Xero inventory code
}

/**
 * Xero invoice payload.
 */
export interface XeroInvoicePayload {
  type: 'ACCREC'; // Accounts receivable
  contact: {
    contactID?: string;
    name: string;
    emailAddress?: string;
  };
  date: string; // Invoice date YYYY-MM-DD
  dueDate: string; // Due date YYYY-MM-DD
  lineItems: XeroLineItem[];
  currencyCode: 'AUD';
  reference: string; // Order number
  status: 'DRAFT' | 'SUBMITTED' | 'AUTHORISED';
  // Payment terms
  lineAmountTypes: 'Exclusive'; // Tax exclusive
}

/**
 * Invoice with Xero sync status information.
 * Returned by listInvoicesBySyncStatus server function.
 */
export interface InvoiceWithSyncStatus {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  total: number;
  customerId: string;
  customerName: string;
  xeroInvoiceId: string | null;
  xeroSyncStatus: XeroSyncStatus;
  xeroSyncError: string | null;
  lastXeroSyncAt: Date | null;
  xeroInvoiceUrl: string | null;
}

/**
 * Response from listInvoicesBySyncStatus server function.
 */
export interface ListInvoicesBySyncStatusResponse {
  invoices: InvoiceWithSyncStatus[];
  total: number;
  page: number;
  pageSize: number;
}
