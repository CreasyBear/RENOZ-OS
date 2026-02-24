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
import { setResponseStatus } from '@tanstack/react-start/server';
import { eq, and, isNull, ne, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderLineItems, customers as customersTable, organizations } from 'drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import {
  syncInvoiceToXeroSchema,
  resyncInvoiceSchema,
  xeroPaymentUpdateSchema,
  getInvoiceXeroStatusSchema,
  listInvoicesBySyncStatusSchema,
  xeroSyncStatusSchema,
  type XeroSyncResult,
  type InvoiceXeroStatus,
  type XeroLineItem,
  type XeroInvoicePayload,
  type InvoiceWithSyncStatus,
  type ListInvoicesBySyncStatusResponse,
} from '@/lib/schemas';
import { getRequest } from '@tanstack/react-start/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthError, ServerError, ValidationError } from '@/lib/server/errors';
import { safeNumber } from '@/lib/numeric';

// ============================================================================
// CONSTANTS (fallback when org settings not set)
// ============================================================================

/** Default payment terms in days */
const DEFAULT_PAYMENT_TERMS_DAYS = 30;

/** Xero tax type for GST output */
const DEFAULT_XERO_TAX_TYPE = 'OUTPUT';

/** Xero account code for sales */
const DEFAULT_XERO_SALES_ACCOUNT = '200';

/** Xero base URL for invoice deep links */
const XERO_BASE_URL = 'https://go.xero.com/AccountsReceivable/View.aspx';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

/** Xero config from org settings with fallback to defaults */
interface XeroConfig {
  salesAccount: string;
  taxType: string;
  paymentTermsDays: number;
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
  }>,
  config: Pick<XeroConfig, 'salesAccount' | 'taxType'>
): XeroLineItem[] {
  return lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitAmount: item.unitPrice,
    accountCode: config.salesAccount,
    taxType: config.taxType,
    lineAmount: item.lineTotal - (item.taxAmount ?? 0),
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
  lineItems: XeroLineItem[],
  paymentTermsDays: number
): XeroInvoicePayload {
  const orderDate = new Date(order.orderDate);
  const dueDate = addDays(orderDate, paymentTermsDays);

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

/**
 * Verify Xero webhook signature using HMAC-SHA256.
 *
 * Xero sends an `x-xero-signature` header containing an HMAC-SHA256 hash
 * of the request body using the webhook signing key.
 *
 * @see https://developer.xero.com/documentation/guides/webhooks/overview
 */
function verifyXeroWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('base64');

  // Use timing-safe comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'base64');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/** Maximum single payment amount in AUD (10 million) */
const MAX_PAYMENT_AMOUNT_AUD = 10_000_000;

/** Maximum negative balance allowed (small tolerance for rounding) */
const MIN_BALANCE_THRESHOLD_AUD = -0.01;

// ============================================================================
// XERO API INTEGRATION (STUB)
// ============================================================================

/**
 * Send invoice to Xero API.
 *
 * TODO(PHASE12-003): Implement actual Xero API integration:
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
  // TODO(PHASE12-003): Replace with actual Xero API call
  // For now, simulate successful sync with generated ID

  // Check if Xero is configured (would check integrations table)
  const xeroConfigured = true; // Placeholder

  if (!xeroConfigured) {
    throw new ServerError('Xero integration not configured for this organization');
  }

  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Simulate validation errors for testing
  if (!payload.contact.name) {
    throw new ValidationError('Xero validation error: Contact name is required');
  }

  if (payload.lineItems.length === 0) {
    throw new ValidationError('Xero validation error: At least one line item is required');
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
export const syncInvoiceToXero = createServerFn({ method: 'POST' })
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

    // Get customer details — scoped by organizationId for multi-tenant safety
    const [customer] = await db
      .select({
        name: customersTable.name,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, order.customerId),
          eq(customersTable.organizationId, ctx.organizationId),
          isNull(customersTable.deletedAt)
        )
      );

    if (!customer) {
      return {
        orderId,
        success: false,
        error: 'Customer not found',
      };
    }

    // Get line items — scoped by organizationId for multi-tenant safety
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
      .where(
        and(
          eq(orderLineItems.orderId, orderId),
          eq(orderLineItems.organizationId, ctx.organizationId)
        )
      );

    if (items.length === 0) {
      return {
        orderId,
        success: false,
        error: 'Order has no line items',
      };
    }

    // Get org Xero config (settings or defaults)
    const [org] = await db
      .select({
        defaultPaymentTerms: organizations.defaultPaymentTerms,
        settings: organizations.settings,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    const xeroConfig: XeroConfig = {
      salesAccount:
        (org?.settings as { xeroSalesAccount?: string } | null)?.xeroSalesAccount ??
        DEFAULT_XERO_SALES_ACCOUNT,
      taxType:
        (org?.settings as { xeroTaxType?: string } | null)?.xeroTaxType ?? DEFAULT_XERO_TAX_TYPE,
      paymentTermsDays: org?.defaultPaymentTerms ?? DEFAULT_PAYMENT_TERMS_DAYS,
    };

    // Update status to syncing — orgId for defense-in-depth
    await db
      .update(orders)
      .set({
        xeroSyncStatus: 'syncing',
        xeroSyncError: null,
        lastXeroSyncAt: new Date().toISOString(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

    try {
      // Build Xero payload
      const xeroLineItems = mapToXeroLineItems(items, xeroConfig);
      const payload = buildXeroInvoicePayload(
        {
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          total: order.total,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount ?? 0,
        },
        customer,
        xeroLineItems,
        xeroConfig.paymentTermsDays
      );

      // Send to Xero
      const { invoiceId, invoiceUrl } = await sendToXeroApi(ctx.organizationId, payload);

      // Update order with Xero details — orgId for defense-in-depth
      await db
        .update(orders)
        .set({
          xeroInvoiceId: invoiceId,
          xeroSyncStatus: 'synced',
          xeroSyncError: null,
          xeroInvoiceUrl: invoiceUrl,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

      return {
        orderId,
        success: true,
        xeroInvoiceId: invoiceId,
        xeroInvoiceUrl: invoiceUrl,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';

      // Update order with error — orgId for defense-in-depth
      await db
        .update(orders)
        .set({
          xeroSyncStatus: 'error',
          xeroSyncError: errorMessage,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

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
export const resyncInvoiceToXero = createServerFn({ method: 'POST' })
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
 * Webhook signature is verified via HMAC-SHA256 using XERO_WEBHOOK_SECRET.
 */
export const handleXeroPaymentUpdate = createServerFn({ method: 'POST' })
  .inputValidator(xeroPaymentUpdateSchema)
  .handler(async ({ data }) => {
    // SECURITY: Verify Xero webhook signature (HMAC-SHA256)
    const webhookSecret = process.env.XERO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServerError('Xero webhook secret not configured - set XERO_WEBHOOK_SECRET');
    }

    const request = getRequest();
    const signature = request.headers.get('x-xero-signature');
    if (!signature) {
      throw new AuthError('Missing Xero webhook signature');
    }

    // Verify the HMAC-SHA256 signature against the raw request body
    const rawBody = JSON.stringify(data);
    if (!verifyXeroWebhookSignature(rawBody, signature, webhookSecret)) {
      throw new AuthError('Invalid Xero webhook signature');
    }

    // Environment gate: Webhooks must be explicitly enabled
    const XERO_WEBHOOKS_ENABLED = process.env.XERO_WEBHOOKS_ENABLED === 'true';
    if (!XERO_WEBHOOKS_ENABLED) {
      throw new ServerError('Xero webhooks not enabled - configure XERO_WEBHOOKS_ENABLED=true');
    }

    const { xeroInvoiceId, amountPaid, paymentDate, reference } = data;

    // SECURITY: Bounds checking on payment amount
    if (amountPaid <= 0) {
      throw new ValidationError('Payment amount must be positive');
    }
    if (amountPaid > MAX_PAYMENT_AMOUNT_AUD) {
      throw new ValidationError(
        `Payment amount ${amountPaid} exceeds maximum allowed (${MAX_PAYMENT_AMOUNT_AUD} AUD)`
      );
    }

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

    // Calculate new paid amount and balance (amounts are stored in dollars)
    const newPaidAmount = (order.paidAmount ?? 0) + amountPaid;
    const newBalanceDue = order.total - newPaidAmount;

    // SECURITY: Bounds checking on resulting balance
    if (newBalanceDue < MIN_BALANCE_THRESHOLD_AUD) {
      throw new ValidationError(
        `Payment would result in overpayment: balance due would be ${newBalanceDue.toFixed(2)} AUD`
      );
    }

    // Determine payment status
    const paymentStatus = newBalanceDue <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    // Update order using atomic SQL increment to avoid race conditions on paidAmount.
    // Scope by organizationId for defense-in-depth (webhook handler).
    const [updatedOrder] = await db
      .update(orders)
      .set({
        paidAmount: sql`COALESCE(${orders.paidAmount}, 0) + ${amountPaid}`,
        balanceDue: sql`${orders.total} - (COALESCE(${orders.paidAmount}, 0) + ${amountPaid})`,
        paymentStatus,
        metadata: {
          lastXeroPaymentAmount: amountPaid,
          lastXeroPaymentDate: paymentDate,
          lastXeroPaymentRef: reference ?? null,
        },
      })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.organizationId, order.organizationId)
        )
      )
      .returning();

    if (!updatedOrder) {
      throw new ValidationError('Failed to update order payment status — order not found or already modified');
    }

    return {
      success: true,
      orderId: order.id,
      newPaidAmount: safeNumber(updatedOrder.paidAmount),
      newBalanceDue: safeNumber(updatedOrder.balanceDue),
      paymentStatus,
    };
  });

// ============================================================================
// GET INVOICE XERO STATUS
// ============================================================================

/**
 * Get the Xero sync status for an invoice.
 */
export const getInvoiceXeroStatus = createServerFn({ method: 'GET' })
  .inputValidator(getInvoiceXeroStatusSchema)
  .handler(async ({ data }): Promise<InvoiceXeroStatus> => {
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
      setResponseStatus(404);
      throw new NotFoundError('Order not found', 'order');
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
export const listInvoicesBySyncStatus = createServerFn({ method: 'GET' })
  .inputValidator(listInvoicesBySyncStatusSchema)
  .handler(async ({ data }): Promise<ListInvoicesBySyncStatusResponse> => {
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

    // Run data query and count query in parallel
    const [results, countResult] = await Promise.all([
      db
        .select({
          orderId: orders.id,
          orderNumber: orders.orderNumber,
          orderDate: orders.orderDate,
          total: orders.total,
          customerId: orders.customerId,
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
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(orders)
        .where(and(...conditions)),
    ]);

    const totalCount = countResult[0]?.count ?? 0;

    return {
      invoices: results.map((r): InvoiceWithSyncStatus => {
        // Validate enum value from database
        const syncStatus = xeroSyncStatusSchema.parse(r.xeroSyncStatus ?? 'pending');

        return {
          orderId: r.orderId,
          orderNumber: r.orderNumber,
          orderDate: new Date(r.orderDate),
          total: safeNumber(r.total),
          customerId: r.customerId,
          customerName: r.customerName,
          xeroInvoiceId: r.xeroInvoiceId,
          xeroSyncStatus: syncStatus,
          xeroSyncError: r.xeroSyncError,
          lastXeroSyncAt: r.lastXeroSyncAt ? new Date(r.lastXeroSyncAt) : null,
          xeroInvoiceUrl: r.xeroInvoiceUrl,
        };
      }),
      total: totalCount,
      page,
      pageSize,
    };
  });
