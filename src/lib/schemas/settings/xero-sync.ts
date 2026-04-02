/**
 * Xero Invoice Sync Zod Schemas
 *
 * Validation schemas for Xero invoice synchronization.
 * Handles auto-push, manual resync, and payment updates.
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-005a
 */

import { z } from 'zod';
import { idSchema, normalizeObjectInput } from '../_shared/patterns';

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
  organizationId: idSchema.optional(),
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

export const xeroWebhookEventSchema = z.object({
  id: z.string().min(1),
  eventCategory: z.string().min(1),
  eventType: z.string().min(1),
  eventDateUtc: z.string().optional(),
  resourceId: z.string().min(1).optional(),
  resourceUrl: z.string().url().optional(),
  tenantId: z.string().min(1),
  tenantType: z.string().optional(),
})

export const xeroWebhookPayloadSchema = z.object({
  events: z.array(xeroWebhookEventSchema),
  firstEventSequence: z.number().int().optional(),
  lastEventSequence: z.number().int().optional(),
  entropy: z.string().optional(),
})

export type XeroWebhookEvent = z.infer<typeof xeroWebhookEventSchema>;
export type XeroWebhookPayload = z.infer<typeof xeroWebhookPayloadSchema>;

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
export const listInvoicesBySyncStatusSchema = normalizeObjectInput(
  z.object({
    status: xeroSyncStatusSchema.optional(),
    // Only include invoices with errors
    errorsOnly: z.boolean().default(false),
    // Pagination
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(100).default(20),
  })
);

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
  status?: 'pending' | 'syncing' | 'synced' | 'error';
  xeroInvoiceId?: string;
  xeroInvoiceUrl?: string;
  error?: string;
  syncedAt?: string;
  integrationAvailable?: boolean;
  errorCode?: string | null;
  nextAction?: XeroNextAction | null;
  nextActionLabel?: string | null;
  retryAfterSeconds?: number | null;
  stages?: {
    readiness: WorkflowStageResult;
    validation: WorkflowStageResult;
    sync: WorkflowStageResult;
    persist: WorkflowStageResult;
  };
}

export type XeroNextAction =
  | 'connect_xero'
  | 'reconnect_xero'
  | 'map_customer_contact'
  | 'open_org_settings'
  | 'retry_later'
  | 'review_validation'
  | 'view_reconciled_invoice';

export type XeroIssueSeverity = 'critical' | 'warning' | 'info';
export type XeroRetryPolicy = 'allowed' | 'blocked' | 'retry_after';
export type WorkflowStageStatus = 'completed' | 'failed' | 'skipped';

export interface WorkflowStageResult {
  status: WorkflowStageStatus;
  message?: string;
}

export interface XeroIssueAction {
  action: XeroNextAction | null;
  label: string | null;
}

export interface XeroSyncIssue {
  code: string;
  title: string;
  message: string;
  severity: XeroIssueSeverity;
  nextAction: XeroNextAction | null;
  nextActionLabel: string | null;
  primaryAction: XeroIssueAction;
  secondaryAction?: XeroIssueAction | null;
  retryPolicy: XeroRetryPolicy;
  retryAfterSeconds?: number | null;
  relatedEntityIds?: {
    orderId?: string;
    customerId?: string;
    customerXeroContactId?: string | null;
  };
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
  integrationAvailable?: boolean;
  integrationMessage?: string | null;
  issue?: XeroSyncIssue | null;
  customerXeroContactId?: string | null;
  customerId?: string;
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
  canResync?: boolean;
  issue?: XeroSyncIssue | null;
  customerXeroContactId?: string | null;
}

export interface XeroIntegrationStatus {
  available: boolean;
  provider: 'xero';
  connectionId?: string | null;
  tenantId?: string | null;
  tenantLabel?: string | null;
  isActive: boolean;
  status:
    | 'connected'
    | 'not_connected'
    | 'reconnect_required'
    | 'configuration_unavailable';
  message: string;
  nextAction: XeroNextAction | null;
  nextActionLabel: string | null;
}

export interface XeroSyncSummary {
  totalInvoices: number;
  pendingCount: number;
  syncingCount: number;
  syncedCount: number;
  errorCount: number;
  blockerCounts: Array<{
    code: string;
    label: string;
    count: number;
    nextAction: XeroNextAction | null;
    nextActionLabel: string | null;
  }>;
}

export interface XeroPaymentEventRecord {
  id: string;
  orderId: string | null;
  dedupeKey: string;
  xeroInvoiceId: string;
  paymentId: string | null;
  amount: number;
  paymentDate: string;
  reference: string | null;
  resultState: 'processing' | 'applied' | 'duplicate' | 'unknown_invoice' | 'rejected';
  processedAt: string;
  payloadSummary: {
    payload: Record<string, object>;
    invoice: {
      id: string;
    };
    payment: {
      id: string;
      date: string;
      reference: string;
    };
  };
  outcomeTitle: string;
  outcomeMessage: string;
}

export interface ListXeroPaymentEventsResponse {
  items: XeroPaymentEventRecord[];
  total: number;
}

export interface SearchXeroContactResult {
  id: string;
  name: string;
  email: string | null;
  contactNumber: string | null;
  phones: Array<{ type: string | null; number: string | null }>;
  updatedDateUtc: string | null;
  matchReason: 'exact_email' | 'name_match' | 'contact_number' | 'fallback';
}

export interface XeroCustomerMappingStatus {
  customerId: string;
  xeroContactId: string | null;
  mappedContact:
    | {
        id: string;
        name: string;
        email: string | null;
        phones: Array<{ type: string | null; number: string | null }>;
      }
    | null;
}

/**
 * Response from listInvoicesBySyncStatus server function.
 */
export interface ListInvoicesBySyncStatusResponse {
  invoices: InvoiceWithSyncStatus[];
  total: number;
  page: number;
  pageSize: number;
  integrationAvailable?: boolean;
  integrationMessage?: string | null;
}
