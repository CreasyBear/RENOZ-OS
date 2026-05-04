import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orderPayments, orders, oauthConnections, xeroPaymentEvents, users } from 'drizzle/schema';
import { ServerError, ValidationError } from '@/lib/server/errors';
import { safeNumber } from '@/lib/numeric';
import { updateOrderPaymentStatus } from '@/server/functions/orders/order-payments';
import { xeroWebhookEventSchema } from '@/lib/schemas/settings/xero-sync';
import { getXeroErrorMessage, getXeroPaymentById } from '../xero-adapter';

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

