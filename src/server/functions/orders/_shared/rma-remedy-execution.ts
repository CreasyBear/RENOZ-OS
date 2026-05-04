import { and, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';

import { db, type TransactionExecutor } from '@/lib/db';
import type { SessionContext } from '@/lib/server/protected';
import { ValidationError } from '@/lib/server/errors';
import { calculateGst } from '@/lib/utils/financial';
import { enqueueSearchIndexOutbox } from '@/server/functions/_shared/search-index-outbox';
import {
  creditNotes,
  customers,
  orderLineItems,
  orderPayments,
  orders,
  returnAuthorizations,
  rmaLineItems,
  type OrderAddress,
  type OrderMetadata,
} from 'drizzle/schema';
import type { ProcessRmaInput, RmaResponse } from '@/lib/schemas/support/rma';
import { calculateLineItemTotals, calculateOrderTotals } from '@/server/functions/orders/order-pricing';
import { generateOrderNumber } from '@/server/functions/orders/order-numbering';
import { updateOrderPaymentStatus } from '@/server/functions/orders/order-payments';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { requirePermission } from '@/lib/server/protected';

type ReturnAuthorizationRow = typeof returnAuthorizations.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

interface RmaIssueLink {
  id: string;
  status: string;
}

export interface RmaExecutionArtifactRequest {
  rmaId: string;
  refundPaymentId: string | null;
  creditNoteId: string | null;
  replacementOrderId: string | null;
  issue: RmaIssueLink | null;
}

export interface RmaExecutionArtifacts {
  refundPayment: { id: string; label: string | null } | null;
  creditNote: { id: string; label: string | null } | null;
  replacementOrder: { id: string; label: string | null } | null;
  linkedIssueOpen: boolean | null;
}

export interface ExecuteRmaRemedyResult {
  executionStatus: 'completed' | 'blocked';
  executionBlockedReason: string | null;
  executionCompletedAt: string | null;
  executionCompletedBy: string | null;
  processedAt: string | null;
  processedBy: string | null;
  status: 'received' | 'processed';
  resolutionDetails: {
    resolvedAt: string;
    resolvedBy: string;
    refundAmount?: number;
    replacementOrderId?: string;
    creditNoteId?: string;
    notes?: string;
  };
  refundPaymentId: string | null;
  creditNoteId: string | null;
  replacementOrderId: string | null;
  artifacts: RmaExecutionArtifacts;
}

interface ExecuteRmaRemedyParams {
  tx: TransactionExecutor;
  ctx: SessionContext;
  rma: ReturnAuthorizationRow;
  sourceOrder: OrderRow;
  sourceCustomerId: string;
  issue: RmaIssueLink | null;
  input: ProcessRmaInput;
}

async function generateCreditNoteNumber(executor: TransactionExecutor, organizationId: string) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `CN-${yearMonth}-`;

  const result = await executor
    .select({ creditNoteNumber: creditNotes.creditNoteNumber })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.organizationId, organizationId),
        like(creditNotes.creditNoteNumber, `${prefix}%`)
      )
    )
    .orderBy(desc(creditNotes.creditNoteNumber))
    .limit(1);

  let nextNumber = 1;
  if (result.length > 0 && result[0].creditNoteNumber) {
    nextNumber = Number.parseInt(result[0].creditNoteNumber.slice(-4), 10) + 1;
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

async function getRefundPaymentRef(
  executor: TransactionExecutor,
  organizationId: string,
  paymentId: string | null
) {
  if (!paymentId) return null;

  const [payment] = await executor
    .select({
      id: orderPayments.id,
      label: orderPayments.reference,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.id, paymentId),
        eq(orderPayments.organizationId, organizationId),
        isNull(orderPayments.deletedAt)
      )
    )
    .limit(1);

  return payment ?? null;
}

async function getRefundPaymentRefs(
  executor: TransactionExecutor,
  organizationId: string,
  paymentIds: string[]
) {
  if (paymentIds.length === 0) return new Map<string, { id: string; label: string | null }>();

  const rows = await executor
    .select({
      id: orderPayments.id,
      label: orderPayments.reference,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.organizationId, organizationId),
        inArray(orderPayments.id, paymentIds),
        isNull(orderPayments.deletedAt)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

async function getCreditNoteRef(
  executor: TransactionExecutor,
  organizationId: string,
  creditNoteId: string | null
) {
  if (!creditNoteId) return null;

  const [creditNote] = await executor
    .select({
      id: creditNotes.id,
      label: creditNotes.creditNoteNumber,
    })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.id, creditNoteId),
        eq(creditNotes.organizationId, organizationId),
        isNull(creditNotes.deletedAt)
      )
    )
    .limit(1);

  return creditNote ?? null;
}

async function getCreditNoteRefs(
  executor: TransactionExecutor,
  organizationId: string,
  creditNoteIds: string[]
) {
  if (creditNoteIds.length === 0) return new Map<string, { id: string; label: string | null }>();

  const rows = await executor
    .select({
      id: creditNotes.id,
      label: creditNotes.creditNoteNumber,
    })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.organizationId, organizationId),
        inArray(creditNotes.id, creditNoteIds),
        isNull(creditNotes.deletedAt)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

async function getReplacementOrderRef(
  executor: TransactionExecutor,
  organizationId: string,
  orderId: string | null
) {
  if (!orderId) return null;

  const [order] = await executor
    .select({
      id: orders.id,
      label: orders.orderNumber,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId), isNull(orders.deletedAt)))
    .limit(1);

  return order ?? null;
}

async function getReplacementOrderRefs(
  executor: TransactionExecutor,
  organizationId: string,
  orderIds: string[]
) {
  if (orderIds.length === 0) return new Map<string, { id: string; label: string | null }>();

  const rows = await executor
    .select({
      id: orders.id,
      label: orders.orderNumber,
    })
    .from(orders)
    .where(
      and(
        eq(orders.organizationId, organizationId),
        inArray(orders.id, orderIds),
        isNull(orders.deletedAt)
      )
    );

  return new Map(rows.map((row) => [row.id, row]));
}

export async function hydrateRmaExecutionArtifacts(params: {
  executor?: TransactionExecutor;
  organizationId: string;
  refundPaymentId: string | null;
  creditNoteId: string | null;
  replacementOrderId: string | null;
  issue: RmaIssueLink | null;
}): Promise<RmaExecutionArtifacts> {
  const executor = params.executor ?? db;
  const [refundPayment, creditNote, replacementOrder] = await Promise.all([
    getRefundPaymentRef(executor, params.organizationId, params.refundPaymentId),
    getCreditNoteRef(executor, params.organizationId, params.creditNoteId),
    getReplacementOrderRef(executor, params.organizationId, params.replacementOrderId),
  ]);

  return {
    refundPayment,
    creditNote,
    replacementOrder,
    linkedIssueOpen: params.issue
      ? !['resolved', 'closed'].includes(params.issue.status)
      : null,
  };
}

export async function hydrateRmaExecutionArtifactsBatch(params: {
  executor?: TransactionExecutor;
  organizationId: string;
  requests: RmaExecutionArtifactRequest[];
}): Promise<Map<string, RmaExecutionArtifacts>> {
  const executor = params.executor ?? db;
  const refundPaymentIds = Array.from(
    new Set(
      params.requests
        .map((request) => request.refundPaymentId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const creditNoteIds = Array.from(
    new Set(
      params.requests
        .map((request) => request.creditNoteId)
        .filter((id): id is string => Boolean(id))
    )
  );
  const replacementOrderIds = Array.from(
    new Set(
      params.requests
        .map((request) => request.replacementOrderId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [refundPayments, creditNotesById, replacementOrders] = await Promise.all([
    getRefundPaymentRefs(executor, params.organizationId, refundPaymentIds),
    getCreditNoteRefs(executor, params.organizationId, creditNoteIds),
    getReplacementOrderRefs(executor, params.organizationId, replacementOrderIds),
  ]);

  const results = new Map<string, RmaExecutionArtifacts>();
  for (const request of params.requests) {
    results.set(request.rmaId, {
      refundPayment: request.refundPaymentId
        ? refundPayments.get(request.refundPaymentId) ?? null
        : null,
      creditNote: request.creditNoteId
        ? creditNotesById.get(request.creditNoteId) ?? null
        : null,
      replacementOrder: request.replacementOrderId
        ? replacementOrders.get(request.replacementOrderId) ?? null
        : null,
      linkedIssueOpen: request.issue
        ? !['resolved', 'closed'].includes(request.issue.status)
        : null,
    });
  }

  return results;
}

async function createRefundArtifact({
  tx,
  ctx,
  rma,
  input,
}: {
  tx: TransactionExecutor;
  ctx: SessionContext;
  rma: ReturnAuthorizationRow;
  input: Extract<ProcessRmaInput, { resolution: 'refund' }>;
}) {
  const [original] = await tx
    .select({
      id: orderPayments.id,
      amount: orderPayments.amount,
      paymentMethod: orderPayments.paymentMethod,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.id, input.originalPaymentId),
        eq(orderPayments.orderId, rma.orderId!),
        eq(orderPayments.organizationId, ctx.organizationId),
        eq(orderPayments.isRefund, false),
        isNull(orderPayments.deletedAt)
      )
    )
    .limit(1);

  if (!original) {
    throw new ValidationError('Source payment not found for this order.');
  }

  const [refundTotals] = await tx
    .select({
      totalRefunded: sql<number>`coalesce(sum(${orderPayments.amount}), 0)::numeric`,
    })
    .from(orderPayments)
    .where(
      and(
        eq(orderPayments.orderId, rma.orderId!),
        eq(orderPayments.organizationId, ctx.organizationId),
        eq(orderPayments.isRefund, true),
        eq(orderPayments.relatedPaymentId, input.originalPaymentId),
        isNull(orderPayments.deletedAt)
      )
    )
    .limit(1);

  const remainingRefundable = Math.max(
    0,
    Number(original.amount) - Number(refundTotals?.totalRefunded ?? 0)
  );

  if (input.amount > remainingRefundable) {
    throw new ValidationError('Refund amount cannot exceed remaining refundable balance.');
  }

  const today = new Date().toISOString().split('T')[0];
  const [refund] = await tx
    .insert(orderPayments)
    .values({
      orderId: rma.orderId!,
      amount: input.amount,
      paymentMethod: original.paymentMethod,
      paymentDate: today,
      notes: input.notes ?? `Refund recorded from RMA ${rma.rmaNumber}`,
      isRefund: true,
      relatedPaymentId: input.originalPaymentId,
      organizationId: ctx.organizationId,
      recordedBy: ctx.user.id,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    })
    .returning({
      id: orderPayments.id,
      label: orderPayments.reference,
    });

  await updateOrderPaymentStatus(
    tx,
    rma.orderId!,
    ctx.organizationId,
    ctx.user.id
  );
  return { refund, refundAmount: input.amount };
}

async function createCreditArtifact({
  tx,
  ctx,
  rma,
  sourceCustomerId,
  input,
}: {
  tx: TransactionExecutor;
  ctx: SessionContext;
  rma: ReturnAuthorizationRow;
  sourceCustomerId: string;
  input: Extract<ProcessRmaInput, { resolution: 'credit' }>;
}) {
  requirePermission(ctx, PERMISSIONS.financial.create);

  const [customer] = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        eq(customers.id, sourceCustomerId),
        eq(customers.organizationId, ctx.organizationId),
        isNull(customers.deletedAt)
      )
    )
    .limit(1);

  if (!customer) {
    throw new ValidationError('Customer could not be resolved for credit note creation.');
  }

  const creditNoteNumber = await generateCreditNoteNumber(tx, ctx.organizationId);
  const gstAmount = calculateGst(input.amount);

  const [creditNote] = await tx
    .insert(creditNotes)
    .values({
      organizationId: ctx.organizationId,
      creditNoteNumber,
      customerId: sourceCustomerId,
      orderId: rma.orderId,
      amount: input.amount,
      gstAmount,
      reason: input.creditReason,
      internalNotes: input.notes ?? `Created from RMA ${rma.rmaNumber}`,
      status: input.applyNow ? 'applied' : 'issued',
      ...(input.applyNow
        ? {
            appliedAt: new Date(),
            appliedToOrderId: rma.orderId,
          }
        : {}),
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    })
    .returning({
      id: creditNotes.id,
      label: creditNotes.creditNoteNumber,
    });

  if (input.applyNow && rma.orderId) {
    await updateOrderPaymentStatus(
      tx,
      rma.orderId,
      ctx.organizationId,
      ctx.user.id
    );
  }

  return { creditNote };
}

async function createReplacementArtifact({
  tx,
  ctx,
  rma,
  sourceOrder,
}: {
  tx: TransactionExecutor;
  ctx: SessionContext;
  rma: ReturnAuthorizationRow;
  sourceOrder: OrderRow;
}) {
  const returnLines = await tx
    .select({
      id: rmaLineItems.id,
      orderLineItemId: rmaLineItems.orderLineItemId,
      quantityReturned: rmaLineItems.quantityReturned,
      description: orderLineItems.description,
      productId: orderLineItems.productId,
      lineNumber: orderLineItems.lineNumber,
      sku: orderLineItems.sku,
      taxType: orderLineItems.taxType,
      notes: orderLineItems.notes,
    })
    .from(rmaLineItems)
    .innerJoin(orderLineItems, eq(rmaLineItems.orderLineItemId, orderLineItems.id))
    .where(eq(rmaLineItems.rmaId, rma.id));

  if (returnLines.length === 0) {
    throw new ValidationError('Replacement order could not be created because no return lines were found.');
  }

  const replacementOrderNumber = await generateOrderNumber(ctx.organizationId);
  const clientRequestId = `rma-replacement:${rma.id}`;

  const lineItemsWithTotals = returnLines.map((line, index) => {
    const pricing = calculateLineItemTotals({
      quantity: Number(line.quantityReturned),
      unitPrice: 0,
      taxType: 'gst',
    });

    return {
      productId: line.productId,
      lineNumber: line.lineNumber || String(index + 1).padStart(3, '0'),
      sku: line.sku ?? undefined,
      description: line.description,
      quantity: Number(line.quantityReturned),
      unitPrice: 0,
      discountPercent: undefined,
      discountAmount: 0,
      taxType: line.taxType ?? 'gst',
      notes: line.notes ?? undefined,
      ...pricing,
    };
  });

  const orderTotals = calculateOrderTotals(lineItemsWithTotals, null, null, 0);
  const metadata: OrderMetadata = {
    ...((sourceOrder.metadata as OrderMetadata | null) ?? {}),
    source: 'phone',
    replacementForRmaId: rma.id,
    replacementForOrderId: sourceOrder.id,
    replacementMode: 'warranty_rma',
  };

  // Replacement orders are intentionally created as zero-priced drafts so the
  // RMA owns the commercial remedy decision and fulfillment can happen later.
  const [replacementOrder] = await tx
    .insert(orders)
    .values({
      organizationId: ctx.organizationId,
      customerId: sourceOrder.customerId,
      orderNumber: replacementOrderNumber,
      status: 'draft',
      paymentStatus: 'pending',
      orderDate: new Date().toISOString().slice(0, 10),
      billingAddress: sourceOrder.billingAddress as OrderAddress | undefined,
      shippingAddress: sourceOrder.shippingAddress as OrderAddress | undefined,
      subtotal: orderTotals.subtotal,
      discountAmount: orderTotals.discountAmount,
      taxAmount: orderTotals.taxAmount,
      shippingAmount: 0,
      total: orderTotals.total,
      paidAmount: 0,
      balanceDue: orderTotals.total,
      metadata,
      clientRequestId,
      internalNotes:
        `${sourceOrder.internalNotes ? `${sourceOrder.internalNotes}\n` : ''}` +
        `Replacement draft created from RMA ${rma.rmaNumber}.`,
      customerNotes: sourceOrder.customerNotes,
      createdBy: ctx.user.id,
      updatedBy: ctx.user.id,
    })
    .returning({
      id: orders.id,
      label: orders.orderNumber,
    });

  await tx.insert(orderLineItems).values(
    lineItemsWithTotals.map((item) => ({
      organizationId: ctx.organizationId,
      orderId: replacementOrder.id,
      productId: item.productId,
      lineNumber: item.lineNumber,
      sku: item.sku,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      discountAmount: item.discountAmount,
      taxType: item.taxType,
      taxAmount: item.taxAmount,
      lineTotal: item.lineTotal,
      qtyPicked: 0,
      qtyShipped: 0,
      qtyDelivered: 0,
      notes: item.notes,
    }))
  );

  await enqueueSearchIndexOutbox(
    {
      organizationId: ctx.organizationId,
      entityType: 'order',
      entityId: replacementOrder.id,
      action: 'upsert',
      payload: {
        title: replacementOrder.label,
        subtitle: sourceOrder.customerId,
      },
    },
    tx as Parameters<typeof enqueueSearchIndexOutbox>[1]
  );

  return { replacementOrder };
}

export async function executeRmaRemedy({
  tx,
  ctx,
  rma,
  sourceOrder,
  sourceCustomerId,
  issue,
  input,
}: ExecuteRmaRemedyParams): Promise<ExecuteRmaRemedyResult> {
  const now = new Date().toISOString();
  // resolutionDetails remain useful operator notes, but the linked artifact IDs
  // written back to the RMA are the canonical record of what actually executed.
  const resolutionDetails: ExecuteRmaRemedyResult['resolutionDetails'] = {
    resolvedAt: now,
    resolvedBy: ctx.user.id,
    notes: input.notes,
  };

  let refundPayment: RmaExecutionArtifacts['refundPayment'] = null;
  let creditNote: RmaExecutionArtifacts['creditNote'] = null;
  let replacementOrder: RmaExecutionArtifacts['replacementOrder'] = null;
  let refundPaymentId: string | null = rma.refundPaymentId ?? null;
  let creditNoteId: string | null = rma.creditNoteId ?? null;
  let replacementOrderId: string | null = rma.replacementOrderId ?? null;

  if (input.resolution === 'refund') {
    if (rma.refundPaymentId) {
      refundPayment = await getRefundPaymentRef(tx, ctx.organizationId, rma.refundPaymentId);
      resolutionDetails.refundAmount = rma.resolutionDetails?.refundAmount;
    } else {
      const created = await createRefundArtifact({ tx, ctx, rma, input });
      refundPayment = created.refund;
      refundPaymentId = created.refund.id;
      resolutionDetails.refundAmount = created.refundAmount;
    }
  }

  if (input.resolution === 'credit') {
    if (rma.creditNoteId) {
      creditNote = await getCreditNoteRef(tx, ctx.organizationId, rma.creditNoteId);
      resolutionDetails.creditNoteId = rma.creditNoteId;
    } else {
      const created = await createCreditArtifact({
        tx,
        ctx,
        rma,
        sourceCustomerId,
        input,
      });
      creditNote = created.creditNote;
      creditNoteId = created.creditNote.id;
      resolutionDetails.creditNoteId = created.creditNote.id;
    }
  }

  if (input.resolution === 'replacement') {
    if (rma.replacementOrderId) {
      replacementOrder = await getReplacementOrderRef(tx, ctx.organizationId, rma.replacementOrderId);
      resolutionDetails.replacementOrderId = rma.replacementOrderId;
    } else {
      const created = await createReplacementArtifact({
        tx,
        ctx,
        rma,
        sourceOrder,
      });
      replacementOrder = created.replacementOrder;
      replacementOrderId = created.replacementOrder.id;
      resolutionDetails.replacementOrderId = created.replacementOrder.id;
    }
  }

  const linkedIssueOpen = issue ? !['resolved', 'closed'].includes(issue.status) : null;

  return {
    executionStatus: 'completed',
    executionBlockedReason: null,
    executionCompletedAt: now,
    executionCompletedBy: ctx.user.id,
    // "processed" means remedy execution completed, not merely that an operator
    // picked a resolution in the UI.
    processedAt: now,
    processedBy: ctx.user.id,
    status: 'processed',
    resolutionDetails,
    refundPaymentId,
    creditNoteId,
    replacementOrderId,
    artifacts: {
      refundPayment,
      creditNote,
      replacementOrder,
      linkedIssueOpen,
    },
  };
}

export function buildRmaExecutionSummary(params: {
  rma: Pick<
    RmaResponse,
    | 'executionStatus'
    | 'executionBlockedReason'
    | 'executionCompletedAt'
    | 'executionCompletedBy'
    | 'refundPaymentId'
    | 'creditNoteId'
    | 'replacementOrderId'
  >;
  artifacts: RmaExecutionArtifacts;
}): NonNullable<RmaResponse['execution']> {
  // The execution block is the response-layer projection of the canonical
  // artifact links persisted on the RMA row.
  return {
    status: params.rma.executionStatus,
    blockedReason: params.rma.executionBlockedReason,
    refundPayment: params.artifacts.refundPayment,
    creditNote: params.artifacts.creditNote,
    replacementOrder: params.artifacts.replacementOrder,
    linkedIssueOpen: params.artifacts.linkedIssueOpen,
    completedAt: params.rma.executionCompletedAt,
    completedBy: params.rma.executionCompletedBy,
  };
}
