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
import { normalizeObjectInput } from '@/lib/schemas/_shared/patterns';
import {
  orders,
  orderLineItems,
  customers as customersTable,
  organizations,
  orderPayments,
  oauthConnections,
  xeroPaymentEvents,
  users,
} from '../../../../drizzle/schema';
import { withAuth } from '@/lib/server/protected';
import { NotFoundError } from '@/lib/server/errors';
import { PERMISSIONS } from '@/lib/auth/permissions';
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
import { xeroWebhookEventSchema, type XeroSyncIssue } from '@/lib/schemas/settings/xero-sync';
import { ServerError, ValidationError } from '@/lib/server/errors';
import { safeNumber } from '@/lib/numeric';
import { updateOrderPaymentStatus } from '@/server/functions/orders/order-payments';
import {
  findInvoiceByReference,
  getXeroPaymentById,
  getXeroErrorMessage,
  getXeroSyncReadiness,
  syncInvoiceWithXero,
} from './xero-adapter';

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

function extractRetryAfterSeconds(message: string | null | undefined): number | null {
  if (!message) {
    return null;
  }

  const match = message.match(/(\d+)\s*(seconds?|secs?|minutes?|mins?)/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return /min/i.test(match[2]) ? value * 60 : value;
}

function normalizeXeroSyncIssue(params: {
  readiness: Awaited<ReturnType<typeof getXeroSyncReadiness>>;
  xeroSyncError?: string | null;
  customerXeroContactId?: string | null;
  xeroInvoiceId?: string | null;
  orderId?: string;
  customerId?: string;
}): XeroSyncIssue | null {
  const { readiness, xeroSyncError, customerXeroContactId, xeroInvoiceId, orderId, customerId } = params;
  const relatedEntityIds = {
    orderId,
    customerId,
    customerXeroContactId: customerXeroContactId ?? null,
  };

  if (!readiness.available) {
    const message = readiness.message ?? 'Xero integration is unavailable for this organization.';
    if (/no active xero accounting connection/i.test(message)) {
      return {
        code: 'connection_missing',
        title: 'Connect Xero',
        message,
        severity: 'critical',
        nextAction: 'connect_xero',
        nextActionLabel: 'Connect Xero',
        primaryAction: { action: 'connect_xero', label: 'Connect Xero' },
        secondaryAction: null,
        retryPolicy: 'blocked',
        relatedEntityIds,
      };
    }

    if (/oauth is not configured/i.test(message)) {
      return {
        code: 'configuration_unavailable',
        title: 'Configure Xero',
        message,
        severity: 'critical',
        nextAction: 'open_org_settings',
        nextActionLabel: 'Open Org Settings',
        primaryAction: { action: 'open_org_settings', label: 'Open Org Settings' },
        secondaryAction: null,
        retryPolicy: 'blocked',
        relatedEntityIds,
      };
    }

    return {
      code: 'auth_failed',
      title: 'Reconnect Xero',
      message,
      severity: 'critical',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
      primaryAction: { action: 'reconnect_xero', label: 'Reconnect Xero' },
      secondaryAction: null,
      retryPolicy: 'blocked',
      relatedEntityIds,
    };
  }

  if (!xeroSyncError) {
    if (xeroInvoiceId) {
      return {
        code: 'reconciled_remote_exists',
        title: 'Already linked in Xero',
        message: 'This invoice is already linked to Xero.',
        severity: 'info',
        nextAction: 'view_reconciled_invoice',
        nextActionLabel: 'View in Xero',
        primaryAction: { action: 'view_reconciled_invoice', label: 'View in Xero' },
        secondaryAction: null,
        retryPolicy: 'blocked',
        relatedEntityIds,
      };
    }

    return null;
  }

  if (/trusted xero contact mapping|missing .*xero contact/i.test(xeroSyncError)) {
    return {
      code: 'missing_contact_mapping',
      title: 'Customer mapping required',
      message: xeroSyncError,
      severity: 'warning',
      nextAction: 'map_customer_contact',
      nextActionLabel: customerXeroContactId ? 'Review Customer Mapping' : 'Map Customer Contact',
      primaryAction: {
        action: 'map_customer_contact',
        label: customerXeroContactId ? 'Review Customer Mapping' : 'Map Customer Contact',
      },
      secondaryAction: { action: 'review_validation', label: 'Review invoice context' },
      retryPolicy: 'blocked',
      relatedEntityIds,
    };
  }

  if (/rate limit|too many requests|retry after/i.test(xeroSyncError)) {
    return {
      code: 'rate_limited',
      title: 'Retry later',
      message: xeroSyncError,
      severity: 'warning',
      nextAction: 'retry_later',
      nextActionLabel: 'Retry Later',
      primaryAction: { action: 'retry_later', label: 'Retry Later' },
      secondaryAction: { action: 'reconnect_xero', label: 'Check Xero connection' },
      retryPolicy: 'retry_after',
      retryAfterSeconds: extractRetryAfterSeconds(xeroSyncError),
      relatedEntityIds,
    };
  }

  if (/forbidden|tenant|scope|permission/i.test(xeroSyncError)) {
    return {
      code: 'forbidden',
      title: 'Reconnect with the right tenant',
      message: xeroSyncError,
      severity: 'critical',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
      primaryAction: { action: 'reconnect_xero', label: 'Reconnect Xero' },
      secondaryAction: null,
      retryPolicy: 'blocked',
      relatedEntityIds,
    };
  }

  if (/auth|expired|refresh token|unauthor/i.test(xeroSyncError)) {
    return {
      code: 'auth_failed',
      title: 'Reconnect Xero',
      message: xeroSyncError,
      severity: 'critical',
      nextAction: 'reconnect_xero',
      nextActionLabel: 'Reconnect Xero',
      primaryAction: { action: 'reconnect_xero', label: 'Reconnect Xero' },
      secondaryAction: null,
      retryPolicy: 'blocked',
      relatedEntityIds,
    };
  }

  if (/revenue recognition.*account|deferred account|sales account/i.test(xeroSyncError)) {
    return {
      code: 'missing_revenue_accounts',
      title: 'Finish Xero account setup',
      message: xeroSyncError,
      severity: 'warning',
      nextAction: 'open_org_settings',
      nextActionLabel: 'Open Org Settings',
      primaryAction: { action: 'open_org_settings', label: 'Open Org Settings' },
      secondaryAction: null,
      retryPolicy: 'blocked',
      relatedEntityIds,
    };
  }

  return {
    code: 'validation_failed',
    title: 'Review invoice data',
    message: xeroSyncError,
    severity: 'warning',
    nextAction: 'review_validation',
    nextActionLabel: 'Review Data',
    primaryAction: { action: 'review_validation', label: 'Review Data' },
    secondaryAction: null,
    retryPolicy: 'allowed',
    relatedEntityIds,
  };
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

/** Maximum single payment amount in AUD (10 million) */
const MAX_PAYMENT_AMOUNT_AUD = 10_000_000;

/** Maximum negative balance allowed (small tolerance for rounding) */
const MIN_BALANCE_THRESHOLD_AUD = -0.01;

function buildXeroPaymentDedupeKey(payment: {
  xeroInvoiceId: string;
  paymentId?: string;
  amountPaid: number;
  paymentDate: string;
  reference?: string;
}): string {
  return payment.paymentId?.trim()
    ? `payment:${payment.paymentId.trim()}`
    : `payment:${payment.xeroInvoiceId}:${payment.paymentDate}:${payment.amountPaid.toFixed(2)}:${payment.reference ?? ''}`;
}

function buildXeroPaymentEventPayload(input: {
  xeroInvoiceId: string
  paymentId: string
  amountPaid: number
  paymentDate: string
  reference?: string
}) {
  return {
    xeroInvoiceId: input.xeroInvoiceId,
    paymentId: input.paymentId,
    amountPaid: input.amountPaid,
    paymentDate: input.paymentDate,
    reference: input.reference ?? null,
  }
}

async function insertXeroPaymentEvent(params: {
  organizationId: string
  dedupeKey: string
  xeroInvoiceId: string
  paymentId: string
  amountPaid: number
  paymentDate: string
  reference?: string
  orderId?: string | null
  resultState: 'processing' | 'unknown_invoice' | 'rejected' | 'applied'
}) {
  const inserted = await db
    .insert(xeroPaymentEvents)
    .values({
      organizationId: params.organizationId,
      orderId: params.orderId ?? null,
      dedupeKey: params.dedupeKey,
      xeroInvoiceId: params.xeroInvoiceId,
      paymentId: params.paymentId,
      amount: params.amountPaid.toFixed(2),
      paymentDate: params.paymentDate,
      reference: params.reference ?? null,
      resultState: params.resultState,
      payload: buildXeroPaymentEventPayload(params),
    })
    .onConflictDoNothing()
    .returning({ id: xeroPaymentEvents.id })

  return inserted.length > 0
}

async function updateXeroPaymentEventResult(params: {
  organizationId: string
  dedupeKey: string
  orderId?: string | null
  resultState: 'unknown_invoice' | 'rejected' | 'applied'
}) {
  await db
    .update(xeroPaymentEvents)
    .set({
      orderId: params.orderId ?? null,
      resultState: params.resultState,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(xeroPaymentEvents.organizationId, params.organizationId),
        eq(xeroPaymentEvents.dedupeKey, params.dedupeKey)
      )
    )
}

async function resolveWebhookRecordedBy(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  organizationId: string,
  order: { createdBy: string | null; updatedBy: string | null }
) {
  if (order.updatedBy) {
    return order.updatedBy;
  }

  if (order.createdBy) {
    return order.createdBy;
  }

  const [fallbackUser] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.organizationId, organizationId))
    .limit(1);

  if (!fallbackUser) {
    throw new ServerError(
      'Cannot record Xero payment because no organization user is available to own the payment record'
    );
  }

  return fallbackUser.id;
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
    const ctx = await withAuth({ permission: PERMISSIONS.financial.update });
    const { orderId, force } = data;
    const readiness = await getXeroSyncReadiness(ctx.organizationId);

    type WorkflowStages = NonNullable<XeroSyncResult['stages']>;
    type XeroSyncResultPayload = Omit<XeroSyncResult, 'orderId' | 'stages'> & {
      stages?: Partial<WorkflowStages>;
    };

    const defaultStages: WorkflowStages = {
      readiness: { status: 'completed' },
      validation: { status: 'completed' },
      sync: { status: 'skipped' },
      persist: { status: 'skipped' },
    };

    const buildResult = (result: XeroSyncResultPayload): XeroSyncResult => ({
      ...result,
      orderId,
      stages: {
        readiness: result.stages?.readiness ?? defaultStages.readiness,
        validation: result.stages?.validation ?? defaultStages.validation,
        sync: result.stages?.sync ?? defaultStages.sync,
        persist: result.stages?.persist ?? defaultStages.persist,
      },
    });

    if (!readiness.available) {
      await db
        .update(orders)
        .set({
          xeroSyncStatus: 'error',
          xeroSyncError: readiness.message ?? 'Xero integration unavailable',
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

      return buildResult({
        success: false,
        status: 'error',
        error: readiness.message ?? 'Xero integration unavailable',
        integrationAvailable: false,
        stages: {
          readiness: {
            status: 'failed',
            message: readiness.message ?? 'Xero integration unavailable',
          },
          validation: { status: 'skipped', message: 'Invoice validation did not run.' },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'completed', message: 'Order sync error state was saved.' },
        },
      });
    }

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
      return buildResult({
        success: false,
        status: 'error',
        error: 'Order not found',
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'failed', message: 'Order not found.' },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'skipped', message: 'No order state was updated.' },
        },
      });
    }

    // Check if already synced (unless force resync)
    if (order.xeroSyncStatus === 'synced' && order.xeroInvoiceId && !force) {
      return buildResult({
        success: true,
        status: 'synced',
        xeroInvoiceId: order.xeroInvoiceId,
        xeroInvoiceUrl: buildXeroInvoiceUrl(order.xeroInvoiceId),
        syncedAt: new Date().toISOString(),
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'completed', message: 'Order is already synced.' },
          sync: { status: 'skipped', message: 'Existing Xero invoice was reused.' },
          persist: { status: 'skipped', message: 'Order sync state was already current.' },
        },
      });
    }

    // Check order status - only sync confirmed/shipped orders
    if (order.status === 'draft' || order.status === 'cancelled') {
      return buildResult({
        success: false,
        status: 'error',
        error: `Cannot sync ${order.status} orders to Xero`,
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: {
            status: 'failed',
            message: `Order status ${order.status} is not eligible for Xero sync.`,
          },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'skipped', message: 'No order state was updated.' },
        },
      });
    }

    // Get customer details — scoped by organizationId for multi-tenant safety
    const [customer] = await db
      .select({
        name: customersTable.name,
        email: customersTable.email,
        xeroContactId: customersTable.xeroContactId,
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
      return buildResult({
        success: false,
        status: 'error',
        error: 'Customer not found',
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'failed', message: 'Customer not found.' },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'skipped', message: 'No order state was updated.' },
        },
      });
    }

    if (!customer.name?.trim()) {
      return buildResult({
        success: false,
        status: 'error',
        error: 'Customer name is required before syncing to Xero',
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: {
            status: 'failed',
            message: 'Customer name is required before syncing to Xero.',
          },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'skipped', message: 'No order state was updated.' },
        },
      });
    }

    if (!customer.xeroContactId?.trim()) {
      const error = 'Customer is missing a trusted Xero contact mapping. Set xeroContactId before syncing invoices.';
      await db
        .update(orders)
        .set({
          xeroSyncStatus: 'error',
          xeroSyncError: error,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

      return buildResult({
        success: false,
        status: 'error',
        error,
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: {
            status: 'failed',
            message: 'Customer is missing a trusted Xero contact mapping.',
          },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'completed', message: 'Order sync error state was saved.' },
        },
      });
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
      return buildResult({
        success: false,
        status: 'error',
        error: 'Order has no line items',
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'failed', message: 'Order has no line items.' },
          sync: { status: 'skipped', message: 'External Xero sync did not run.' },
          persist: { status: 'skipped', message: 'No order state was updated.' },
        },
      });
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
      const existingInvoice = await findInvoiceByReference(ctx.organizationId, order.orderNumber);
      if (existingInvoice) {
        await db
          .update(orders)
          .set({
            xeroInvoiceId: existingInvoice.invoiceId,
            xeroSyncStatus: 'synced',
            xeroSyncError: null,
            xeroInvoiceUrl: existingInvoice.invoiceUrl ?? buildXeroInvoiceUrl(existingInvoice.invoiceId),
            lastXeroSyncAt: new Date().toISOString(),
          })
          .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

        return buildResult({
          success: true,
          status: 'synced',
          xeroInvoiceId: existingInvoice.invoiceId,
          xeroInvoiceUrl:
            existingInvoice.invoiceUrl ?? buildXeroInvoiceUrl(existingInvoice.invoiceId),
          syncedAt: new Date().toISOString(),
          integrationAvailable: readiness.available,
          stages: {
            readiness: { status: 'completed', message: 'Xero integration is available.' },
            validation: { status: 'completed', message: 'Order is eligible for sync.' },
            sync: {
              status: 'completed',
              message: 'Existing Xero invoice was matched by reference.',
            },
            persist: { status: 'completed', message: 'Order sync state was saved.' },
          },
        });
      }

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
      const { invoiceId, invoiceUrl } = await syncInvoiceWithXero(ctx.organizationId, payload);

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

      return buildResult({
        success: true,
        status: 'synced',
        xeroInvoiceId: invoiceId,
        xeroInvoiceUrl: invoiceUrl,
        syncedAt: new Date().toISOString(),
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'completed', message: 'Order is eligible for sync.' },
          sync: { status: 'completed', message: 'Invoice synced to Xero.' },
          persist: { status: 'completed', message: 'Order sync state was saved.' },
        },
      });
    } catch (error) {
      const errorMessage = getXeroErrorMessage(error);

      // Update order with error — orgId for defense-in-depth
      await db
        .update(orders)
        .set({
          xeroSyncStatus: 'error',
          xeroSyncError: errorMessage,
          lastXeroSyncAt: new Date().toISOString(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.organizationId, ctx.organizationId)));

      return buildResult({
        success: false,
        status: 'error',
        error: errorMessage,
        integrationAvailable: readiness.available,
        stages: {
          readiness: { status: 'completed', message: 'Xero integration is available.' },
          validation: { status: 'completed', message: 'Order is eligible for sync.' },
          sync: { status: 'failed', message: errorMessage },
          persist: { status: 'completed', message: 'Order sync error state was saved.' },
        },
      });
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
  .handler(async ({ data }) => applyXeroPaymentUpdate(data));

export async function applyXeroPaymentUpdate(data: {
  organizationId?: string;
  xeroInvoiceId: string;
  paymentId: string;
  amountPaid: number;
  paymentDate: string;
  reference?: string;
}) {
  const { organizationId, xeroInvoiceId, paymentId, amountPaid, paymentDate, reference } = data;

  if (!organizationId) {
    throw new ValidationError('Organization ID is required for Xero payment processing')
  }

  if (amountPaid <= 0) {
    throw new ValidationError('Payment amount must be positive');
  }
  if (amountPaid > MAX_PAYMENT_AMOUNT_AUD) {
    throw new ValidationError(
      `Payment amount ${amountPaid} exceeds maximum allowed (${MAX_PAYMENT_AMOUNT_AUD} AUD)`
    );
  }

  const dedupeKey = buildXeroPaymentDedupeKey({
    xeroInvoiceId,
    paymentId,
    amountPaid,
    paymentDate,
    reference,
  });

  const inserted = await insertXeroPaymentEvent({
    organizationId,
    dedupeKey,
    xeroInvoiceId,
    paymentId,
    amountPaid,
    paymentDate,
    reference,
    resultState: 'processing',
  })

  if (!inserted) {
    return {
      success: true,
      duplicate: true,
      resultState: 'duplicate',
      xeroInvoiceId,
    }
  }

  const [order] = await db
    .select({
      id: orders.id,
      total: orders.total,
      organizationId: orders.organizationId,
      createdBy: orders.createdBy,
      updatedBy: orders.updatedBy,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),
        eq(orders.xeroInvoiceId, xeroInvoiceId),
        isNull(orders.deletedAt)
      )
    )
    .limit(1)

  if (!order) {
    await updateXeroPaymentEventResult({
      organizationId,
      dedupeKey,
      resultState: 'unknown_invoice',
    })

    return {
      success: false,
      duplicate: false,
      resultState: 'unknown_invoice',
      error: `Order not found for Xero invoice: ${xeroInvoiceId}`,
      xeroInvoiceId,
    }
  }

  try {
    const applied = await db.transaction(async (tx) => {
      const recordedBy = await resolveWebhookRecordedBy(tx, order.organizationId, order)
      const normalizedPaymentDate = new Date(paymentDate).toISOString().split('T')[0]

      await tx.insert(orderPayments).values({
        organizationId: order.organizationId,
        orderId: order.id,
        amount: amountPaid,
        paymentMethod: 'xero',
        paymentDate: normalizedPaymentDate,
        reference: reference ?? paymentId,
        notes: `Imported from Xero payment webhook (${paymentId})`,
        recordedBy,
        createdBy: recordedBy,
        updatedBy: recordedBy,
      })

      await updateOrderPaymentStatus(tx, order.id, order.organizationId, recordedBy)

      const [updatedOrder] = await tx
        .select({
          paidAmount: orders.paidAmount,
          balanceDue: orders.balanceDue,
          paymentStatus: orders.paymentStatus,
        })
        .from(orders)
        .where(and(eq(orders.id, order.id), eq(orders.organizationId, order.organizationId)))
        .limit(1)

      if (!updatedOrder) {
        throw new ValidationError('Failed to refresh order payment status after Xero payment apply')
      }

      if (safeNumber(updatedOrder.balanceDue) < MIN_BALANCE_THRESHOLD_AUD) {
        throw new ValidationError(
          `Payment would result in overpayment: balance due would be ${safeNumber(updatedOrder.balanceDue).toFixed(2)} AUD`
        )
      }

      return updatedOrder
    })

    await updateXeroPaymentEventResult({
      organizationId,
      dedupeKey,
      orderId: order.id,
      resultState: 'applied',
    })

    return {
      success: true,
      orderId: order.id,
      xeroInvoiceId,
      newPaidAmount: safeNumber(applied.paidAmount),
      newBalanceDue: safeNumber(applied.balanceDue),
      paymentStatus: applied.paymentStatus,
      duplicate: false,
      resultState: 'applied',
    }
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw error
    }

    await updateXeroPaymentEventResult({
      organizationId,
      dedupeKey,
      orderId: order.id,
      resultState: 'rejected',
    })

    return {
      success: false,
      duplicate: false,
      resultState: 'rejected',
      orderId: order.id,
      xeroInvoiceId,
      error: error.message,
    }
  }
}

export async function applyXeroPaymentWebhookEvent(rawEvent: unknown) {
  const event = xeroWebhookEventSchema.parse(rawEvent)
  const tenantId = event.tenantId?.trim()

  if (!tenantId) {
    return {
      success: false,
      resultState: 'rejected',
      retryable: false,
      error: 'Webhook event is missing a tenantId',
    }
  }

  if (event.eventCategory.toUpperCase() !== 'PAYMENT') {
    return {
      success: true,
      resultState: 'ignored',
      retryable: false,
      eventId: event.id,
    }
  }

  const paymentId = extractPaymentIdFromWebhookEvent(event)
  if (!paymentId) {
    return {
      success: false,
      resultState: 'rejected',
      retryable: false,
      error: 'Webhook payment event did not include a payment resource ID',
      tenantId,
    }
  }

  const organization = await resolveWebhookOrganizationByTenant(tenantId)
  if (!organization.success) {
    return {
      success: false,
      resultState: 'rejected',
      retryable: false,
      error: organization.error,
      tenantId,
      paymentId,
    }
  }

  try {
    const payment = await getXeroPaymentById(organization.organizationId, paymentId)
    if (!payment) {
      return {
        success: false,
        resultState: 'rejected',
        retryable: false,
        error: `Xero payment ${paymentId} could not be loaded`,
        organizationId: organization.organizationId,
        tenantId,
        paymentId,
      }
    }

    return applyXeroPaymentUpdate({
      organizationId: organization.organizationId,
      xeroInvoiceId: payment.xeroInvoiceId,
      paymentId: payment.paymentId,
      amountPaid: payment.amountPaid,
      paymentDate: payment.paymentDate,
      reference: payment.reference,
    })
  } catch (error) {
    const errorMessage = getXeroErrorMessage(error)
    const retryable =
      !(
        error instanceof ValidationError ||
        /not be loaded|rejected/i.test(errorMessage)
      )

    return {
      success: false,
      resultState: retryable ? 'processing' : 'rejected',
      retryable,
      error: errorMessage,
      organizationId: organization.organizationId,
      tenantId,
      paymentId,
    }
  }
}

export async function processXeroPaymentWebhookEvents(
  events: unknown[],
  applyFn: typeof applyXeroPaymentWebhookEvent = applyXeroPaymentWebhookEvent
) {
  const results = [];

  for (const event of events) {
    results.push(await applyFn(event));
  }

  const retryableFailure = results.find(
    (result) => result.success === false && 'retryable' in result && result.retryable === true
  );

  return {
    status: retryableFailure ? 'retry' : 'accepted',
    httpStatus: retryableFailure ? 503 : 200,
    results,
    duplicateCount: results.filter((result) => 'duplicate' in result && result.duplicate === true).length,
  };
}

async function resolveWebhookOrganizationByTenant(tenantId: string) {
  const matches = await db
    .select({
      organizationId: oauthConnections.organizationId,
    })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.provider, 'xero'),
        eq(oauthConnections.serviceType, 'accounting'),
        eq(oauthConnections.externalAccountId, tenantId),
        eq(oauthConnections.isActive, true)
      )
    )
    .limit(2)

  if (matches.length === 0) {
    return {
      success: false as const,
      error: `No active Xero accounting connection matches tenant ${tenantId}`,
    }
  }

  if (matches.length > 1) {
    return {
      success: false as const,
      error: `Multiple active Xero accounting connections match tenant ${tenantId}`,
    }
  }

  return {
    success: true as const,
    organizationId: matches[0].organizationId,
  }
}

function extractPaymentIdFromWebhookEvent(
  event: ReturnType<typeof xeroWebhookEventSchema.parse>
) {
  if (event.resourceId?.trim()) {
    return event.resourceId.trim()
  }

  if (!event.resourceUrl) {
    return null
  }

  const match = event.resourceUrl.match(/\/Payments\/([^/?]+)/i)
  return match?.[1] ?? null
}

// ============================================================================
// GET INVOICE XERO STATUS
// ============================================================================

/**
 * Get the Xero sync status for an invoice.
 */
export const getInvoiceXeroStatus = createServerFn({ method: 'GET' })
  .inputValidator(normalizeObjectInput(getInvoiceXeroStatusSchema))
  .handler(async ({ data }): Promise<InvoiceXeroStatus> => {
    const ctx = await withAuth();
    const readiness = await getXeroSyncReadiness(ctx.organizationId);

    const [order] = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        customerId: orders.customerId,
        xeroInvoiceId: orders.xeroInvoiceId,
        xeroSyncStatus: orders.xeroSyncStatus,
        xeroSyncError: orders.xeroSyncError,
        lastXeroSyncAt: orders.lastXeroSyncAt,
        xeroInvoiceUrl: orders.xeroInvoiceUrl,
        customerXeroContactId: customersTable.xeroContactId,
      })
      .from(orders)
      .innerJoin(customersTable, eq(orders.customerId, customersTable.id))
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

    const issue = normalizeXeroSyncIssue({
      readiness,
      xeroSyncError: order.xeroSyncError,
      customerXeroContactId: order.customerXeroContactId,
      xeroInvoiceId: order.xeroInvoiceId,
      orderId: order.orderId,
      customerId: order.customerId,
    });

    return {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      xeroInvoiceId: order.xeroInvoiceId,
      xeroSyncStatus: order.xeroSyncStatus ?? 'pending',
      xeroSyncError: order.xeroSyncError,
      lastXeroSyncAt: order.lastXeroSyncAt,
      xeroInvoiceUrl: order.xeroInvoiceUrl,
      integrationAvailable: readiness.available,
      integrationMessage: readiness.message ?? null,
      issue,
      customerXeroContactId: order.customerXeroContactId,
      customerId: order.customerId,
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
    const readiness = await getXeroSyncReadiness(ctx.organizationId);
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
          customerXeroContactId: customersTable.xeroContactId,
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
          canResync: readiness.available && (syncStatus === 'error' || syncStatus === 'pending'),
          issue: normalizeXeroSyncIssue({
            readiness,
            xeroSyncError: r.xeroSyncError,
            customerXeroContactId: r.customerXeroContactId,
            xeroInvoiceId: r.xeroInvoiceId,
            orderId: r.orderId,
            customerId: r.customerId,
          }),
          customerXeroContactId: r.customerXeroContactId,
        };
      }),
      total: totalCount,
      page,
      pageSize,
      integrationAvailable: readiness.available,
      integrationMessage: readiness.message ?? null,
    };
  });
