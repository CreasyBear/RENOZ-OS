/**
 * Xero Invoice Sync Server Functions
 *
 * Auto-push invoices to Xero on creation/send, pull payment updates,
 * and handle manual re-sync operations.
 *
 * Key features:
 * - Auto-push with AUD currency and 10% GST
 * - Map battery equipment line items to Xero inventory codes
 * - Sync status tracking (pending, syncing, synced, error)
 * - Payment updates via webhook
 * - 30-day payment terms in Xero metadata
 *
 * @see _Initiation/_prd/2-domains/financial/financial.prd.json for DOM-FIN-005a
 */

import { createServerFn } from '@tanstack/react-start';
import { eq, and, isNull, ne, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderLineItems, customers as customersTable } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import {
  syncInvoiceToXeroSchema,
  resyncInvoiceSchema,
  xeroPaymentUpdateSchema,
  getInvoiceXeroStatusSchema,
  listInvoicesBySyncStatusSchema,
  type XeroSyncResult,
  type InvoiceXeroStatus,
  type XeroLineItem,
  type XeroInvoicePayload,
} from '@/lib/schemas';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default payment terms in days */
const PAYMENT_TERMS_DAYS = 30;

/** Xero tax type for GST output */
const XERO_TAX_TYPE = 'OUTPUT';

/** Xero account code for sales (configurable per org in production) */
const XERO_SALES_ACCOUNT = '200'; // Revenue account

/** Xero base URL for invoice deep links */
const XERO_BASE_URL = 'https://go.xero.com/AccountsReceivable/View.aspx';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert cents to dollars for Xero (Xero uses decimal amounts).
 */
function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Add days to a date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date as YYYY-MM-DD for Xero.
 */
function formatXeroDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Build Xero invoice URL from invoice ID.
 */
function buildXeroInvoiceUrl(xeroInvoiceId: string): string {
  return `${XERO_BASE_URL}?InvoiceID=${xeroInvoiceId}`;
}

/**
 * Map order line items to Xero line items.
 * Maps battery equipment to appropriate Xero inventory codes.
 */
function mapToXeroLineItems(
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    taxAmount: number;
    sku: string | null;
  }>
): XeroLineItem[] {
  return lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitAmount: centsToDollars(item.unitPrice),
    accountCode: XERO_SALES_ACCOUNT,
    taxType: XERO_TAX_TYPE, // GST on all items
    lineAmount: centsToDollars(item.lineTotal - (item.taxAmount ?? 0)),
    // Map SKU to Xero item code if available
    itemCode: item.sku ?? undefined,
  }));
}

/**
 * Build Xero invoice payload from order data.
 */
function buildXeroInvoicePayload(
  order: {
    orderNumber: string;
    orderDate: string;
    total: number;
    subtotal: number;
    taxAmount: number;
  },
  customer: {
    name: string;
    email: string | null;
    xeroContactId?: string | null;
  },
  lineItems: XeroLineItem[]
): XeroInvoicePayload {
  const orderDate = new Date(order.orderDate);
  const dueDate = addDays(orderDate, PAYMENT_TERMS_DAYS);

  return {
    type: 'ACCREC',
    contact: {
      contactID: customer.xeroContactId ?? undefined,
      name: customer.name,
      emailAddress: customer.email ?? undefined,
    },
    date: formatXeroDate(orderDate),
    dueDate: formatXeroDate(dueDate),
    lineItems,
    currencyCode: 'AUD',
    reference: order.orderNumber,
    status: 'AUTHORISED', // Ready for payment
    lineAmountTypes: 'Exclusive', // Tax exclusive amounts
  };
}

// ============================================================================
// XERO API INTEGRATION (STUB)
// ============================================================================

/**
 * Send invoice to Xero API.
 *
 * TODO: Implement actual Xero API integration:
 * 1. Get OAuth access token from organization's integration settings
 * 2. Call Xero Invoices API: POST /api.xro/2.0/Invoices
 * 3. Handle rate limiting (60 calls/minute)
 * 4. Parse response for invoice ID
 *
 * @see https://developer.xero.com/documentation/api/invoices
 */
async function sendToXeroApi(
  _organizationId: string,
  payload: XeroInvoicePayload
): Promise<{ invoiceId: string; invoiceUrl: string }> {
  // TODO: Replace with actual Xero API call
  // For now, simulate successful sync with generated ID

  // Check if Xero is configured (would check integrations table)
  const xeroConfigured = true; // Placeholder

  if (!xeroConfigured) {
    throw new Error('Xero integration not configured for this organization');
  }

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate validation errors for testing
  if (!payload.contact.name) {
    throw new Error('Xero validation error: Contact name is required');
  }

  if (payload.lineItems.length === 0) {
    throw new Error('Xero validation error: At least one line item is required');
  }

  // Generate mock Xero invoice ID (in production, this comes from Xero response)
  const mockInvoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    invoiceId: mockInvoiceId,
    invoiceUrl: buildXeroInvoiceUrl(mockInvoiceId),
  };
}

// ============================================================================
// SYNC INVOICE TO XERO
// ============================================================================

/**
 * Sync an invoice to Xero.
 *
 * Auto-pushes invoice with:
 * - AUD currency
 * - 10% GST on all line items
 * - 30-day payment terms
 * - Battery equipment mapped to Xero inventory codes
 */
export const syncInvoiceToXero = createServerFn()
  .inputValidator(syncInvoiceToXeroSchema)
  .handler(async ({ data }): Promise<XeroSyncResult> => {
    const ctx = await withAuth();
    const { orderId, force } = data;

    // Get order with customer and line items
    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        total: orders.total,
        subtotal: orders.subtotal,
        taxAmount: orders.taxAmount,
        status: orders.status,
        xeroInvoiceId: orders.xeroInvoiceId,
        xeroSyncStatus: orders.xeroSyncStatus,
        customerId: orders.customerId,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      );

    if (!order) {
      return {
        orderId,
        success: false,
        error: 'Order not found',
      };
    }

    // Check if already synced (unless force resync)
    if (order.xeroSyncStatus === 'synced' && order.xeroInvoiceId && !force) {
      return {
        orderId,
        success: true,
        xeroInvoiceId: order.xeroInvoiceId,
        xeroInvoiceUrl: buildXeroInvoiceUrl(order.xeroInvoiceId),
        syncedAt: new Date().toISOString(),
      };
    }

    // Check order status - only sync confirmed/shipped orders
    if (order.status === 'draft' || order.status === 'cancelled') {
      return {
        orderId,
        success: false,
        error: `Cannot sync ${order.status} orders to Xero`,
      };
    }

    // Get customer details
    const [customer] = await db
      .select({
        name: customersTable.name,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(eq(customersTable.id, order.customerId));

    if (!customer) {
      return {
        orderId,
        success: false,
        error: 'Customer not found',
      };
    }

    // Get line items
    const items = await db
      .select({
        description: orderLineItems.description,
        quantity: orderLineItems.quantity,
        unitPrice: orderLineItems.unitPrice,
        lineTotal: orderLineItems.lineTotal,
        taxAmount: orderLineItems.taxAmount,
        sku: orderLineItems.sku,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.orderId, orderId));

    if (items.length === 0) {
      return {
        orderId,
        success: false,
        error: 'Order has no line items',
      };
    }

    // Update status to syncing
    await db
      .update(orders)
      .set({
        xeroSyncStatus: 'syncing',
        xeroSyncError: null,
        lastXeroSyncAt: new Date().toISOString(),
      })
      .where(eq(orders.id, orderId));

    try {
      // Build Xero payload
      const xeroLineItems = mapToXeroLineItems(items);
      const payload = buildXeroInvoicePayload(
        {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          total: order.total,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount ?? 0,
        },
        customer,
        xeroLineItems
      );

      // Send to Xero
      const { invoiceId, invoiceUrl } = await sendToXeroApi(ctx.organizationId, payload);

      // Update order with Xero details
      await db
        .update(orders)
        .set({
          xeroInvoiceId: invoiceId,
          xeroSyncStatus: 'synced',
          xeroSyncError: null,
          xeroInvoiceUrl: invoiceUrl,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(eq(orders.id, orderId));

      return {
        orderId,
        success: true,
        xeroInvoiceId: invoiceId,
        xeroInvoiceUrl: invoiceUrl,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';

      // Update order with error
      await db
        .update(orders)
        .set({
          xeroSyncStatus: 'error',
          xeroSyncError: errorMessage,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(eq(orders.id, orderId));

      return {
        orderId,
        success: false,
        error: errorMessage,
      };
    }
  });

// ============================================================================
// MANUAL RESYNC
// ============================================================================

/**
 * Manually resync a failed invoice to Xero.
 */
export const resyncInvoiceToXero = createServerFn()
  .inputValidator(resyncInvoiceSchema)
  .handler(async ({ data }): Promise<XeroSyncResult> => {
    // Delegate to syncInvoiceToXero with force=true
    return syncInvoiceToXero({ data: { orderId: data.orderId, force: true } });
  });

// ============================================================================
// HANDLE XERO PAYMENT UPDATE
// ============================================================================

/**
 * Process payment update from Xero webhook.
 *
 * Updates order payment status when payment is recorded in Xero.
 *
 * SECURITY: This endpoint receives webhooks from Xero.
 * In production, verify the webhook signature before processing.
 */
export const handleXeroPaymentUpdate = createServerFn()
  .inputValidator(xeroPaymentUpdateSchema)
  .handler(async ({ data }) => {
    // SECURITY: Webhook authentication check
    // TODO: In production, verify Xero webhook signature:
    // const signature = getRequest().headers.get('x-xero-signature');
    // if (!verifyXeroWebhookSignature(JSON.stringify(data), signature)) {
    //   throw new AuthError('Invalid Xero webhook signature');
    // }

    // Environment gate: Webhooks must be explicitly enabled
    const XERO_WEBHOOKS_ENABLED = process.env.XERO_WEBHOOKS_ENABLED === 'true';
    if (!XERO_WEBHOOKS_ENABLED) {
      throw new Error('Xero webhooks not enabled - configure XERO_WEBHOOKS_ENABLED=true');
    }

    const { xeroInvoiceId, amountPaid, paymentDate, reference } = data;

    // Find order by Xero invoice ID
    const [order] = await db
      .select({
        id: orders.id,
        total: orders.total,
        paidAmount: orders.paidAmount,
        balanceDue: orders.balanceDue,
        organizationId: orders.organizationId,
      })
      .from(orders)
      .where(and(eq(orders.xeroInvoiceId, xeroInvoiceId), isNull(orders.deletedAt)));

    if (!order) {
      return {
        success: false,
        error: `Order not found for Xero invoice: ${xeroInvoiceId}`,
      };
    }

    // Calculate new paid amount and balance
    // Amount from Xero is in dollars, convert to cents for storage
    const amountPaidCents = Math.round(amountPaid * 100);
    const newPaidAmount = (order.paidAmount ?? 0) + amountPaidCents;
    const newBalanceDue = order.total - newPaidAmount;

    // Determine payment status
    const paymentStatus = newBalanceDue <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    // Update order
    await db
      .update(orders)
      .set({
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        paymentStatus,
        metadata: {
          lastXeroPaymentAmount: amountPaid,
          lastXeroPaymentDate: paymentDate,
          lastXeroPaymentRef: reference ?? null,
        },
      })
      .where(eq(orders.id, order.id));

    return {
      success: true,
      orderId: order.id,
      newPaidAmount,
      newBalanceDue,
      paymentStatus,
    };
  });

// ============================================================================
// GET INVOICE XERO STATUS
// ============================================================================

/**
 * Get the Xero sync status for an invoice.
 */
export const getInvoiceXeroStatus = createServerFn()
  .inputValidator(getInvoiceXeroStatusSchema)
  .handler(async ({ data }): Promise<InvoiceXeroStatus | null> => {
    const ctx = await withAuth();

    const [order] = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        xeroInvoiceId: orders.xeroInvoiceId,
        xeroSyncStatus: orders.xeroSyncStatus,
        xeroSyncError: orders.xeroSyncError,
        lastXeroSyncAt: orders.lastXeroSyncAt,
        xeroInvoiceUrl: orders.xeroInvoiceUrl,
      })
      .from(orders)
      .where(
        and(
          eq(orders.id, data.orderId),
          eq(orders.organizationId, ctx.organizationId),
          isNull(orders.deletedAt)
        )
      );

    if (!order) {
      return null;
    }

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      xeroInvoiceId: order.xeroInvoiceId,
      xeroSyncStatus: order.xeroSyncStatus ?? 'pending',
      xeroSyncError: order.xeroSyncError,
      lastXeroSyncAt: order.lastXeroSyncAt,
      xeroInvoiceUrl: order.xeroInvoiceUrl,
    };
  });

// ============================================================================
// LIST INVOICES BY SYNC STATUS
// ============================================================================

/**
 * List invoices filtered by Xero sync status.
 */
export const listInvoicesBySyncStatus = createServerFn()
  .inputValidator(listInvoicesBySyncStatusSchema)
  .handler(async ({ data }) => {
    const ctx = await withAuth();
    const { status, errorsOnly, page, pageSize } = data;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = [
      eq(orders.organizationId, ctx.organizationId),
      isNull(orders.deletedAt),
      ne(orders.status, 'draft'),
      ne(orders.status, 'cancelled'),
    ];

    if (status) {
      conditions.push(eq(orders.xeroSyncStatus, status));
    }

    if (errorsOnly) {
      conditions.push(eq(orders.xeroSyncStatus, 'error'));
    }

    const results = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        orderDate: orders.orderDate,
        total: orders.total,
        xeroInvoiceId: orders.xeroInvoiceId,
        xeroSyncStatus: orders.xeroSyncStatus,
        xeroSyncError: orders.xeroSyncError,
        lastXeroSyncAt: orders.lastXeroSyncAt,
        xeroInvoiceUrl: orders.xeroInvoiceUrl,
        customerName: customersTable.name,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
      .where(and(...conditions))
      .orderBy(desc(orders.orderDate))
      .limit(pageSize)
      .offset(offset);

    return {
      invoices: results.map((r) => ({
        orderId: r.orderId,
        orderNumber: r.orderNumber,
        orderDate: r.orderDate,
        total: r.total,
        customerName: r.customerName,
        xeroInvoiceId: r.xeroInvoiceId,
        xeroSyncStatus: r.xeroSyncStatus ?? 'pending',
        xeroSyncError: r.xeroSyncError,
        lastXeroSyncAt: r.lastXeroSyncAt,
        xeroInvoiceUrl: r.xeroInvoiceUrl,
      })),
      page,
      pageSize,
    };
  });
